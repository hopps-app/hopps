package app.hopps.category.api;

import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Two-level categories end to end: the hierarchy, hiding and booking rules on the API, plus export and import. Alice
 * belongs to organization 4.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(CategoryGroupResource.class)
class CategoryGroupHierarchyTest {

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    EntityManager entityManager;

    private Long rootBommelId;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        rootBommelId = QuarkusTransaction.requiringNew()
                .call(() -> organizationRepository.findById(4L).getRootBommel().id);
    }

    private static Map<String, Object> entry(String value, String parent, boolean bookable) {
        Map<String, Object> entry = new HashMap<>();
        entry.put("value", value);
        entry.put("parent", parent);
        entry.put("bookable", bookable);
        return entry;
    }

    private static Map<String, Object> entry(String value) {
        return entry(value, null, true);
    }

    private int createGroup(boolean required, List<Map<String, Object>> values) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("name", "Konten", "required", required, "bommelIds", List.of(rootBommelId),
                        "values", values, "reopenAffectedTransactions", false))
                .when()
                .post()
                .then()
                .statusCode(201)
                .extract()
                .path("id");
    }

    /** A group with one collecting parent and two children, plus a plain top-level value. */
    private int sampleGroup(boolean required) {
        return createGroup(required, List.of(
                entry("Einnahmen", null, false),
                entry("Beitrag", "Einnahmen", true),
                entry("Spende", "Einnahmen", true),
                entry("Sonstiges")));
    }

    private int valueId(int groupId, String value) {
        return given()
                .queryParam("query", value)
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .extract()
                .path("items.find { it.value == '" + value + "' }.id");
    }

    private void updateValue(int groupId, String value, Integer parentId, boolean bookable, boolean hidden,
            int expectedStatus) {
        Map<String, Object> body = new HashMap<>();
        body.put("parentId", parentId);
        body.put("bookable", bookable);
        body.put("hidden", hidden);
        given()
                .contentType(ContentType.JSON)
                .body(body)
                .when()
                .put("/" + groupId + "/values/" + valueId(groupId, value))
                .then()
                .statusCode(expectedStatus);
    }

    @Test
    void listsValuesInTreeOrderWithTheirSettings() {
        int groupId = sampleGroup(false);

        given()
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("total", is(4))
                .body("items.value", contains("Einnahmen", "Beitrag", "Spende", "Sonstiges"))
                .body("items[0].selectable", is(false))
                .body("items[0].childCount", is(2))
                .body("items[1].parentValue", is("Einnahmen"))
                .body("items[1].selectable", is(true))
                .body("items[3].parentId", nullValue());
    }

    @Test
    void searchingAParentFindsItsChildren() {
        int groupId = sampleGroup(false);

        given()
                .queryParam("query", "einnahmen")
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("total", is(3))
                .body("items.value", contains("Einnahmen", "Beitrag", "Spende"));
    }

    @Test
    void topLevelFilterOffersTheCandidatesForAParent() {
        int groupId = sampleGroup(false);

        given()
                .queryParam("topLevel", true)
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("items.value", contains("Einnahmen", "Sonstiges"));
    }

    @Test
    void hidingAParentHidesItsChildrenFromTheSelection() {
        int groupId = sampleGroup(false);
        updateValue(groupId, "Einnahmen", null, false, true, 200);

        given()
                .queryParam("selection", true)
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("total", is(1))
                .body("items.value", contains("Sonstiges"));

        // the administration still sees everything
        given()
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("total", is(4))
                .body("items[1].parentHidden", is(true))
                .body("items[1].selectable", is(false));
    }

    @Test
    void rejectsAThirdLevelInTheDialog() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("name", "Konten", "required", false, "bommelIds", List.of(rootBommelId),
                        "values", List.of(entry("A"), entry("B", "A", true), entry("C", "B", true)),
                        "reopenAffectedTransactions", false))
                .when()
                .post()
                .then()
                .statusCode(400);
    }

    @Test
    void rejectsAnUnknownParentInTheDialog() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("name", "Konten", "required", false, "bommelIds", List.of(rootBommelId),
                        "values", List.of(entry("B", "fehlt", true)), "reopenAffectedTransactions", false))
                .when()
                .post()
                .then()
                .statusCode(400);
    }

    @Test
    void rejectsMovesThatWouldNestDeeperOrCycle() {
        int groupId = sampleGroup(false);

        // a child cannot take children
        updateValue(groupId, "Sonstiges", valueId(groupId, "Beitrag"), true, false, 400);
        // a parent with children cannot move below another value
        updateValue(groupId, "Einnahmen", valueId(groupId, "Sonstiges"), false, false, 400);
        // a value cannot be its own parent
        updateValue(groupId, "Sonstiges", valueId(groupId, "Sonstiges"), true, false, 400);
    }

    @Test
    void addsValuesUnderAParent() {
        int groupId = sampleGroup(false);

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("values", List.of("Zuschuss"), "parentId", valueId(groupId, "Einnahmen")))
                .when()
                .post("/" + groupId + "/values")
                .then()
                .statusCode(200);

        given()
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("items.value", contains("Einnahmen", "Beitrag", "Spende", "Zuschuss", "Sonstiges"));
    }

    @Test
    void deletingAParentMovesItsChildrenToTheTopLevel() {
        int groupId = sampleGroup(false);

        given().when().delete("/" + groupId + "/values/" + valueId(groupId, "Einnahmen")).then().statusCode(204);

        given()
                .queryParam("topLevel", true)
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("items.value", containsInAnyOrder("Beitrag", "Spende", "Sonstiges"));
    }

    @Test
    void aMandatoryGroupKeepsAtLeastOneSelectableValue() {
        int groupId = createGroup(true, List.of(entry("Einzig"), entry("Sammlung", null, false)));

        updateValue(groupId, "Einzig", null, true, true, 409);
        updateValue(groupId, "Einzig", null, false, false, 409);

        // the refused change was rolled back
        given()
                .queryParam("query", "Einzig")
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("items[0].hidden", is(false))
                .body("items[0].bookable", is(true));
    }

    @Test
    void anOptionalGroupCanHideEverything() {
        int groupId = createGroup(false, List.of(entry("Einzig")));

        updateValue(groupId, "Einzig", null, true, true, 200);
    }

    @Test
    void reportRollsUpToTheParent() {
        int groupId = sampleGroup(false);
        persistBooking(groupId, "Beitrag", "10.00");
        persistBooking(groupId, "Spende", "20.00");
        persistBooking(groupId, "Sonstiges", "-5.00");

        given()
                .when()
                .get("/" + groupId + "/report")
                .then()
                .statusCode(200)
                .body("rows.value", contains("Einnahmen", "Sonstiges"))
                .body("rows[0].income", is(30.0f))
                .body("rows[0].count", is(2))
                .body("rows[0].children.value", contains("Beitrag", "Spende"))
                .body("rows[1].children.size()", is(0))
                .body("totalCount", is(3));
    }

    @Test
    void filteringByAParentFindsTheBookingsBelowIt() {
        int groupId = sampleGroup(false);
        persistBooking(groupId, "Beitrag", "10.00");
        persistBooking(groupId, "Sonstiges", "-5.00");

        given()
                .basePath("")
                .queryParam("categoryValue", groupId + ":Einnahmen")
                .when()
                .get("/transactions")
                .then()
                .statusCode(200)
                .body("size()", is(1))
                .body("[0].total", is(10.0f));
    }

    @Test
    void exportContainsHierarchyAndSettingsButNoBommels() {
        int groupId = sampleGroup(false);
        updateValue(groupId, "Sonstiges", null, true, true, 200);

        given()
                .when()
                .get("/" + groupId + "/export")
                .then()
                .statusCode(200)
                .body("formatVersion", is(1))
                .body("sourceKey", notNullValue())
                .body("name", is("Konten"))
                .body("bommelIds", nullValue())
                .body("values.value", contains("Einnahmen", "Beitrag", "Spende", "Sonstiges"))
                .body("values[0].bookable", is(false))
                .body("values[1].parent", is("Einnahmen"))
                .body("values[3].hidden", is(true));
    }

    @Test
    void theSourceKeyStaysTheSameAcrossExports() {
        int groupId = sampleGroup(false);

        String first = given().when().get("/" + groupId + "/export").then().extract().path("sourceKey");
        String second = given().when().get("/" + groupId + "/export").then().extract().path("sourceKey");

        assertEquals(first, second);
    }

    private static Map<String, Object> file(String sourceKey, List<Map<String, Object>> values) {
        return Map.of("formatVersion", 1, "sourceKey", sourceKey, "name", "Vorgabe", "required", false,
                "values", values);
    }

    private io.restassured.response.ValidatableResponse importFile(Map<String, Object> file) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("file", file, "bommelIds", List.of(rootBommelId), "reopenAffectedTransactions", false))
                .when()
                .post("/import")
                .then();
    }

    @Test
    void importCreatesAGroupWithHierarchyAndChosenBommels() {
        int groupId = importFile(file("vorgabe-1", List.of(entry("Einnahmen", null, false), entry("Beitrag",
                "Einnahmen", true))))
                        .statusCode(200)
                        .body("created", is(true))
                        .body("addedValues", is(2))
                        .body("group.name", is("Vorgabe"))
                        .body("group.sourceKey", is("vorgabe-1"))
                        .body("group.bommelIds", contains(rootBommelId.intValue()))
                        .extract()
                        .path("group.id");

        given()
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("items.value", contains("Einnahmen", "Beitrag"))
                .body("items[0].bookable", is(false))
                .body("items[1].parentValue", is("Einnahmen"));
    }

    @Test
    void importingAgainExtendsTheGroupAndKeepsOwnChanges() {
        int groupId = importFile(file("vorgabe-1", List.of(entry("Einnahmen", null, false), entry("Beitrag",
                "Einnahmen", true)))).statusCode(200).extract().path("group.id");

        // the organization makes it its own
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("values", List.of("Eigene")))
                .when()
                .post("/" + groupId + "/values")
                .then()
                .statusCode(200);
        updateValue(groupId, "Beitrag", valueId(groupId, "Einnahmen"), true, true, 200);

        importFile(file("vorgabe-1", List.of(entry("Einnahmen", null, false), entry("Beitrag", "Einnahmen", true),
                entry("Spende", "Einnahmen", true))))
                        .statusCode(200)
                        .body("created", is(false))
                        .body("addedValues", is(1))
                        .body("group.id", is(groupId));

        given()
                .when()
                .get("/" + groupId + "/values")
                .then()
                .statusCode(200)
                .body("total", is(4))
                .body("items.value", contains("Einnahmen", "Beitrag", "Spende", "Eigene"))
                .body("items[1].hidden", is(true));
    }

    @Test
    void anExportedGroupImportedByItsOwnOrganizationAddsNothing() {
        int groupId = sampleGroup(false);
        Map<String, Object> exported = given().when().get("/" + groupId + "/export").then().extract().path("$");

        importFile(exported)
                .statusCode(200)
                .body("created", is(false))
                .body("addedValues", is(0));
    }

    @Test
    void rejectsAnUnsupportedFile() {
        Map<String, Object> newerFormat = new HashMap<>(file("vorgabe-1", List.of(entry("A"))));
        newerFormat.put("formatVersion", 99);
        importFile(newerFormat).statusCode(400);

        Map<String, Object> noName = new HashMap<>(file("vorgabe-1", List.of(entry("A"))));
        noName.put("name", " ");
        importFile(noName).statusCode(400);
    }

    private void persistBooking(int groupId, String value, String total) {
        QuarkusTransaction.requiringNew().run(() -> {
            Organization organization = organizationRepository.findById(4L);
            Transaction transaction = new Transaction();
            transaction.setOrganization(organization);
            transaction.setCreatedBy("alice@example.test");
            transaction.setStatus(TransactionStatus.CONFIRMED);
            transaction.setName("Buchung " + value);
            transaction.setTotal(new BigDecimal(total));
            transaction.setTransactionTime(java.time.Instant.parse("2026-06-01T10:00:00Z"));
            transaction.setBommel(organization.getRootBommel());
            transaction.replaceCategoryValues(Map.of((long) groupId, value));
            entityManager.persist(transaction);
        });
    }
}
