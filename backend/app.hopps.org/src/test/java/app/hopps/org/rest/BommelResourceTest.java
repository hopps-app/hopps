package app.hopps.org.rest;

import app.hopps.org.jpa.*;
import app.hopps.org.rest.model.BommelInput;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.model.TupleKey;
import io.quarkus.test.InjectMock;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
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
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

@QuarkusTest
@TestHTTPEndpoint(BommelResource.class)
class BommelResourceTest {

    @Inject
    BommelRepository bommelRepo;

    @Inject
    OrganizationRepository orgRepo;

    @Inject
    BommelTestResourceCreator resourceCreator;

    @InjectMock
    AuthorizationModelClient authModelClient;

    @BeforeEach
    @Transactional
    void setup() {
        orgRepo.deleteAll();
        bommelRepo.deleteAll();

        Mockito.when(authModelClient.check(any(TupleKey.class)))
                .thenReturn(Uni.createFrom().item(false));
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    void shouldNotFindRoot() {
        Organization organization = resourceCreator.setupOrganization();

        given()
                .when()
                .get("/root/{orgId}", organization.getId())
                .then()
                .statusCode(404)
                .body(is("Bommel not found"));
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    void shouldCreateRoot() {
        var organization = resourceCreator.setupOrganization();

        BommelInput bommelInput = new BommelInput(organization.getId(), "Root", "", null, null);

        long rootId = given()
                .body(bommelInput)
                .contentType("application/json")
                .when()
                .post("/root")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        var allowedTuple = TupleKey.of("bommel:" + rootId, "read", "user:test");

        Mockito.when(authModelClient.check(allowedTuple))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .get("/root/{orgId}", organization.getId())
                .then()
                .statusCode(200)
                .body("name", is("Root"))
                .body("parent", is(nullValue()));
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    void createBommelOnlyWithWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var parent = bommels.getLast();

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\", \"parent\": { \"id\":" + parent.id + "} }")
                .contentType("application/json")
                .when()
                .post()
                .then()
                .statusCode(403);

        assertEquals(bommels.size(), bommelRepo.count());

        // Give read permissions
        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + parent.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\", \"parent\": { \"id\":" + parent.id + "} }")
                .contentType("application/json")
                .when()
                .post()
                .then()
                .statusCode(403);

        assertEquals(bommels.size(), bommelRepo.count());

        // Give write permissions
        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + parent.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\", \"parent\": { \"id\":" + parent.id + "} }")
                .contentType("application/json")
                .when()
                .post()
                .then()
                .statusCode(201)
                .body("id", notNullValue());

        assertEquals(bommels.size() + 1, bommelRepo.count());
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    void updateBommelOnlyWithWritePermsions() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\" }")
                .contentType("application/json")
                .when()
                .put("/{id}", bommel.id)
                .then()
                .statusCode(403);

        assertNotEquals("Test bommel", bommelRepo.findById(bommel.id).getName());

        // Give write permissions
        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .body("{ \"name\": \"Test bommel\", \"emoji\": \"\" }")
                .contentType("application/json")
                .when()
                .put("/{id}", bommel.id)
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
    void getBommelRequiresReadPermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        given()
                .when()
                .get("/{id}", bommel.id)
                .then()
                .statusCode(403);

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .get("/{id}", bommel.id)
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
    void moveBommelWorksWithWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var child = bommels.getLast();
        var newParent = bommels.get(2);

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + child.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + newParent.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .put("/move/{id}/to/{newParent}", child.id, newParent.id)
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
    void moveBommelFailsWithoutWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var child = bommels.getLast();
        var oldParent = bommels.get(1);
        var newParent = bommels.get(2);

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + child.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .put("/move/{id}/to/{newParent}", child.id, newParent.id)
                .then()
                .statusCode(403);

        var updatedChild = bommelRepo.findById(child.id);
        bommelRepo.getEntityManager().refresh(updatedChild);
        assertEquals(oldParent.id, updatedChild.getParent().id);
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    void getChildrenRecursiveReturnsAllChildren() {
        var bommels = resourceCreator.setupSimpleTree();
        Bommel root = bommels.getFirst();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + root.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        List<TreeSearchBommel> treeSearchChildren = given()
                .when()
                .get("/{id}/children/recursive", root.id)
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
    void getChildrenReturnsAllDirectChildren() {
        var bommels = resourceCreator.setupSimpleTree();
        Bommel root = bommels.getFirst();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + root.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .get("/{id}/children", root.id)
                .then()
                .statusCode(200)
                .body("size()", is(2))
                .body("id", hasItems(bommels.get(1).id.intValue(), bommels.get(2).id.intValue()));
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    void deleteBommelDoesntWorkWithReadPermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .delete("/{id}", bommel.id)
                .then()
                .statusCode(403);

        assertEquals(bommels.size(), bommelRepo.count());
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    void deleteBommelWorksWithWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .delete("/{id}", bommel.id)
                .then()
                .statusCode(204);

        assertEquals(bommels.size() - 1, bommelRepo.count());
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    void getRootBommelTest() {
        // Arrange
        List<Bommel> existingBommels = resourceCreator.setupSimpleTree();
        var organization = orgRepo.findAll().firstResult();
        var rootBommel = existingBommels.getFirst();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + rootBommel.id, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        // Act
        given()
                .when()
                .get("/root/{orgId}", organization.getId())
                .then()
                .statusCode(200)
                .body("id", is(rootBommel.id.intValue()))
                .body("name", is(rootBommel.getName()));
    }

}
