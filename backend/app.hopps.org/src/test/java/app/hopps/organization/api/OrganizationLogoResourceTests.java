package app.hopps.organization.api;

import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;

@QuarkusTest
@TestHTTPEndpoint(OrganizationResource.class)
@TestSecurity(user = "emanuel_urban@domain.none")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
})
class OrganizationLogoResourceTests {

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    @DisplayName("should store an uploaded logo and serve it back unchanged")
    void shouldUploadAndDownloadLogo() {
        byte[] png = png(256, 256);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "logo.png", png, "image/png")
                .when()
                .post("my/logo")
                .then()
                .statusCode(200)
                .body("hasLogo", is(true));

        byte[] downloaded = given()
                .when()
                .get("my/logo")
                .then()
                .statusCode(200)
                .extract()
                .asByteArray();

        assertArrayEquals(png, downloaded);
    }

    @Test
    @DisplayName("should replace a previously uploaded logo")
    void shouldReplaceLogo() {
        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "logo.png", png(256, 256), "image/png")
                .when()
                .post("my/logo")
                .then()
                .statusCode(200);

        byte[] replacement = png(300, 300);
        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "logo-neu.png", replacement, "image/png")
                .when()
                .post("my/logo")
                .then()
                .statusCode(200)
                .body("hasLogo", is(true));

        byte[] downloaded = given().when().get("my/logo").then().statusCode(200).extract().asByteArray();
        assertArrayEquals(replacement, downloaded);
    }

    @Test
    @DisplayName("should accept a JPEG logo")
    void shouldAcceptJpeg() {
        byte[] jpeg = raster("jpg", 256, 256);

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                // .jpg and .jpeg are both sent as image/jpeg; image/jpg is not a registered type.
                .multiPart("file", "logo.jpg", jpeg, "image/jpeg")
                .when()
                .post("my/logo")
                .then()
                .statusCode(200)
                .body("hasLogo", is(true));
    }

    @Test
    @DisplayName("should reject a file type that is neither PNG, JPEG nor SVG")
    void shouldRejectUnsupportedContentType() {
        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "logo.gif", raster("png", 300, 300), "image/gif")
                .when()
                .post("my/logo")
                .then()
                .statusCode(415);
    }

    @Test
    @DisplayName("should reject a raster logo smaller than 256x256 px")
    void shouldRejectTooSmallLogo() {
        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "logo.png", png(64, 64), "image/png")
                .when()
                .post("my/logo")
                .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("should apply the minimum size check to JPEG as well")
    void shouldRejectTooSmallJpeg() {
        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "logo.jpg", raster("jpg", 64, 64), "image/jpeg")
                .when()
                .post("my/logo")
                .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("should accept an SVG without checking its dimensions")
    void shouldAcceptSvg() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 10 10\"><rect width=\"10\" height=\"10\"/></svg>";

        given()
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .multiPart("file", "logo.svg", svg.getBytes(StandardCharsets.UTF_8), "image/svg+xml")
                .when()
                .post("my/logo")
                .then()
                .statusCode(200)
                .body("hasLogo", is(true));
    }

    @Test
    @DisplayName("should return 404 when the organization has no logo")
    void shouldReturnNotFoundWithoutLogo() {
        given()
                .when()
                .get("my/logo")
                .then()
                .statusCode(404);
    }

    private static byte[] png(int width, int height) {
        return raster("png", width, height);
    }

    /** ImageIO's JPEG writer cannot encode an alpha channel, so JPEG needs an opaque image type. */
    private static byte[] raster(String format, int width, int height) {
        int imageType = "png".equals(format) ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage image = new BufferedImage(width, height, imageType);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            if (!ImageIO.write(image, format, out)) {
                throw new IllegalStateException("No ImageIO writer available for " + format);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }
}
