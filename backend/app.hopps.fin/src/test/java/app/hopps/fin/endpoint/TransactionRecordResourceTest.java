package app.hopps.fin.endpoint;

import app.hopps.commons.DocumentType;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.panache.common.Page;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import wiremock.com.fasterxml.jackson.databind.node.JsonNodeFactory;
import wiremock.com.fasterxml.jackson.databind.node.ObjectNode;

import java.math.BigDecimal;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathMatching;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

@QuarkusTest
@ConnectWireMock
@TestSecurity(authorizationEnabled = false)
@TestHTTPEndpoint(TransactionRecordResource.class)
class TransactionRecordResourceTest {
    @Inject
    TransactionRecordRepository repository;

    WireMock wireMock;

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

        Long bommelId = 1L;

        ObjectNode objectNode = JsonNodeFactory.instance.objectNode();
        objectNode
                .put("name", "BommelName")
                .put("emoji", "BommelEmoji");

        wireMock.register(
                get(urlPathMatching("/bommel/1"))
                        .willReturn(aResponse()
                                .withStatus(200)
                                .withJsonBody(objectNode)));

        // when
        given()
                .when()
                .pathParam("id", id)
                .queryParam("bommelId", bommelId)
                .patch("{id}/bommel")
                .then()
                .statusCode(201);
    }

    @Test
    void shouldThrowInternalErrorWhenOrgServiceDoesStrangeThings() {
        // given
        Long id = repository.findWithoutBommel(new Page(0, 10)).getFirst().getId();

        Long bommelId = 1L;

        ObjectNode objectNode = JsonNodeFactory.instance.objectNode();
        objectNode
                .put("name", "BommelName")
                .put("emoji", "BommelEmoji");

        wireMock.register(
                get(urlPathMatching("/bommel/1"))
                        .willReturn(aResponse()
                                .withStatus(500)));

        // when
        given()
                .when()
                .pathParam("id", id)
                .queryParam("bommelId", bommelId)
                .patch("{id}/bommel")
                .then()
                .statusCode(500);
    }

    @Test
    void shouldNotAddToBommel() {
        Long id = repository.findWithoutBommel(new Page(0, 10)).getFirst().getId();

        Long bommelId = 99L;

        wireMock.register(
                get(urlPathMatching("/bommel/99"))
                        .willReturn(aResponse()
                                .withStatus(404)));

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
}
