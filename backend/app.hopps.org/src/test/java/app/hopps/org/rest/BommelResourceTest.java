package app.hopps.org.rest;

import app.hopps.commons.fga.FgaRelations;
import app.hopps.commons.fga.FgaTypes;
import app.hopps.org.jpa.Bommel;
import app.hopps.org.jpa.BommelRepository;
import app.hopps.org.jpa.BommelTestResourceCreator;
import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import app.hopps.org.jpa.TreeSearchBommel;
import io.quarkiverse.zanzibar.Relationship;
import io.quarkiverse.zanzibar.RelationshipManager;
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
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;

@QuarkusTest
@TestSecurity(user = "test")
@TestHTTPEndpoint(BommelResource.class)
class BommelResourceTest {

    @Inject
    BommelRepository bommelRepo;

    @Inject
    OrganizationRepository orgRepo;

    @Inject
    BommelTestResourceCreator resourceCreator;

    @InjectMock
    RelationshipManager relationshipManager;

    @BeforeEach
    @Transactional
    void setup() {
        orgRepo.deleteAll();
        bommelRepo.deleteAll();

        Mockito.when(relationshipManager.check(any(Relationship.class)))
                .thenReturn(Uni.createFrom().item(false));
    }

    @Test
    @TestTransaction
    void shouldNotFindRoot() {
        Organization organization = resourceCreator.setupOrganization();

        Relationship relationship = new Relationship(FgaTypes.ORGANIZATION.getFgaName(), organization.getSlug(),
                FgaRelations.MEMBER.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(relationship))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .get("/root/{slug}", organization.getSlug())
                .then()
                .statusCode(404)
                .body(is("Bommel not found"));
    }

    @Test
    @TestTransaction
    void shouldNotBeAllowedToCreateBommel() {
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
    }

    @Test
    @TestTransaction
    void shouldBeAllowedToCreateBommel() {
        var bommels = resourceCreator.setupSimpleTree();
        var parent = bommels.getLast();

        // Give read permissions
        Relationship relationship = new Relationship(FgaTypes.BOMMEL.getFgaName(), parent.id.toString(),
                FgaRelations.BOMMELWART.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(relationship))
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
    @TestTransaction
    void shouldNotBeAllowedToUpdateBommel() {
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
    }

    @Test
    @TestTransaction
    void shouldBeAllowedToUpdateBommel() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        // Give write permissions
        Relationship relationship = new Relationship(FgaTypes.BOMMEL.getFgaName(), bommel.id.toString(),
                FgaRelations.BOMMELWART.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(relationship))
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
    @TestTransaction
    void shouldNotBeAllowedToFetchBommelById() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        given()
                .when()
                .get("/{id}", bommel.id)
                .then()
                .statusCode(403);
    }

    @Test
    @TestTransaction
    void shouldBeAllowedToFetchBommelById() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        given()
                .when()
                .get("/{id}", bommel.id)
                .then()
                .statusCode(403);

        Relationship relationship = new Relationship(FgaTypes.BOMMEL.getFgaName(), bommel.id.toString(),
                FgaRelations.MEMBER.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(relationship))
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
    @TestTransaction
    void moveBommelWorksWithWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var child = bommels.getLast();
        var newParent = bommels.get(2);

        Relationship oldBommel = new Relationship(FgaTypes.BOMMEL.getFgaName(), child.id.toString(),
                FgaRelations.BOMMELWART.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(oldBommel))
                .thenReturn(Uni.createFrom().item(true));

        Relationship newBommel = new Relationship(FgaTypes.BOMMEL.getFgaName(), newParent.id.toString(),
                FgaRelations.BOMMELWART.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(newBommel))
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
    @TestTransaction
    void shouldFailMovingWithInsufficientPermission() {
        var bommels = resourceCreator.setupSimpleTree();
        var child = bommels.getLast();
        var oldParent = bommels.get(1);
        var newParent = bommels.get(2);

        Relationship oldBommel = new Relationship(FgaTypes.BOMMEL.getFgaName(), child.id.toString(),
                FgaRelations.BOMMELWART.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(oldBommel))
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
    @TestTransaction
    void getChildrenRecursiveReturnsAllChildren() {
        var bommels = resourceCreator.setupSimpleTree();
        Bommel root = bommels.getFirst();

        Relationship oldBommel = new Relationship(FgaTypes.BOMMEL.getFgaName(), root.id.toString(),
                FgaRelations.MEMBER.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(oldBommel))
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
    @TestTransaction
    void getChildrenReturnsAllDirectChildren() {
        var bommels = resourceCreator.setupSimpleTree();
        Bommel root = bommels.getFirst();

        Relationship oldBommel = new Relationship(FgaTypes.BOMMEL.getFgaName(), root.id.toString(),
                FgaRelations.MEMBER.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(oldBommel))
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
    @TestTransaction
    void shouldNotBeAbleToDeleteBommelAsMember() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        Relationship oldBommel = new Relationship(FgaTypes.BOMMEL.getFgaName(), bommel.id.toString(),
                FgaRelations.MEMBER.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(oldBommel))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .delete("/{id}", bommel.id)
                .then()
                .statusCode(403);

        assertEquals(bommels.size(), bommelRepo.count());
    }

    @Test
    @TestTransaction
    void deleteBommelWorksWithWritePermissions() {
        var bommels = resourceCreator.setupSimpleTree();
        var bommel = bommels.getLast();

        Relationship relationship = new Relationship(FgaTypes.BOMMEL.getFgaName(), bommel.id.toString(),
                FgaRelations.BOMMELWART.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(relationship))
                .thenReturn(Uni.createFrom().item(true));

        given()
                .when()
                .delete("/{id}", bommel.id)
                .then()
                .statusCode(204);

        assertEquals(bommels.size() - 1, bommelRepo.count());
    }

    @Test
    @TestTransaction
    void getRootBommelTest() {
        // Arrange
        List<Bommel> existingBommels = resourceCreator.setupSimpleTree();
        var organization = orgRepo.findAll().firstResult();
        var rootBommel = existingBommels.getFirst();

        Relationship relationship = new Relationship(FgaTypes.ORGANIZATION.getFgaName(), organization.getSlug(),
                FgaRelations.MEMBER.getFgaName(), FgaTypes.USER.getFgaName(), "test");

        Mockito.when(relationshipManager.check(relationship))
                .thenReturn(Uni.createFrom().item(true));

        // Act
        given()
                .when()
                .get("/root/{slug}", organization.getSlug())
                .then()
                .statusCode(200)
                .body("id", is(rootBommel.id.intValue()))
                .body("name", is(rootBommel.getName()));
    }

}
