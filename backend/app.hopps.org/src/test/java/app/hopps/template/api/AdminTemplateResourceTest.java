package app.hopps.template.api;

import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class AdminTemplateResourceTest {

    private static final String PATH = "/admin/templates";

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    private static Map<String, Object> request(String name, List<String> values) {
        return Map.of(
                "name", name,
                "description", "Beschreibung",
                "active", true,
                "required", false,
                "values", values);
    }

    private static int create(String name, List<String> values) {
        return given()
                .contentType(ContentType.JSON)
                .body(request(name, values))
                .when()
                .post(PATH + "/category-groups")
                .then()
                .statusCode(201)
                .extract()
                .path("id");
    }

    @Test
    @DisplayName("should reject anonymous access with 401")
    void shouldRejectAnonymous() {
        given().when().get(PATH).then().statusCode(401);
    }

    @Test
    @DisplayName("should reject a non-admin user with 403")
    @TestSecurity(user = "member@example.test", roles = { "user" })
    void shouldRejectNonAdmin() {
        given().when().get(PATH).then().statusCode(403);
    }

    @Test
    @DisplayName("should create a category group template and list it")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldCreateAndList() {
        // blanks are skipped, values trimmed, duplicates dropped
        int id = create("Kostenstelle", List.of(" Verwaltung ", "Jugend", "", "Jugend", "Veranstaltungen"));

        given()
                .when()
                .get(PATH + "/category-groups/" + id)
                .then()
                .statusCode(200)
                .body("name", is("Kostenstelle"))
                .body("values", contains("Verwaltung", "Jugend", "Veranstaltungen"))
                .body("usageCount", is(0))
                .body("createdAt", notNullValue());

        given()
                .when()
                .get(PATH)
                .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].type", is("CATEGORY_GROUP"))
                .body("[0].itemCount", is(3));
    }

    @Test
    @DisplayName("should replace the values on update")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReplaceValues() {
        int id = create("Projekt", List.of("A", "B", "C"));

        given()
                .contentType(ContentType.JSON)
                .body(request("Projekte", List.of("C", "D", "A")))
                .when()
                .put(PATH + "/category-groups/" + id)
                .then()
                .statusCode(200)
                .body("name", is("Projekte"))
                .body("values", contains("C", "D", "A"));
    }

    @Test
    @DisplayName("should append new templates and reorder them")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldReorder() {
        int a = create("A", List.of("1"));
        create("B", List.of("1"));
        int c = create("C", List.of("1"));

        given().when().get(PATH).then().statusCode(200).body("name", contains("A", "B", "C"));

        // c is moved to the front; b is not listed and goes last
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("ids", List.of(c, a)))
                .when()
                .put(PATH + "/order")
                .then()
                .statusCode(204);

        given().when().get(PATH).then().statusCode(200).body("name", contains("C", "A", "B"));
    }

    @Test
    @DisplayName("should reject a template without a name")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldRejectBlankName() {
        given()
                .contentType(ContentType.JSON)
                .body(request(" ", List.of("A")))
                .when()
                .post(PATH + "/category-groups")
                .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("should delete a template")
    @TestSecurity(user = "admin@example.test", roles = { "admin" })
    void shouldDelete() {
        int id = create("Weg damit", List.of("A"));

        given().when().delete(PATH + "/" + id).then().statusCode(204);
        given().when().get(PATH + "/category-groups/" + id).then().statusCode(404);
        given().when().delete(PATH + "/" + id).then().statusCode(404);
    }
}
