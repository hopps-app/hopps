package app.hopps.fin.excel;

import app.hopps.fin.jpa.entities.TransactionRecord;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFFormulaEvaluator;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Currency;
import java.util.List;

public class ExcelHelper {
    public static final List<ExcelColumn> EXCEL_COLUMNS = List.of(
            new ExcelColumn("Order number", TransactionRecord::getOrderNumber),
            new ExcelColumn("Type", t -> t.getDocument().name()),
            new ExcelColumn("Uploader", TransactionRecord::getUploader),
            new ExcelColumn("Transaction time", t -> handleLocalDateTime(t.getTransactionTime())),
            new ExcelColumn("Total", t -> transformBigDecimal(t.getTotal()), true),
            new ExcelColumn("Amount due", t -> transformBigDecimal(t.getAmountDue()), true),
            new ExcelColumn("Due date", t -> handleLocalDate(t.getDueDate())),
            new ExcelColumn("Invoice Id", TransactionRecord::getInvoiceId),
            new ExcelColumn("Privately paid", TransactionRecord::isPrivatelyPaid),
            new ExcelColumn("bommelId", TransactionRecord::getBommelId),
            new ExcelColumn("bommelName", t -> null),

            // Sender
            new ExcelColumn("S. Name", t -> t.getSender().getName()),
            new ExcelColumn("S. Tax ID", t -> t.getSender().getTaxID()),
            new ExcelColumn("S. VAT ID", t -> t.getSender().getVatID()),
            new ExcelColumn("S. Description", t -> t.getSender().getDescription()),
            new ExcelColumn("S. Street", t -> t.getSender().getStreet()),
            new ExcelColumn("S. Zip code", t -> t.getSender().getZipCode()),
            new ExcelColumn("S. City", t -> t.getSender().getCity()),
            new ExcelColumn("S. State", t -> t.getSender().getState()),
            new ExcelColumn("S. Country", t -> t.getSender().getCountry()),
            // Receiver
            new ExcelColumn("R. Name", t -> t.getRecipient().getName()),
            new ExcelColumn("R. Tax ID", t -> t.getRecipient().getTaxID()),
            new ExcelColumn("R. VAT ID", t -> t.getRecipient().getVatID()),
            new ExcelColumn("R. Description", t -> t.getRecipient().getDescription()),
            new ExcelColumn("R. Street", t -> t.getRecipient().getStreet()),
            new ExcelColumn("R. Zip code", t -> t.getRecipient().getZipCode()),
            new ExcelColumn("R. City", t -> t.getRecipient().getCity()),
            new ExcelColumn("R. State", t -> t.getRecipient().getState()),
            new ExcelColumn("R. Country", t -> t.getRecipient().getCountry()));

    public static XSSFRow buildHeaderRow(XSSFWorkbook xssfWorkbook, XSSFSheet sheet) {
        XSSFRow header = sheet.createRow(0);

        XSSFCellStyle cellStyle = xssfWorkbook.createCellStyle();
        cellStyle.setFillBackgroundColor(IndexedColors.BLACK.getIndex());
        cellStyle.setFillForegroundColor(IndexedColors.BLACK.getIndex());
        cellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        XSSFFont font = xssfWorkbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        cellStyle.setFont(font);

        buildHeaderColumns(header, cellStyle);
        return header;
    }

    public static void createSumRow(XSSFSheet sheet, List<TransactionRecord> records, XSSFWorkbook xssfWorkbook) {
        if (records.isEmpty()) {
            return;
        }

        String currencyCode = records.getFirst().getCurrencyCode();
        XSSFRow sumRow = sheet.createRow(records.size() + 1);

        for (int i = 0; i < EXCEL_COLUMNS.size(); i++) {
            ExcelColumn excelColumn = EXCEL_COLUMNS.get(i);
            if (!excelColumn.monetary()) {
                continue;
            }

            XSSFCell cell = sumRow.createCell(i);
            XSSFCellStyle monetaryCellFormat = createMonetaryCellFormat(xssfWorkbook, currencyCode);
            cell.setCellStyle(monetaryCellFormat);
            handleNumericCell(xssfWorkbook, cell, records.size());
        }
    }

    public static void handleMoney(XSSFWorkbook wb, Double val, String currencyCode, XSSFCell cell) {
        XSSFCellStyle cellStyle = createMonetaryCellFormat(wb, currencyCode);
        cell.setCellStyle(cellStyle);

        cell.setCellValue(val);
    }

    // Private stuff
    private static void buildHeaderColumns(XSSFRow header, XSSFCellStyle cellStyle) {
        for (int i = 0; i < EXCEL_COLUMNS.size(); i++) {
            XSSFCell cell = header.createCell(i);
            cell.setCellStyle(cellStyle);
            cell.setCellValue(EXCEL_COLUMNS.get(i).headerKey());
        }
    }

    private static LocalDateTime handleLocalDateTime(Instant instant) {
        if (instant == null) {
            return null;
        }

        return instant
                .atOffset(ZoneOffset.UTC)
                .toLocalDateTime();
    }

    private static LocalDate handleLocalDate(Instant instant) {
        if (instant == null) {
            return null;
        }

        return instant
                .atOffset(ZoneOffset.UTC)
                .toLocalDate();
    }

    private static Double transformBigDecimal(BigDecimal amount) {
        if (amount == null) {
            return 0d;
        }
        return amount.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private static void handleNumericCell(XSSFWorkbook xssfWorkbook, XSSFCell cell, int lastRow) {
        String reference = cell.getReference();
        // Remove the row number
        int length = String.valueOf(cell.getRowIndex()).length();
        reference = reference.substring(0, reference.length() - length);

        // Add one, because it starts at 1 instead of 0
        cell.setCellFormula(String.format("SUM(%s%d:%s%d)", reference, 2, reference, lastRow + 1));
        // Now evaluate
        XSSFFormulaEvaluator formulaEvaluator = xssfWorkbook.getCreationHelper().createFormulaEvaluator();
        formulaEvaluator.evaluateFormulaCell(cell);
    }

    private static XSSFCellStyle createMonetaryCellFormat(XSSFWorkbook wb, String currencyCode) {
        XSSFCellStyle cellStyle = wb.createCellStyle();
        cellStyle.setDataFormat(wb.createDataFormat().getFormat("#.## " + Currency.getInstance(currencyCode).getSymbol()));
        return cellStyle;
    }
}
