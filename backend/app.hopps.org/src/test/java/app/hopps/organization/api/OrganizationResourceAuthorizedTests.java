package app.hopps.organization.api;

import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.MemberStatus;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.api.OrganizationResource;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.keycloak.admin.client.Keycloak;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@TestHTTPEndpoint(OrganizationResource.class)
class OrganizationResourceAuthorizedTests {

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    MemberRepository memberRepository;

    @Inject
    Keycloak keycloak;

    @Inject
    @ConfigProperty(name = "app.hopps.org.auth.realm-name")
    String realmName;

    @BeforeEach
    void cleanDatabase() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
    }

    @Test
    @DisplayName("should return Organization of current user")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldReturnMyOrg() {

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .get("my")
                .then()
                .statusCode(200)
                .body("name", is("Grünes Herz e.V."));
    }

    @Test
    @DisplayName("should create an organization for an authenticated user that has none yet")
    @TestSecurity(user = "founder@example.test")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            @Claim(key = "email", value = "founder@example.test"),
            @Claim(key = "given_name", value = "Frieda"),
            @Claim(key = "family_name", value = "Founder")
    })
    void shouldCreateOrganizationForUserWithoutOrg() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\": \"Neuer Verein e.V.\", \"slug\": \"neuer-verein-ev\", \"type\": \"EINGETRAGENER_VEREIN\"}")
                .when()
                .post("my")
                .then()
                .statusCode(201)
                .body("slug", is("neuer-verein-ev"));

        // The organization is now linked to the user (member created from the JWT) and becomes their default.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .get("my")
                .then()
                .statusCode(200)
                .body("slug", is("neuer-verein-ev"));
    }

    @Test
    @DisplayName("should reject creating an organization when the user already has one")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldRejectSecondOrganization() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\": \"Zweiter Verein e.V.\", \"slug\": \"zweiter-verein-ev\", \"type\": \"EINGETRAGENER_VEREIN\"}")
                .when()
                .post("my")
                .then()
                .statusCode(409);
    }

    @Test
    @DisplayName("should add a member to the current user's organization")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldAddMemberToMyOrganization() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"firstName": "Kim", "lastName": "Rakete", "email": "kim.rakete@example.test",
                         "position": "Kassenwart"}
                        """)
                .when()
                .post("my/members")
                .then()
                .statusCode(201)
                .body("email", is("kim.rakete@example.test"))
                .body("position", is("Kassenwart"))
                // The account is provisioned, but Dev Services builds the test realm without an SMTP server, so the
                // invitation mail cannot go out. That must not fail the request — it is reported through the status.
                .body("status", is("INVITATION_FAILED"));

        // The new member shows up in the organization's member list.
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .get("gruenes-herz-ev/members")
                .then()
                .statusCode(200)
                .body("email", hasItem("kim.rakete@example.test"));

        // A Keycloak account now exists for them, which is what makes the login possible in the first place.
        assertThat(keycloak.realm(realmName).users().searchByEmail("kim.rakete@example.test", true), hasSize(1));
    }

    @Test
    @DisplayName("should list seeded members as active")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldReportSeededMembersAsActive() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .when()
                .get("gruenes-herz-ev/members")
                .then()
                .statusCode(200)
                .body("find { it.email == 'emanuel_urban@domain.none' }.status", is("ACTIVE"));
    }

    @Test
    @DisplayName("should mark an invited member active once they show up with a token")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldMarkInvitedMemberActiveOnFirstAuthenticatedRequest() {
        // Put the seeded member back into the state an invited person is in before they have ever logged in.
        QuarkusTransaction.requiringNew()
                .run(() -> memberRepository.update("status = ?1 where email = ?2", MemberStatus.INVITED,
                        "emanuel_urban@domain.none"));

        // Any authenticated request will do — this one resolves the member through SecurityUtils.
        given()
                .when()
                .get("my")
                .then()
                .statusCode(200);

        assertEquals(MemberStatus.ACTIVE, memberRepository.findByEmail("emanuel_urban@domain.none").getStatus());
    }

    @Test
    @DisplayName("should store no position when it is left empty")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldAcceptMemberWithoutPosition() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"firstName\": \"Kim\", \"lastName\": \"Rakete\", \"email\": \"no-position@example.test\", \"position\": \"  \"}")
                .when()
                .post("my/members")
                .then()
                .statusCode(201)
                .body("position", is(nullValue()));
    }

    @Test
    @DisplayName("should reject a member whose email is already taken")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldRejectDuplicateMemberEmail() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"firstName\": \"Emanuel\", \"lastName\": \"Urban\", \"email\": \"emanuel_urban@domain.none\"}")
                .when()
                .post("my/members")
                .then()
                .statusCode(409)
                .body("conflictingFields", hasItem("email"));
    }

    @Test
    @DisplayName("should reject a member with an invalid email")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldRejectMemberWithInvalidEmail() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"firstName\": \"Kim\", \"lastName\": \"Rakete\", \"email\": \"not-an-email\"}")
                .when()
                .post("my/members")
                .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("should reject a member without a first name")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldRejectMemberWithoutFirstName() {
        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"lastName\": \"Rakete\", \"email\": \"kim.rakete@example.test\"}")
                .when()
                .post("my/members")
                .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("should update root bommel name when organization name changes")
    @TestSecurity(user = "emanuel_urban@domain.none")
    @OidcSecurity(claims = {
            @Claim(key = "sub", value = "00000000-0000-0000-0000-000000000002")
    })
    void shouldUpdateRootBommelNameOnOrgNameChange() {

        String newName = "Neuer Vereinsname e.V.";

        given()
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\": \"" + newName + "\"}")
                .when()
                .put("my")
                .then()
                .statusCode(200)
                .body("name", is(newName));

        var organization = organizationRepository.findBySlug("gruenes-herz-ev");
        var rootBommel = organization.getRootBommel();
        assertEquals(newName, rootBommel.getName());
    }
}
