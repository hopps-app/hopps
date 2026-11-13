package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankAccount;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The bank import cannot go ahead. {@link #CURRENCY_MISMATCH}: the file's amounts are in another currency than the
 * account, or in several currencies. Answered as 409 Conflict in the same {@code {code, message}} shape as the other
 * coded errors, with further fields so the client can explain the conflict. Not overridable: the amounts would be
 * booked in the wrong currency.
 */
public class BankImportRejectedException extends ClientErrorException {

    public static final String CURRENCY_MISMATCH = "CURRENCY_MISMATCH";
    public static final String IMPORT_IN_USE = "IMPORT_IN_USE";
    public static final String FILE_ALREADY_IMPORTED = "FILE_ALREADY_IMPORTED";
    public static final String WRONG_ACCOUNT_TYPE = "WRONG_ACCOUNT_TYPE";

    private BankImportRejectedException(String message, Map<String, Object> body) {
        super(message, Response.status(Response.Status.CONFLICT)
                .type(MediaType.APPLICATION_JSON)
                .entity(body)
                .build());
    }

    /**
     * Exactly this file was already imported into another account, so importing it here would hold the same movements
     * twice. Only the identical file is refused: comparing single movements across accounts would also hit two accounts
     * with the same fee on the same day.
     */
    public static BankImportRejectedException alreadyImported(BankAccount account) {
        String message = "This file was already imported into the account " + account.getName();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", FILE_ALREADY_IMPORTED);
        body.put("message", message);
        body.put("accountName", account.getName());
        body.put("accountArchived", account.isArchived());
        return new BankImportRejectedException(message, body);
    }

    /** The import cannot be deleted: some of its movements are linked to transactions or ignored. */
    public static BankImportRejectedException importInUse() {
        String message = "Movements of this import are linked to transactions or ignored";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", IMPORT_IN_USE);
        body.put("message", message);
        return new BankImportRejectedException(message, body);
    }

    /** A PayPal activity export was dropped on a bank account. */
    public static BankImportRejectedException paypalFileForBankAccount() {
        return wrongAccountType("This is a PayPal export; import it into a PayPal account", "PAYPAL");
    }

    /** A bank statement was dropped on a PayPal account. */
    public static BankImportRejectedException bankFileForPaypalAccount() {
        return wrongAccountType("A PayPal account only imports the PayPal activity export", "BANK");
    }

    private static BankImportRejectedException wrongAccountType(String message, String fileAccountType) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", WRONG_ACCOUNT_TYPE);
        body.put("message", message);
        body.put("fileAccountType", fileAccountType);
        return new BankImportRejectedException(message, body);
    }

    public static BankImportRejectedException currencyMismatch(List<String> fileCurrencies, String accountCurrency) {
        String message = "The file contains amounts in " + String.join(", ", fileCurrencies)
                + ", but the account is kept in " + accountCurrency;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", CURRENCY_MISMATCH);
        body.put("message", message);
        body.put("fileCurrencies", fileCurrencies);
        body.put("accountCurrency", accountCurrency);
        return new BankImportRejectedException(message, body);
    }
}
