package app.hopps.fin.endpoint;

import app.hopps.fin.excel.ExcelHandler;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.InternalServerErrorException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;
import org.apache.commons.lang3.time.StopWatch;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Authenticated
@Path("excel")
public class ExcelResource {
    private static final Logger LOG = LoggerFactory.getLogger(ExcelResource.class);

    private final ExcelHandler excelHandler;

    @Inject
    public ExcelResource(ExcelHandler excelHandler) {
        this.excelHandler = excelHandler;
    }

    @GET
    @Path("{bommelId}")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @APIResponse(responseCode = "204", description = "Database checked and nothing to export found")
    public Response getExport(@PathParam("bommelId") Long bommelId) {
        StopWatch timer = StopWatch.createStarted();

        try (XSSFWorkbook xssfWorkbook = new XSSFWorkbook()) {
            excelHandler.updateExcel(xssfWorkbook, bommelId);

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
}
