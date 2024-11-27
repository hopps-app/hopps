package app.hopps.fin.endpoint;

import app.hopps.fin.jpa.TransactionRecordRepository;
import app.hopps.fin.jpa.entities.TransactionRecord;
import io.quarkus.panache.common.Page;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;

@QuarkusTest
@TestHTTPEndpoint(TransactionRecordResource.class)
class TransactionRecordResourceTest {
    @Inject
    TransactionRecordRepository repository;

    @BeforeEach
    @Transactional
    void setup() {
        TransactionRecord withBommel = new TransactionRecord();
        withBommel.setTotal(BigDecimal.valueOf(50));
        withBommel.setBommelId(1L);
        repository.persist(withBommel);

        TransactionRecord noBommel = new TransactionRecord();
        noBommel.setTotal(BigDecimal.valueOf(20));
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
        Long id = repository.findWithoutBommel(new Page(0, 10)).getFirst().getId();

        Long bommelId = 1L;

        given()
                .when()
                .pathParam("id", id)
                .queryParam("bommelId", bommelId)
                .patch("{id}/bommel")
                .then()
                .statusCode(201);
    }

    @AfterEach
    @Transactional
    void cleanup() {
        repository.deleteAll();
    }
}