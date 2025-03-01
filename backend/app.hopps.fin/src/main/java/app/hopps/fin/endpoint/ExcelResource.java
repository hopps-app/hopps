package app.hopps.fin.endpoint;

import app.hopps.fin.excel.ExcelColumn;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.InternalServerErrorException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Currency;
import java.util.List;

@Authenticated
@Path("excel")
public class ExcelResource {
    private static final Logger LOG = LoggerFactory.getLogger(ExcelResource.class);

    private final TransactionRecordRepository transactionRecordRepository;

    private static final List<ExcelColumn> EXCEL_COLUMNS = List.of(
            new ExcelColumn("Order number", TransactionRecord::getOrderNumber),
            new ExcelColumn("Type", t -> t.getDocument().name()),
            new ExcelColumn("Uploader", TransactionRecord::getUploader),
            // Transaction Time/Date
            new ExcelColumn("Transaction time", t -> handleLocalDateTime(t.getTransactionTime())),
            // Total
            new ExcelColumn("Total", t -> buildCurrencyString(t.getTotal(), t.getCurrencyCode())),
            // Amount due
            new ExcelColumn("Amount due", t -> buildCurrencyString(t.getAmountDue(), t.getCurrencyCode())),
            // Due Time/Date
            new ExcelColumn("Due date", t -> handleLocalDate(t.getDueDate())),
            new ExcelColumn("Name", TransactionRecord::getName),
            new ExcelColumn("Invoice Id", TransactionRecord::getInvoiceId),
            new ExcelColumn("Privately paid", TransactionRecord::isPrivatelyPaid),
            new ExcelColumn("Bommel ID", TransactionRecord::getBommelId));

    @Inject
    public ExcelResource(TransactionRecordRepository transactionRecordRepository) {
        this.transactionRecordRepository = transactionRecordRepository;
    }

    @GET
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response getExport() {
        List<TransactionRecord> records = transactionRecordRepository.listAll();

        try (XSSFWorkbook xssfWorkbook = new XSSFWorkbook()) {

            XSSFSheet sheet = xssfWorkbook.createSheet("TransactionRecords");
            XSSFRow header = sheet.createRow(0);
            for (int i = 0; i < EXCEL_COLUMNS.size(); i++) {
                XSSFCell cell = header.createCell(i);
                cell.setCellValue(EXCEL_COLUMNS.get(i).headerKey());
            }

            for (int i = 1; i <= records.size(); i++) {
                TransactionRecord transactionRecord = records.get(i - 1);

                XSSFRow row = sheet.createRow(i);

                for (int j = 0; j < EXCEL_COLUMNS.size(); j++) {
                    Object transactionValue = EXCEL_COLUMNS.get(j).value().apply(transactionRecord);
                    if (transactionValue == null) {
                        continue;
                    }

                    XSSFCell cell = row.createCell(j);

                    // setCellValue cannot work with Object.class
                    switch (transactionValue) {
                        case String val -> cell.setCellValue(val);
                        case LocalDateTime val -> handleLocalDateTimeCell(xssfWorkbook, val, cell);
                        case LocalDate val -> handleLocalDateCell(xssfWorkbook, val, cell);
                        case Boolean val -> cell.setCellValue(val);
                        case Double val -> cell.setCellValue(val);
                        case Long val -> cell.setCellValue(val);
                        default -> throw new IllegalStateException(
                                "Unexpected value: " + transactionValue + " - " + transactionValue.getClass());
                    }
                }
            }

            // AutoSizeColumns
            for (int i = 0; i < EXCEL_COLUMNS.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            try (bos) {
                xssfWorkbook.write(bos);
            }

            String format = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm").format(LocalDateTime.now());

            return Response.ok()
                    .entity(bos.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"hopps-" + format + ".xlsx\"")
                    .build();
        } catch (IOException ioException) {
            LOG.error("Could not convert XSSFWorkbook to bytearray", ioException);
            throw new InternalServerErrorException(Response.status(500).entity("Exporting excel failed!").build());
        }
    }

    private void handleLocalDateCell(XSSFWorkbook wb, LocalDate val, XSSFCell cell) {
        XSSFCellStyle cellStyle = wb.createCellStyle();
        cellStyle.setDataFormat(wb.createDataFormat().getFormat("dd.mm.yyyy"));
        cell.setCellStyle(cellStyle);

        cell.setCellValue(DateUtil.getExcelDate(val));
    }

    private static void handleLocalDateTimeCell(XSSFWorkbook wb, LocalDateTime val, XSSFCell cell) {
        XSSFCellStyle cellStyle = wb.createCellStyle();
        cellStyle.setDataFormat(wb.createDataFormat().getFormat("dd.mm.yyyy hh:mm"));
        cell.setCellStyle(cellStyle);

        cell.setCellValue(DateUtil.getExcelDate(val));
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

    private static String buildCurrencyString(BigDecimal amount, String currencyCode) {
        if (amount == null) {
            return "";
        }

        String amountStringify = amount.setScale(2, RoundingMode.HALF_UP).toString();
        String symbolFromCode = getSymbolFromCode(currencyCode);

        return String.format("%s %s", amountStringify, symbolFromCode);
    }

    private static String getSymbolFromCode(String currencyCode) {
        return Currency.getInstance(currencyCode).getSymbol();
    }
}
