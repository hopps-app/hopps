package app.hopps.fin.endpoint;

import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.InternalServerErrorException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;
import org.apache.commons.lang3.time.StopWatch;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static app.hopps.fin.excel.ExcelHelper.EXCEL_COLUMNS;
import static app.hopps.fin.excel.ExcelHelper.buildHeaderRow;
import static app.hopps.fin.excel.ExcelHelper.createSumRow;

@Authenticated
@Path("excel")
public class ExcelResource {
    private static final Logger LOG = LoggerFactory.getLogger(ExcelResource.class);

    private final TransactionRecordRepository transactionRecordRepository;

    @Inject
    public ExcelResource(TransactionRecordRepository transactionRecordRepository) {
        this.transactionRecordRepository = transactionRecordRepository;
    }

    @GET
    @Path("{bommelId}")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @APIResponse(responseCode = "204", description = "Database checked and nothing to export found")
    public Response getExport(@PathParam("bommelId") Long bommelId) {
        StopWatch timer = StopWatch.createStarted();

        List<TransactionRecord> records = transactionRecordRepository.findByBommelId(bommelId, new Page(9999));

        try (XSSFWorkbook xssfWorkbook = new XSSFWorkbook()) {
            XSSFSheet sheet = xssfWorkbook.createSheet("TransactionRecords");
            XSSFRow header = buildHeaderRow(xssfWorkbook, sheet);

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
                        case Double val -> handleMoney(xssfWorkbook, val, cell);
                        case Long val -> cell.setCellValue(val);
                        default -> throw new IllegalStateException(
                                "Unexpected value: " + transactionValue + " - " + transactionValue.getClass());
                    }
                }
            }

            createSumRow(sheet, records, xssfWorkbook);

            // AutoSizeColumns
            for (int i = 0; i < EXCEL_COLUMNS.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            String colReference = header.getCell(EXCEL_COLUMNS.size() - 1).getReference();
            sheet.setAutoFilter(CellRangeAddress.valueOf("A1:" + colReference + "1"));

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
        } finally {
            timer.stop();
            LOG.info("Export finished in {}", timer.getDuration());
        }
    }

    private void handleMoney(XSSFWorkbook wb, Double val, XSSFCell cell) {
        XSSFCellStyle cellStyle = wb.createCellStyle();
        cellStyle.setDataFormat(wb.createDataFormat().getFormat("#.## $"));
        cell.setCellStyle(cellStyle);

        cell.setCellValue(val);
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
}
