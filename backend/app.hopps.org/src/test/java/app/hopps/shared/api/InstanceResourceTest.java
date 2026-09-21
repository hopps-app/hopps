package app.hopps.shared.api;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class InstanceResourceTest {

    @Test
    @DisplayName("describes a multi-tenant installation without requiring a login")
    void multiTenantByDefault() {
        given()
                .when()
                .get("/instance")
                .then()
                .statusCode(200)
                .body("tenancy", is("MULTI"))
                .body("setupRequired", is(false))
                .body("organizationName", nullValue());
    }
}
