package app.hopps.category.api;

import app.hopps.category.domain.CategoryGroup;
import app.hopps.category.repository.CategoryGroupRepository;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.template.domain.CategoryGroupTemplate;
import app.hopps.template.repository.CategoryGroupTemplateRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Covers the category group templates seen by an organization: listing them, loading one to pre-fill the create dialog,
 * and creating a group that records the template as its origin. Alice belongs to organization 4.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
@TestHTTPEndpoint(CategoryGroupResource.class)
class CategoryGroupTemplateEndpointsTest {

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    CategoryGroupTemplateRepository templateRepository;

    @Inject
    CategoryGroupRepository categoryGroupRepository;

    @Inject
    OrganizationRepository organizationRepository;

    private Long activeId;
    private Long inactiveId;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        activeId = QuarkusTransaction.requiringNew()
                .call(() -> persist("SKR 49", true, true, List.of("1000", "2000", "3000", "4000", "5000", "6000")));
        inactiveId = QuarkusTransaction.requiringNew()
                .call(() -> persist("Entwurf", false, false, List.of("X")));
    }

    private Long persist(String name, boolean active, boolean required, List<String> values) {
        CategoryGroupTemplate template = new CategoryGroupTemplate();
        template.setName(name);
        template.setActive(active);
        template.setRequired(required);
        template.replaceValues(values);
        templateRepository.persist(template);
        return template.getId();
    }

    @Test
    void listsOnlyActiveTemplatesWithPreview() {
        given()
                .when()
                .get("/templates")
                .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].name", is("SKR 49"))
                .body("[0].required", is(true))
                .body("[0].valueCount", is(6))
                .body("[0].previewValues", contains("1000", "2000", "3000", "4000", "5000"))
                .body("[0].addedGroupId", nullValue());
    }

    @Test
    void returnsAllValuesToPrefillTheDialog() {
        given()
                .when()
                .get("/templates/" + activeId)
                .then()
                .statusCode(200)
                .body("name", is("SKR 49"))
                .body("required", is(true))
                .body("values", contains("1000", "2000", "3000", "4000", "5000", "6000"));
    }

    @Test
    void hidesInactiveOrUnknownTemplates() {
        given().when().get("/templates/" + inactiveId).then().statusCode(404);
        given().when().get("/templates/999999").then().statusCode(404);
    }

    @Test
    void createRecordsTheTemplateAndAllowsReuse() {
        int groupId = createFromTemplate(activeId).statusCode(201)
                .body("templateId", is(activeId.intValue()))
                .extract()
                .path("id");

        given()
                .when()
                .get("/templates")
                .then()
                .statusCode(200)
                .body("[0].addedGroupId", is(groupId));

        // templates stay an option: the same one can be used again
        createFromTemplate(activeId).statusCode(201);
    }

    @Test
    void createRejectsAnInactiveTemplate() {
        createFromTemplate(inactiveId).statusCode(404);
    }

    @Test
    void groupSurvivesTemplateDeletion() {
        int groupId = createFromTemplate(activeId).statusCode(201).extract().path("id");

        QuarkusTransaction.requiringNew().run(() -> templateRepository.delete(templateRepository.findById(activeId)));

        QuarkusTransaction.requiringNew().run(() -> {
            CategoryGroup group = categoryGroupRepository.findById((long) groupId);
            assertNull(group.getTemplateId());
            assertEquals(2, group.getValues().size());
        });
    }

    /** Creates a group the way the dialog does after being pre-filled from a template, on the root bommel. */
    private ValidatableResponse createFromTemplate(Long templateId) {
        Long rootBommelId = QuarkusTransaction.requiringNew()
                .call(() -> organizationRepository.findById(4L).getRootBommel().id);
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "name", "SKR 49",
                        "required", false,
                        "bommelIds", List.of(rootBommelId),
                        "values", List.of("1000", "2000"),
                        "reopenAffectedTransactions", false,
                        "templateId", templateId))
                .when()
                .post()
                .then();
    }
}
