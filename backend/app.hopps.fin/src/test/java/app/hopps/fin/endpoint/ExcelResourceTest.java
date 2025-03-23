package app.hopps.fin.endpoint;

import app.hopps.fin.client.Bommel;
import app.hopps.fin.client.OrgRestClient;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import org.apache.commons.io.IOUtils;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import static io.restassured.RestAssured.given;

@QuarkusTest
@TestSecurity(user = "peter")
@TestHTTPEndpoint(ExcelResource.class)
class ExcelResourceTest {
    @InjectMock
    @RestClient
    OrgRestClient orgRestClient;

    @BeforeEach
    void setUp() {
        Bommel bommel = new Bommel("Bommel 2");
        Mockito.when(orgRestClient.getBommel(2L)).thenReturn(bommel);
    }

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

        File file = new File("target/bommels.xlsx");
        try {
            FileOutputStream fileOutputStream = new FileOutputStream(file);
            IOUtils.write(byteArray, fileOutputStream);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
