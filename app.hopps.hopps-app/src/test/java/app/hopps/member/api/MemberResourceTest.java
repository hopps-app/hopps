package app.hopps.member.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.containsString;
import static org.hamcrest.CoreMatchers.not;

import org.junit.jupiter.api.Test;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

@QuarkusTest
class MemberResourceTest
{
	@Inject
	MemberRepository memberRepository;

	@Inject
	BommelRepository bommelRepository;

	@Test
	void shouldShowEmptyStateWhenNoMembersExist()
	{
		deleteAllData();

		given()
			.when()
			.get("/mitglieder")
			.then()
			.statusCode(200)
			.body(containsString("Noch keine Mitglieder vorhanden"))
			.body(containsString("Erstes Mitglied anlegen"));
	}

	@Test
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
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createMember(String firstName, String lastName, String email, String phone)
	{
		Member member = new Member();
		member.setFirstName(firstName);
		member.setLastName(lastName);
		member.setEmail(email);
		member.setPhone(phone);
		memberRepository.persist(member);
		return member.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createBommelWithWart(String title, Long memberId)
	{
		Member member = memberRepository.findById(memberId);
		Bommel bommel = new Bommel();
		bommel.setIcon("folder");
		bommel.setTitle(title);
		bommel.setResponsibleMember(member);
		bommelRepository.persist(bommel);
		return bommel.getId();
	}
}
