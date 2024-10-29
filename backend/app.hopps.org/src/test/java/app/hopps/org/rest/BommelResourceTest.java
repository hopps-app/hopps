package app.hopps.org.rest;

import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.BommelTestResourceCreator;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.model.TupleKey;
import io.quarkus.test.InjectMock;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;

@QuarkusTest
class BommelResourceTest {

    @Inject
    BommelRepository bommelRepo;

    @Inject
    BommelTestResourceCreator resourceCreator;

    @InjectMock
    AuthorizationModelClient authModelClient;

//    @Inject
//    StoreClient storeClient;

    @BeforeEach
    @Transactional
    public void setup() {
        bommelRepo.deleteAll();

        Mockito.when(authModelClient.check(any(TupleKey.class)))
                .thenReturn(Uni.createFrom().item(false));

//        var newTuples = bommels.stream()
//                .map(bommel ->
//                    ConditionalTupleKey.of("bommel:" + bommel.id, "read", "user:test"))
//                .toList();
//
//        var tuplesToDelete = List.of(
//                TupleKey.of("bommel:*", "read", "user:test"),
//                TupleKey.of("bommel:*", "write", "user:test")
//        );
//
//        storeClient.authorizationModels().defaultModel().write(
//                newTuples,
//                tuplesToDelete
//        ).await().indefinitely();
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void testCreateRoot() {
        given()
            .when().get("/bommel/root")
            .then()
                .statusCode(200)
                .body(is("null"));

        given()
            .body("""
                { "name": "Root", "emoji":"" }
                """)
            .contentType("application/json")
            .when().post("/bommel/root")
            .then()
                .statusCode(200);

        long rootId = bommelRepo.getRoot().id;

        var allowedTuple = TupleKey.of("bommel:" + rootId, "read", "user:test");

        Mockito.when(authModelClient.check(allowedTuple))
                .thenReturn(Uni.createFrom().item(true));

        given()
            .when().get("/bommel/root")
            .then()
                .statusCode(200)
                .body(not("null"));
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void createBommelOnlyWithWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var parent = bommels.getLast();

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\", \"parent\": { \"id\":" + parent.id + "} }")
                .contentType("application/json")
                .when().post("/bommel")
                .then()
                .statusCode(401);

        assertEquals(bommels.size(), bommelRepo.count());

        // Give read permissions
        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + parent.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\", \"parent\": { \"id\":" + parent.id + "} }")
                .contentType("application/json")
                .when().post("/bommel")
                .then()
                .statusCode(401);

        assertEquals(bommels.size(), bommelRepo.count());

        // Give write permissions
        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + parent.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\", \"parent\": { \"id\":" + parent.id + "} }")
                .contentType("application/json")
                .when().post("/bommel")
                .then()
                .statusCode(200);

        assertEquals(bommels.size() + 1, bommelRepo.count());
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void updateBommelOnlyWithWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\" }")
                .contentType("application/json")
                .when().put("/bommel/{id}", bommel.id)
                .then()
                .statusCode(401);

        assertNotEquals(bommelRepo.findById(bommel.id).getName(), "Test bommel");

        // Give write permissions
        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\" }")
                .contentType("application/json")
                .when().put("/bommel/{id}", bommel.id)
                .then()
                .statusCode(200)
                .body("id", is(bommel.id.intValue()))
                .and().body("name", is("Test bommel"))
                .and().body("parent.id", is(bommel.getParent().id.intValue()))
                .and().body("parent.parent", is(nullValue()));

        var updatedBommel = bommelRepo.findById(bommel.id);
        bommelRepo.getEntityManager().refresh(updatedBommel);

        assertEquals("Test bommel", updatedBommel.getName());
    }
}