package app.hopps.fin.endpoint;

import app.hopps.commons.DocumentType;
import app.hopps.commons.fga.FgaRelations;
import app.hopps.commons.fga.FgaTypes;
import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.matching.ContainsPattern;
import com.github.tomakehurst.wiremock.matching.NegativeContainsPattern;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.model.RelObject;
import io.quarkiverse.openfga.client.model.RelTupleKey;
import io.quarkiverse.openfga.client.model.RelTupleKeyed;
import io.quarkiverse.openfga.client.model.RelUser;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.panache.common.Page;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.keycloak.client.KeycloakTestClient;
import io.quarkus.test.security.TestSecurity;
import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import wiremock.com.fasterxml.jackson.databind.node.JsonNodeFactory;
import wiremock.com.fasterxml.jackson.databind.node.ObjectNode;

import java.math.BigDecimal;
import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathMatching;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
@ConnectWireMock
@TestSecurity(user = "bob", roles = "user")
@TestHTTPEndpoint(TransactionRecordResource.class)
class TransactionRecordResourceTest {
    @Inject
    TransactionRecordRepository repository;

    @InjectMock
    AuthorizationModelClient authorizationModelClient;

    WireMock wireMock;

    KeycloakTestClient keycloakClient = new KeycloakTestClient();

    @BeforeEach
    @Transactional
    void setup() {
        repository.deleteAll();

        TransactionRecord withBommel = new TransactionRecord(BigDecimal.valueOf(50), DocumentType.INVOICE, "test");
        withBommel.setDocumentKey("randomKey");
        withBommel.setBommelId(1L);
        repository.persist(withBommel);

        TransactionRecord noBommel = new TransactionRecord(BigDecimal.valueOf(20), DocumentType.RECEIPT, "test");
        noBommel.setDocumentKey("randomKey");
        repository.persist(noBommel);

        Mockito.when(authorizationModelClient.check(Mockito.any(RelTupleKeyed.class)))
                .thenReturn(Uni.createFrom().item(false));
    }

    @Test
    void shouldFetchAll() {
        RelObject relObject = RelObject.of(FgaTypes.BOMMEL.getFgaName(), "1");

        Mockito.when(authorizationModelClient.listObjects(Mockito.any()))
                .thenReturn(Uni.createFrom().item(List.of(relObject)));

        given()
                .when()
                .get("all")
                .then()
                .statusCode(200)
                .body("size()", is(2));
    }

    @Test
    void shouldFetchOnlyWithoutBommelId() {
        given()
                .when()
                .get("all")
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].bommelId", nullValue());
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
        RelTupleKey relTupleKey = RelTupleKey.builder()
                .user(RelUser.of(FgaTypes.USER.getFgaName(), "bob"))
                .relation(FgaRelations.MEMBER.getFgaName())
                .object(RelObject.of(FgaTypes.BOMMEL.getFgaName(), "1"))
                .build();

        Mockito.when(authorizationModelClient.check(relTupleKey))
                .thenReturn(Uni.createFrom().item(true));

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
    void shouldGetAForbidden() {
        given()
                .when()
                .queryParam("bommelId", 2)
                .get("all")
                .then()
                .statusCode(403);
    }

    @Test
    void shouldAddToBommel() {
        // given
        Long id = repository.findWithoutBommel(new Page(0, 10)).getFirst().getId();

        ObjectNode objectNode = JsonNodeFactory.instance.objectNode();
        objectNode
                .put("name", "BommelName")
                .put("emoji", "BommelEmoji");

        wireMock.register(
                get(urlPathMatching("/bommel/1"))
                        .withHeader("Authorization", new ContainsPattern("Bearer"))
                        .willReturn(aResponse()
                                .withStatus(200)
                                .withJsonBody(objectNode)));

        RelTupleKey relTupleKey = RelTupleKey.builder()
                .user(RelUser.of(FgaTypes.USER.getFgaName(), "bob"))
                .relation(FgaRelations.MEMBER.getFgaName())
                .object(RelObject.of(FgaTypes.BOMMEL.getFgaName(), "1"))
                .build();

        Mockito.when(authorizationModelClient.check(relTupleKey))
                .thenReturn(Uni.createFrom().item(true));

        // when
        given()
                .auth()
                .oauth2(getAccessToken("bob"))
                .when()
                .pathParam("id", id)
                .queryParam("bommelId", 1)
                .patch("{id}/bommel")
                .then()
                .statusCode(201);
    }

    @Test
    void shouldFailToAddBommel() {
        // given
        Long id = repository.findWithoutBommel(new Page(0, 10)).getFirst().getId();

        Long bommelId = 1L;

        ObjectNode objectNode = JsonNodeFactory.instance.objectNode();
        objectNode
                .put("name", "BommelName")
                .put("emoji", "BommelEmoji");

        RelTupleKey relTupleKey = RelTupleKey.builder()
                .user(RelUser.of(FgaTypes.USER.getFgaName(), "bob"))
                .relation(FgaRelations.MEMBER.getFgaName())
                .object(RelObject.of(FgaTypes.BOMMEL.getFgaName(), "1"))
                .build();

        Mockito.when(authorizationModelClient.check(relTupleKey))
                .thenReturn(Uni.createFrom().item(true));

        wireMock.register(
                get(urlPathMatching("/bommel/1"))
                        .withHeader("Authorization", new NegativeContainsPattern("Bearer"))
                        .willReturn(aResponse()
                                .withStatus(401)
                                .withJsonBody(objectNode)));

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

        RelTupleKey relTupleKey = RelTupleKey.builder()
                .user(RelUser.of(FgaTypes.USER.getFgaName(), "bob"))
                .relation(FgaRelations.MEMBER.getFgaName())
                .object(RelObject.of(FgaTypes.BOMMEL.getFgaName(), "1"))
                .build();

        Mockito.when(authorizationModelClient.check(relTupleKey))
                .thenReturn(Uni.createFrom().item(true));

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

        given()
                .when()
                .pathParam("id", id)
                .queryParam("bommelId", 99)
                .patch("{id}/bommel")
                .then()
                .statusCode(403);
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
