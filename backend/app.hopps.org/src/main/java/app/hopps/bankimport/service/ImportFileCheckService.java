package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankCsvColumnMapping;
import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.bankimport.domain.BankFieldType;
import app.hopps.bankimport.parser.CsvParser;
import app.hopps.bankimport.parser.Mt940Parser;
import app.hopps.bankimport.parser.Mt940Parser.ParsedMt940Transaction;
import jakarta.enterprise.context.ApplicationScoped;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;

/**
 * Checks, before an import is queued, that the file's amounts are in the account's currency (CSV column mapped to
 * {@link BankFieldType#CURRENCY}, MT940 opening balance). The import itself runs asynchronously in the worker, so this
 * is the last point where the user can still be told.
 * <p>
 * Files without a currency are not checked: their rows take the account's currency. A file that cannot be read is not
 * rejected here either; the worker fails it with the usual error report.
 */
@ApplicationScoped
public class ImportFileCheckService {

    private static final Logger LOG = LoggerFactory.getLogger(ImportFileCheckService.class);

    /**
     * Throws {@link BankImportRejectedException} if the file's amounts are in another currency than the account, or in
     * several currencies.
     */
    public void verify(BankAccount account, byte[] content, String fileType, BankCsvSchema schema) {
        verify(account.getCurrency(), currencies(content, fileType, schema));
    }

    static void verify(String accountCurrency, Set<String> fileCurrencies) {
        String expected = normalizeCurrency(accountCurrency);
        if (fileCurrencies.size() > 1 || (fileCurrencies.size() == 1 && !fileCurrencies.contains(expected))) {
            throw BankImportRejectedException.currencyMismatch(List.copyOf(fileCurrencies), expected);
        }
    }

    Set<String> currencies(byte[] content, String fileType, BankCsvSchema schema) {
        try {
            if ("MT940".equals(fileType)) {
                return currenciesOfMt940(Mt940ImportService.decodeWithFallback(content));
            }
            return currenciesOfCsv(CsvImportService.decode(content, schema.getEncoding()), schema);
        } catch (RuntimeException e) {
            LOG.debug("Import file could not be inspected, leaving it to the worker: {}", e.getMessage());
            return Set.of();
        }
    }

    /** The currencies in the column mapped to {@link BankFieldType#CURRENCY}, normalized and sorted. */
    static Set<String> currenciesOfCsv(String text, BankCsvSchema schema) {
        Integer column = currencyColumn(schema);
        if (column == null) {
            return Set.of();
        }
        Set<String> currencies = new TreeSet<>();
        for (List<String> row : CsvParser.parseAll(text, schema)) {
            if (column >= 0 && column < row.size()) {
                addIfPresent(currencies, normalizeCurrency(row.get(column)));
            }
        }
        return currencies;
    }

    static Set<String> currenciesOfMt940(String text) {
        Set<String> currencies = new TreeSet<>();
        for (ParsedMt940Transaction tx : Mt940Parser.parse(text)) {
            addIfPresent(currencies, normalizeCurrency(tx.currency()));
        }
        return currencies;
    }

    private static Integer currencyColumn(BankCsvSchema schema) {
        for (BankCsvColumnMapping m : schema.getColumnMappings()) {
            if (m.getTargetField() == BankFieldType.CURRENCY) {
                return m.getSourceColumnIndex();
            }
        }
        return null;
    }

    private static void addIfPresent(Set<String> set, String value) {
        if (value != null) {
            set.add(value);
        }
    }

    static String normalizeCurrency(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }
}
