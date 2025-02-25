package app.hopps.fin.endpoint;

import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneOffset;
import java.util.List;

@Authenticated
@Path("excel")
public class ExcelResource {
    private final TransactionRecordRepository transactionRecordRepository;

    @Inject
    public ExcelResource(TransactionRecordRepository transactionRecordRepository) {
        this.transactionRecordRepository = transactionRecordRepository;
    }

    @GET
    @Path("{bommelId}")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public XSSFWorkbook getExport(@PathParam("bommelId") Long bommelId) {
        List<TransactionRecord> records = transactionRecordRepository.findByBommelId(bommelId, new Page(99999));

        XSSFWorkbook xssfWorkbook = new XSSFWorkbook();

        XSSFSheet sheet = xssfWorkbook.createSheet("TransactionRecords");
        XSSFRow header = sheet.createRow(0);
        header.createCell(0).setCellValue("Order number");
        header.createCell(1).setCellValue("Type");
        header.createCell(2).setCellValue("Uploader");
        header.createCell(3).setCellValue("Transaction time");
        header.createCell(4).setCellValue("Total");
        header.createCell(5).setCellValue("Amount due");
        header.createCell(6).setCellValue("Due date");
        header.createCell(7).setCellValue("Name");
        header.createCell(8).setCellValue("Invoice Id");
        header.createCell(9).setCellValue("Privately paid");

        for (int i = 1; i <= records.size(); i++) {
            TransactionRecord transactionRecord = records.get(i - 1);

            XSSFRow row = sheet.createRow(i);
            row.createCell(0).setCellValue(transactionRecord.getOrderNumber());
            row.createCell(1).setCellValue(transactionRecord.getDocument().name());
            row.createCell(2).setCellValue(transactionRecord.getUploader());
            // Transaction Time/Date
            row.createCell(3)
                    .setCellValue(transactionRecord.getTransactionTime()
                            .atOffset(ZoneOffset.UTC)
                            .toLocalDate());
            // Total
            row.createCell(4)
                    .setCellValue(
                            buildCurrencyString(transactionRecord.getTotal(), transactionRecord.getCurrencyCode()));
            // Amount due
            row.createCell(5)
                    .setCellValue(
                            buildCurrencyString(transactionRecord.getAmountDue(), transactionRecord.getCurrencyCode()));
            // Due Time/Date
            row.createCell(6)
                    .setCellValue(transactionRecord.getDueDate()
                            .atOffset(ZoneOffset.UTC)
                            .toLocalDate());
            row.createCell(7).setCellValue(transactionRecord.getName());
            row.createCell(8).setCellValue(transactionRecord.getInvoiceId());
            row.createCell(9).setCellValue(transactionRecord.isPrivatelyPaid());
        }

        return xssfWorkbook;
    }

    private String buildCurrencyString(BigDecimal amount, String currencyCode) {
        String amountStringify = amount.setScale(2, RoundingMode.HALF_UP).toString();
        String symbolFromCode = getSymbolFromCode(currencyCode);

        return String.format("%s %s", amountStringify, symbolFromCode);
    }

    private String getSymbolFromCode(String currencyCode) {
        return switch (currencyCode) {
            case "EUR" -> "€";
            case "USD" -> "$";
            default -> currencyCode;
        };
    }
}
