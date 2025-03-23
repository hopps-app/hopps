package app.hopps.fin.excel;

import app.hopps.fin.client.Bommel;
import app.hopps.fin.client.OrgRestClient;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static app.hopps.fin.excel.ExcelHelper.EXCEL_COLUMNS;
import static app.hopps.fin.excel.ExcelHelper.buildHeaderRow;
import static app.hopps.fin.excel.ExcelHelper.createSumRow;
import static app.hopps.fin.excel.ExcelHelper.handleMoney;

@ApplicationScoped
public class ExcelHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ExcelHandler.class);

    private final TransactionRecordRepository transactionRecordRepository;
    private final OrgRestClient orgRestClient;

    @Inject
    public ExcelHandler(TransactionRecordRepository transactionRecordRepository, @RestClient OrgRestClient orgRestClient) {
        this.transactionRecordRepository = transactionRecordRepository;
        this.orgRestClient = orgRestClient;
    }

    public void updateExcel(XSSFWorkbook xssfWorkbook, Long bommelId) {
        List<TransactionRecord> records = transactionRecordRepository.findByBommelId(bommelId, new Page(9999));

        XSSFSheet sheet = xssfWorkbook.createSheet("TransactionRecords");
        XSSFRow header = buildHeaderRow(xssfWorkbook, sheet);

        Map<Long, String> bommelIdToNameMap = new HashMap<>();
        // TODO: Get a set of bommelIds and then get the names into a map
        records.stream().map(TransactionRecord::getBommelId).collect(Collectors.toSet()).forEach(id -> {
            Bommel bommel = orgRestClient.getBommel(id);
            bommelIdToNameMap.put(id, bommel.name());
        });

        for (int i = 1; i <= records.size(); i++) {
            TransactionRecord transactionRecord = records.get(i - 1);

            XSSFRow row = sheet.createRow(i);

            for (int j = 0; j < EXCEL_COLUMNS.size(); j++) {
                ExcelColumn excelColumn = EXCEL_COLUMNS.get(j);
                Object transactionValue = excelColumn.value().apply(transactionRecord);

                XSSFCell cell = row.createCell(j);

                if ("bommelName".equals(excelColumn.headerKey())) {
                    cell.setCellValue(bommelIdToNameMap.get(transactionRecord.getBommelId()));
                    continue;
                }

                if (transactionValue == null) {
                    continue;
                }

                // setCellValue cannot work with Object.class
                switch (transactionValue) {
                    case String val -> cell.setCellValue(val);
                    case LocalDateTime val -> handleLocalDateTimeCell(xssfWorkbook, val, cell);
                    case LocalDate val -> handleLocalDateCell(xssfWorkbook, val, cell);
                    case Boolean val -> cell.setCellValue(val);
                    case Double val -> {
                        if (excelColumn.monetary()) {
                            handleMoney(xssfWorkbook, val, transactionRecord.getCurrencyCode(), cell);
                        } else {
                            cell.setCellValue(val);
                        }
                    }
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
    }

    private void handleLocalDateCell(XSSFWorkbook wb, LocalDate val, XSSFCell cell) {
        XSSFCellStyle cellStyle = wb.createCellStyle();
        cellStyle.setDataFormat(wb.createDataFormat().getFormat("dd.mm.yyyy"));
        cell.setCellStyle(cellStyle);

        cell.setCellValue(DateUtil.getExcelDate(val));
    }

    private void handleLocalDateTimeCell(XSSFWorkbook wb, LocalDateTime val, XSSFCell cell) {
        XSSFCellStyle cellStyle = wb.createCellStyle();
        cellStyle.setDataFormat(wb.createDataFormat().getFormat("dd.mm.yyyy hh:mm"));
        cell.setCellStyle(cellStyle);

        cell.setCellValue(DateUtil.getExcelDate(val));
    }
}
