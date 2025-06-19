package app.hopps.fin.endpoint;

import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import app.hopps.fin.model.DocumentType;
import io.quarkus.panache.common.Page;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.keycloak.client.KeycloakTestClient;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

@QuarkusTest
@TestSecurity(user = "peter", roles = "user")
@TestHTTPEndpoint(TransactionRecordResource.class)
class TransactionRecordResourceTest {
    @Inject
    TransactionRecordRepository repository;

    KeycloakTestClient keycloakClient = new KeycloakTestClient();

    @BeforeEach
    @Transactional
    void setup() {
        repository.deleteAll();

        TransactionRecord withBommel = new TransactionRecord(BigDecimal.valueOf(50), DocumentType.INVOICE, "alice");
        withBommel.setDocumentKey("randomKey");
        withBommel.setBommelId(1L);
        repository.persist(withBommel);

        TransactionRecord noBommel = new TransactionRecord(BigDecimal.valueOf(20), DocumentType.RECEIPT, "alice");
        noBommel.setDocumentKey("randomKey");
        repository.persist(noBommel);
    }

    @Test
    void shouldFetchAllDetached() {
        given()
                .when()
                .queryParam("detached", true)
                .get("all")
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].total", is(20.0F));
    }

    @Test
    void shouldFetchAllByBommel() {
        given()
                .when()
                .queryParam("bommelId", 1)
                .get("all")
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].total", is(50.0F));
    }

    @Test
    void shouldThrowErrorIfMultipleQueryParametersAreSet() {
        given()
                .when()
                .queryParam("bommelId", 1)
                .queryParam("detached", true)
                .get("all")
                .then()
                .statusCode(400)
                .body(is("Either set bommelId or detached not both!"));
    }

    @Test
    void shouldGetEmptyList() {
        given()
                .when()
                .queryParam("bommelId", 2)
                .get("all")
                .then()
                .statusCode(200)
                .body("size()", is(0));
    }

    @Test
    void shouldAddToBommel() {
        // given
        Long id = repository.findWithoutBommel(new Page(0, 10)).getFirst().getId();

        Long bommelId = 2L;

        // when
        given()
                .auth()
                .oauth2(getAccessToken("bob"))
                .when()
                .pathParam("id", id)
                .queryParam("bommelId", bommelId)
                .patch("{id}/bommel")
                .then()
                .statusCode(201);
    }

    @Test
    @Disabled("This is disabled because we currently don't check that the user has write permissions to the bommel")
    void shouldFailToAddBommel() {
        // given
        Long id = repository.findWithoutBommel(new Page(0, 10)).getFirst().getId();

        Long bommelId = 2L;

        // when
        given()
                .when()
                .pathParam("id", id)
                .queryParam("bommelId", bommelId)
                .patch("{id}/bommel")
                .then()
                .statusCode(401);
    }

    @Test
    void shouldNotAddToBommel() {
        Long id = repository.findWithoutBommel(new Page(0, 10)).getFirst().getId();

        Long bommelId = 99L; // not existent

        given()
                .when()
                .pathParam("id", id)
                .queryParam("bommelId", bommelId)
                .patch("{id}/bommel")
                .then()
                .statusCode(400);
    }

    @Test
    void shouldNotFindTransactionRecord() {
        given()
                .when()
                .pathParam("id", 99)
                .queryParam("bommelId", 99)
                .patch("{id}/bommel")
                .then()
                .statusCode(404);
    }

    protected String getAccessToken(String userName) {
        return keycloakClient.getAccessToken(userName);
    }
}
