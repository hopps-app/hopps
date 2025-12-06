package app.hopps.bommel.api;

import app.hopps.bommel.api.BommelResource;
import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.domain.TreeSearchBommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.bommel.domain.BommelTestResourceCreator;
import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.model.TupleKey;
import io.quarkus.test.InjectMock;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Objects;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    void setup() {
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
    @Disabled("Openfga is needed")
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
    @Disabled("Openfga is needed")
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
    @Disabled("Openfga is needed")
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
    @Disabled("Openfga is needed")
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
    @Disabled("Openfga is needed")
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
        var initialBommelSize = bommelRepo.count();

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + bommel.id, "write", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .delete("/{id}", bommel.id)
                .then()
                .statusCode(204);

        assertEquals(initialBommelSize - 1, bommelRepo.count());
    }

    @Test
    @TestSecurity(user = "test")
    @TestTransaction
    void getRootBommelTest() {
        var organization = orgRepo.findBySlug("gruenes-herz-ev"); // id=2 from migration
        var rootBommelId = 2L; // From migration: rootBommel_id=2

        Mockito.when(authModelClient.check(TupleKey.of("bommel:" + rootBommelId, "read", "user:test")))
                .thenReturn(Uni.createFrom().item(true));

        // Act
        given()
                .when()
                .get("/root/{orgId}", organization.getId())
                .then()
                .statusCode(200)
                .body("id", is(2))
                .body("name", is("Grünes Herz e.V."));
    }

}
