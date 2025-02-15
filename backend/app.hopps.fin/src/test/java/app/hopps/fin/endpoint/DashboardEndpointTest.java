package app.hopps.fin.endpoint;

import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;

@QuarkusTest
@TestHTTPEndpoint(DashboardEndpoint.class)
@TestSecurity(user = "peter")
class DashboardEndpointTest {
    @Test
    void shouldGetUnpaidInvoices() {
        given()
                .when()
                .get("unpaid")
                .then()
                .statusCode(Response.Status.OK.getStatusCode());
    }

    @Test
    void shouldGetYearsRevenue() {
        given()
                .when()
                .get("revenue")
                .then()
                .statusCode(Response.Status.OK.getStatusCode());
    }
}
