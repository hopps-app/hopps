package app.hopps.fin.endpoint;

import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import static io.restassured.RestAssured.given;

@QuarkusTest
@TestSecurity(user = "peter")
@TestHTTPEndpoint(ExcelResource.class)
class ExcelResourceTest {
    @Test
    void getExcelFile() {
        byte[] byteArray = given()
                .when()
                .get("{bommelId}", 2L)
                .then()
                .statusCode(200)
                .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .extract()
                .body()
                .asByteArray();

        File file = new File("src/test/resources/excel.xlsx");
        try {
            FileOutputStream fileOutputStream = new FileOutputStream(file);
            IOUtils.write(byteArray, fileOutputStream);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
