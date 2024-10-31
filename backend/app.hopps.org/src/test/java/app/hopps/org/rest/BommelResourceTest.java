package app.hopps.org.rest;

import app.hopps.org.jpa.Bommel;
import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.BommelTestResourceCreator;
import app.hopps.org.jpa.TreeSearchBommel;
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

import java.util.List;
import java.util.Objects;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

@QuarkusTest
class BommelResourceTest {

    @Inject
    BommelRepository bommelRepo;

    @Inject
    BommelTestResourceCreator resourceCreator;

    @InjectMock
    AuthorizationModelClient authModelClient;

    @BeforeEach
    @Transactional
    public void setup() {
        bommelRepo.deleteAll();

        Mockito.when(authModelClient.check(any(TupleKey.class)))
                .thenReturn(Uni.createFrom().item(false));
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void testCreateRoot() {
        given()
                .when()
                .get("/bommel/root")
                .then()
                .statusCode(200)
                .body(is("null"));

        given()
                .body("""
                        { "name": "Root", "emoji":"" }
                        """)
                .contentType("application/json")
                .when()
                .post("/bommel/root")
                .then()
                .statusCode(200);

        long rootId = bommelRepo.getRoot().id;

        var allowedTuple = TupleKey.of("bommel:" + rootId, "read", "user:test");

        Mockito.when(authModelClient.check(allowedTuple))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .get("/bommel/root")
                .then()
                .statusCode(200)
                .body("name", is("Root"))
                .and()
                .body("parent", is(nullValue()));
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
                .when()
                .post("/bommel")
                .then()
                .statusCode(401);

        assertEquals(bommels.size(), bommelRepo.count());

        // Give read permissions
        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + parent.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\", \"parent\": { \"id\":" + parent.id + "} }")
                .contentType("application/json")
                .when()
                .post("/bommel")
                .then()
                .statusCode(401);

        assertEquals(bommels.size(), bommelRepo.count());

        // Give write permissions
        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + parent.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\", \"parent\": { \"id\":" + parent.id + "} }")
                .contentType("application/json")
                .when()
                .post("/bommel")
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
                .when()
                .put("/bommel/{id}", bommel.id)
                .then()
                .statusCode(401);

        assertNotEquals(bommelRepo.findById(bommel.id).getName(), "Test bommel");

        // Give write permissions
        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\" }")
                .contentType("application/json")
                .when()
                .put("/bommel/{id}", bommel.id)
                .then()
                .statusCode(200)
                .body("id", is(bommel.id.intValue()))
                .and()
                .body("name", is("Test bommel"))
                .and()
                .body("parent.id", is(bommel.getParent().id.intValue()))
                .and()
                .body("parent.parent", is(nullValue()));

        var updatedBommel = bommelRepo.findById(bommel.id);
        bommelRepo.getEntityManager().refresh(updatedBommel);

        assertEquals("Test bommel", updatedBommel.getName());
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void getBommelRequiresReadPermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        given()
                .when()
                .get("/bommel/{id}", bommel.id)
                .then()
                .statusCode(401);

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .get("/bommel/{id}", bommel.id)
                .then()
                .statusCode(200)
                .body("id", is(bommel.id.intValue()))
                .and()
                .body("name", is(bommel.getName()))
                .and()
                .body("emoji", is(bommel.getEmoji()))
                .and()
                .body("parent.id", is(bommel.getParent().id.intValue()));
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void moveBommelWorksWithWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var child = bommels.getLast();
        var newParent = bommels.get(2);

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + child.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + newParent.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .put("/bommel/move/{id}/to/{newParent}", child.id, newParent.id)
                .then()
                .statusCode(200)
                .body("id", is(child.id.intValue()))
                .and()
                .body("parent.id", is(newParent.id.intValue()));

        var updatedChild = bommelRepo.findById(child.id);
        bommelRepo.getEntityManager().refresh(updatedChild);
        assertEquals(newParent.id, updatedChild.getParent().id);
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void moveBommelFailsWithoutWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var child = bommels.getLast();
        var oldParent = bommels.get(1);
        var newParent = bommels.get(2);

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + child.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .put("/bommel/move/{id}/to/{newParent}", child.id, newParent.id)
                .then()
                .statusCode(401);

        var updatedChild = bommelRepo.findById(child.id);
        bommelRepo.getEntityManager().refresh(updatedChild);
        assertEquals(oldParent.id, updatedChild.getParent().id);
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void getChildrenRecursiveReturnsAllChildren() {
        var bommels = resourceCreator.setupSimpleTree();
        Bommel root = bommels.getFirst();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + root.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        List<TreeSearchBommel> treeSearchChildren = given()
                .when()
                .get("/bommel/{id}/children/recursive", root.id)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getList("$", TreeSearchBommel.class);

        var children = treeSearchChildren.stream()
                .map(TreeSearchBommel::bommel)
                .toList();

        assertTrue(
                children.stream()
                        .anyMatch(bommel -> Objects.equals(bommel.id, bommels.get(1).id)));

        assertTrue(
                children.stream()
                        .anyMatch(bommel -> Objects.equals(bommel.id, bommels.get(2).id)));

        assertTrue(
                children.stream()
                        .anyMatch(bommel -> Objects.equals(bommel.id, bommels.get(3).id)));
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void getChildrenReturnsAllDirectChildren() {
        var bommels = resourceCreator.setupSimpleTree();
        Bommel root = bommels.getFirst();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + root.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        List<Bommel> children = given()
                .when()
                .get("/bommel/{id}/children", root.id)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getList("$", Bommel.class);

        assertTrue(
                children.stream()
                        .anyMatch(bommel -> Objects.equals(bommel.id, bommels.get(1).id)));

        assertTrue(
                children.stream()
                        .anyMatch(bommel -> Objects.equals(bommel.id, bommels.get(2).id)));

        assertFalse(
                children.stream()
                        .anyMatch(bommel -> Objects.equals(bommel.id, bommels.get(3).id)));
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void deleteBommelDoesntWorkWithReadPermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .delete("/bommel/{id}", bommel.id)
                .then()
                .statusCode(401);

        assertEquals(bommels.size(), bommelRepo.count());
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    public void deleteBommelWorksWithWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .delete("/bommel/{id}", bommel.id)
                .then()
                .statusCode(204);

        assertEquals(bommels.size() - 1, bommelRepo.count());
    }

}
