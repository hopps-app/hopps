package app.hopps.org.rest;

import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.ws.rs.core.Response.Status;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;

@QuarkusTest
@TestHTTPEndpoint(DashboardEndpoint.class)
@TestSecurity(user = "peter")
class DashboardEndpointTest {
    @Test
    void shouldGetOpenTasks() {
        given()
                .when()
                .get("tasks")
                .then()
                .statusCode(Status.OK.getStatusCode());
    }

    @Test
    void shouldGetUnpaidInvoices() {
        given()
                .when()
                .get("unpaid")
                .then()
                .statusCode(Status.OK.getStatusCode());
    }

    @Test
    void shouldGetYearsRevenue() {
        given()
                .when()
                .get("revenue")
                .then()
                .statusCode(Status.OK.getStatusCode());
    }

    @Test
    void shouldGetMembers() {
        given()
                .when()
                .get("members")
                .then()
                .statusCode(Status.OK.getStatusCode());
    }
}
