package app.hopps.org.rest;

import app.hopps.org.kogito.DataIndexApi;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.ws.rs.core.Response.Status;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

@QuarkusTest
@TestHTTPEndpoint(DashboardEndpoint.class)
@TestSecurity(user = "peter")
class DashboardEndpointTest {

    @InjectMock
    DataIndexApi dataIndexApi;

    @Test
    void shouldGetOpenTasks() {
        Mockito.when(dataIndexApi.getUserTaskInstances(Mockito.any())).thenReturn(List.of());

        given()
                .when()
                .get("tasks")
                .then()
                .statusCode(Status.OK.getStatusCode())
                .body(is("0"));
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
