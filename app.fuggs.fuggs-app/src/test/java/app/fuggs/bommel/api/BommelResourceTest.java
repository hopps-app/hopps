package app.fuggs.bommel.api;

import app.fuggs.bommel.domain.Bommel;
import app.fuggs.bommel.repository.BommelRepository;
import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.BaseOrganizationTest;
import app.fuggs.shared.TestSecurityHelper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.containsString;
import static org.hamcrest.CoreMatchers.not;

@QuarkusTest
@TestSecurity(user = TestSecurityHelper.TEST_USER_MARIA, roles = "user")
class BommelResourceTest extends BaseOrganizationTest
{
	@BeforeEach
	@Transactional(Transactional.TxType.REQUIRES_NEW)
	void setupOrganizationContext()
	{
		// Use the bootstrap organization that maria is associated with
		Organization org = organizationRepository.findBySlug("musikverein-harmonie");
		if (org == null)
		{
			// Fallback to test org if bootstrap didn't run
			org = getOrCreateTestOrganization();
			createTestMember(TestSecurityHelper.TEST_USER_MARIA, org);
		}
	}

	@Inject
	BommelRepository bommelRepository;

	@Test
	void shouldShowCreateRootFormWhenNoBommelsExist()
	{
		deleteAllBommels();

		given()
			.when()
			.get("/bommels")
			.then()
			.statusCode(200)
			.body(containsString("Wurzel-Bommel erstellen"))
			.body(containsString("Noch keine Bommels vorhanden"));
	}

	@Test
	void shouldShowTreeViewWithBommelTitle()
	{
		deleteAllBommels();
		createRootBommel("home", "Verein");

		given()
			.when()
			.get("/bommels")
			.then()
			.statusCode(200)
			.body(containsString("cds-tree-view"))
			.body(containsString("Verein"));
	}

	@Test
	void shouldShowEditFormWhenBommelSelected()
	{
		deleteAllBommels();
		Long rootId = createRootBommel("home", "Verein");

		given()
			.when()
			.get("/bommels?selectedId=" + rootId)
			.then()
			.statusCode(200)
			.body(containsString("Bearbeiten: Verein"))
			.body(containsString("Kind hinzufügen zu Verein"));
	}

	@Test
	void shouldReturn404ForInvalidSelectedId()
	{
		deleteAllBommels();
		createRootBommel("home", "Verein");

		given()
			.when()
			.get("/bommels?selectedId=invalid-id")
			.then()
			.statusCode(404);
	}

	@Test
	void shouldShowNoSelectionForNonExistentId()
	{
		deleteAllBommels();
		createRootBommel("home", "Verein");

		given()
			.when()
			.get("/bommels?selectedId=99999")
			.then()
			.statusCode(200)
			.body(containsString("Klicken Sie auf einen Bommel"));
	}

	@Test
	void shouldDisableDeleteButtonWhenBommelHasChildren()
	{
		deleteAllBommels();
		Long rootId = createRootBommel("home", "Verein");
		createChildBommel(rootId, "group", "Jugend");

		given()
			.when()
			.get("/bommels?selectedId=" + rootId)
			.then()
			.statusCode(200)
			.body(containsString("kann nicht gelöscht werden"));
	}

	@Test
	void shouldShowChildBommelsInTree()
	{
		deleteAllBommels();
		Long rootId = createRootBommel("home", "Verein");
		createChildBommel(rootId, "group", "Jugend");
		createChildBommel(rootId, "music", "Orchester");

		given()
			.when()
			.get("/bommels")
			.then()
			.statusCode(200)
			.body(containsString("Verein"))
			.body(containsString("Jugend"))
			.body(containsString("Orchester"));
	}

	@Test
	void shouldEnableDeleteButtonWhenBommelHasNoChildren()
	{
		deleteAllBommels();
		Long rootId = createRootBommel("home", "Verein");
		Long childId = createChildBommel(rootId, "group", "Jugend");

		given()
			.when()
			.get("/bommels?selectedId=" + childId)
			.then()
			.statusCode(200)
			.body(not(containsString("kann nicht gelöscht werden")))
			.body(containsString("Bommel löschen"));
	}

	@Transactional(Transactional.TxType.REQUIRES_NEW)
	void deleteAllBommels()
	{
		bommelRepository.deleteAll();
	}

	@Transactional(Transactional.TxType.REQUIRES_NEW)
	Long createRootBommel(String icon, String title)
	{
		// Use the bootstrap organization that maria is associated with
		Organization org = organizationRepository.findBySlug("musikverein-harmonie");
		if (org == null)
		{
			org = getOrCreateTestOrganization();
		}

		Bommel root = new Bommel();
		root.setIcon(icon);
		root.setTitle(title);
		root.setOrganization(org);
		bommelRepository.persist(root);
		return root.getId();
	}

	@Transactional(Transactional.TxType.REQUIRES_NEW)
	Long createChildBommel(Long parentId, String icon, String title)
	{
		// Use the bootstrap organization that maria is associated with
		Organization org = organizationRepository.findBySlug("musikverein-harmonie");
		if (org == null)
		{
			org = getOrCreateTestOrganization();
		}

		Bommel parent = bommelRepository.findById(parentId);
		Bommel child = new Bommel();
		child.setIcon(icon);
		child.setTitle(title);
		child.parent = parent;
		child.setOrganization(org);
		bommelRepository.persist(child);
		return child.getId();
	}
}
