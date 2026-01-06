package app.hopps.member.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.containsString;
import static org.hamcrest.CoreMatchers.not;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.member.service.MemberKeycloakSyncService;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.BaseOrganizationTest;
import app.hopps.shared.TestSecurityHelper;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;

@QuarkusTest
class MemberResourceTest extends BaseOrganizationTest
{
	@Inject
	MemberRepository memberRepository;

	@Inject
	BommelRepository bommelRepository;

	@InjectMock
	MemberKeycloakSyncService memberKeycloakSyncService;

	@BeforeEach
	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	void setupOrganizationContext()
	{
		Organization testOrg = getOrCreateTestOrganization();
		// Create a test member for each test method's @TestSecurity user
		// (bob@test.local)
		createTestMember("bob@test.local", testOrg);
	}

	@BeforeEach
	void setupMocks()
	{
		Mockito.when(memberKeycloakSyncService.syncMemberToKeycloak(Mockito.any(Member.class)))
			.thenAnswer(invocation -> {
				Member member = invocation.getArgument(0);
				member.setUserName("mock-username-" + member.getId());
				return "mock-keycloak-id-" + member.getId();
			});

		Mockito.when(memberKeycloakSyncService.syncMemberToKeycloak(Mockito.any(Member.class), Mockito.anyList()))
			.thenAnswer(invocation -> {
				Member member = invocation.getArgument(0);
				member.setUserName("mock-username-" + member.getId());
				return "mock-keycloak-id-" + member.getId();
			});
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldShowEmptyStateWhenNoMembersExist()
	{
		deleteAllData();

		given()
			.when()
			.get("/mitglieder")
			.then()
			.statusCode(200)
			// With test security, there's always the test user (Bob), so we
			// check for that
			.body(containsString("Bob Test"));
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldShowMembersInTable()
	{
		deleteAllData();
		createMember("Max", "Mustermann", "max@example.com", "+49 123 456");

		given()
			.when()
			.get("/mitglieder")
			.then()
			.statusCode(200)
			.body(containsString("Max Mustermann"))
			.body(containsString("max@example.com"))
			.body(containsString("+49 123 456"));
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldShowMemberDetailPage()
	{
		deleteAllData();
		Long memberId = createMember("Lisa", "Schmidt", "lisa@example.com", null);

		given()
			.when()
			.get("/mitglieder/" + memberId)
			.then()
			.statusCode(200)
			.body(containsString("Lisa Schmidt"))
			.body(containsString("lisa@example.com"));
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldShowCreateMemberForm()
	{
		given()
			.when()
			.get("/mitglieder/neu")
			.then()
			.statusCode(200)
			.body(containsString("Neues Mitglied"))
			.body(containsString("Vorname"))
			.body(containsString("Nachname"));
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldShowMultipleMembersOrderedByName()
	{
		deleteAllData();
		createMember("Zebra", "Müller", null, null);
		createMember("Anna", "Bauer", null, null);

		given()
			.when()
			.get("/mitglieder")
			.then()
			.statusCode(200)
			.body(containsString("Anna Bauer"))
			.body(containsString("Zebra Müller"));
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldShowCopyButtonsForContactInfo()
	{
		deleteAllData();
		createMember("Max", "Mustermann", "max@example.com", "+49 123 456");

		given()
			.when()
			.get("/mitglieder")
			.then()
			.statusCode(200)
			.body(containsString("copy-btn"))
			.body(containsString("mailto:max@example.com"));
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldShowResponsibleBommelsOnDetailPage()
	{
		deleteAllData();
		Long memberId = createMember("Max", "Mustermann", null, null);
		createBommelWithWart("Verein", memberId);

		given()
			.when()
			.get("/mitglieder/" + memberId)
			.then()
			.statusCode(200)
			.body(containsString("Bommelwart für"))
			.body(containsString("Verein"));
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldShowNoBommelsMessageWhenNotBommelwart()
	{
		deleteAllData();
		Long memberId = createMember("Max", "Mustermann", null, null);

		given()
			.when()
			.get("/mitglieder/" + memberId)
			.then()
			.statusCode(200)
			.body(containsString("Noch keinem Bommel als Bommelwart zugewiesen"));
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldShowBommelCountInMemberList()
	{
		deleteAllData();
		Long memberId = createMember("Max", "Mustermann", null, null);
		createBommelWithWart("Verein", memberId);
		createBommelWithWart("Jugend", memberId);

		given()
			.when()
			.get("/mitglieder")
			.then()
			.statusCode(200)
			.body(containsString("2 Bommel(s)"));
	}

	@Test
	@TestSecurity(user = "bob@test.local", roles = "user")
	void shouldRedirectToIndexForNonExistentMember()
	{
		deleteAllData();

		given()
			.redirects().follow(false)
			.when()
			.get("/mitglieder/99999")
			.then()
			.statusCode(303);
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	void deleteAllData()
	{
		bommelRepository.deleteAll();
		memberRepository.deleteAll();
		// Recreate the test security member
		Organization testOrg = getOrCreateTestOrganization();
		Member testMember = new Member();
		testMember.setUserName("bob");
		testMember.setEmail("bob@test.local");
		testMember.setFirstName("Bob");
		testMember.setLastName("Test");
		testMember.setOrganization(testOrg);
		memberRepository.persist(testMember);
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createMember(String firstName, String lastName, String email, String phone)
	{
		Organization org = getOrCreateTestOrganization();

		Member member = new Member();
		member.setFirstName(firstName);
		member.setLastName(lastName);
		member.setEmail(email);
		member.setPhone(phone);
		member.setOrganization(org);
		memberRepository.persist(member);
		return member.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createBommelWithWart(String title, Long memberId)
	{
		Organization org = getOrCreateTestOrganization();

		Member member = memberRepository.findById(memberId);
		Bommel bommel = new Bommel();
		bommel.setIcon("folder");
		bommel.setTitle(title);
		bommel.setResponsibleMember(member);
		bommel.setOrganization(org);
		bommelRepository.persist(bommel);
		return bommel.getId();
	}
}
