package app.hopps.fin.endpoint;

import app.hopps.fin.model.DocumentType;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.apache.commons.io.IOUtils;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.InputStream;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
@TestSecurity(user = "peter")
@TestHTTPEndpoint(DocumentResource.class)
class DocumentResourceTest {
    private static final String IMAGE_KEY = "imageKey";

    @Inject
    Flyway flyway;

    @Inject
    S3Client s3Client;

    @ConfigProperty(name = "app.hopps.fin.bucket.name")
    String bucketName;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();

        try (InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf")) {
            assert zugferdInputStream != null;
            byte[] byteArray = IOUtils.toByteArray(zugferdInputStream);

            s3Client.putObject(PutObjectRequest.builder()
                    .key(IMAGE_KEY)
                    .bucket(bucketName)
                    .build(), RequestBody.fromBytes(byteArray));
        } catch (Exception ignored) {
            // Do nothing
        }
    }

    @Test
    void shouldNotGetFile() {
        given()
                .when()
                .get("{documentKey}", "randomKey")
                .then()
                .statusCode(Response.Status.NOT_FOUND.getStatusCode());
    }

    @Test
    void shouldGetFile() {
        given()
                .when()
                .get("{documentKey}", IMAGE_KEY)
                .then()
                .statusCode(Response.Status.OK.getStatusCode());
    }

    @Test
    void shouldUploadFile() {

        InputStream zugferdInputStream = getClass().getClassLoader().getResourceAsStream("ZUGFeRD.pdf");
        assertNotNull(zugferdInputStream);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "ZUGFeRD.pdf", zugferdInputStream)
                .multiPart("type", DocumentType.INVOICE.toString())
                .when()
                .post()
                .then()
                .statusCode(Response.Status.ACCEPTED.getStatusCode());
    }
}
