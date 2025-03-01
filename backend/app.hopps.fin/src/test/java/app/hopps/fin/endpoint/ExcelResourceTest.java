package app.hopps.fin.endpoint;

import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;

@QuarkusTest
@TestSecurity(user = "peter")
@TestHTTPEndpoint(ExcelResource.class)
class ExcelResourceTest {
    @Test
    void getExcelFile() {
        given()
                .when()
                .get()
                .then()
                .statusCode(200)
                .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }
}
