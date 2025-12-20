package app.hopps.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.containsString;

import jakarta.inject.Inject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import app.hopps.model.Bommel;
import app.hopps.repository.BommelRepository;

@QuarkusTest
class BommelsTest
{
	@Inject
	BommelRepository bommelRepository;

	@BeforeEach
	void setUp()
	{
		// Data cleanup happens via drop-and-create on each test run
		// For individual test isolation, we rely on the database being fresh
	}

	@Test
	void givenNoBommels_whenIndexCalled_thenShowsCreateRootForm()
	{
		// Clear any existing data
		deleteAllBommels();

		given()
			.when()
			.get("/Bommels/index")
			.then()
			.statusCode(200)
			.body(containsString("Wurzel-Bommel erstellen"))
			.body(containsString("Noch keine Organisationsstruktur definiert"));
	}

	@Test
	void givenRootBommel_whenIndexCalled_thenShowsTreeView()
	{
		deleteAllBommels();
		Long rootId = createRootBommel("home", "Verein");

		given()
			.when()
			.get("/Bommels/index")
			.then()
			.statusCode(200)
			.body(containsString("cds-tree-view"))
			.body(containsString("Verein"));
	}

	@Test
	void givenRootBommel_whenIndexCalledWithSelectedId_thenShowsEditForm()
	{
		deleteAllBommels();
		Long rootId = createRootBommel("home", "Verein");

		given()
			.when()
			.get("/Bommels/index?selectedId=" + rootId)
			.then()
			.statusCode(200)
			.body(containsString("Bearbeiten: Verein"))
			.body(containsString("Kind hinzufügen zu Verein"));
	}

	@Test
	void givenInvalidSelectedId_whenIndexCalled_thenReturns404()
	{
		deleteAllBommels();
		createRootBommel("home", "Verein");

		// With Long id type, an invalid string causes endpoint matching to fail
		given()
			.when()
			.get("/Bommels/index?selectedId=invalid-id")
			.then()
			.statusCode(404);
	}

	@Test
	void givenNonExistentSelectedId_whenIndexCalled_thenReturns200WithNoSelection()
	{
		deleteAllBommels();
		createRootBommel("home", "Verein");

		// Valid Long but non-existent in database
		given()
			.when()
			.get("/Bommels/index?selectedId=99999")
			.then()
			.statusCode(200)
			.body(containsString("Klicken Sie auf einen Bommel"));
	}

	@Test
	void givenBommelWithChildren_whenIndexCalledWithSelectedId_thenDeleteButtonDisabled()
	{
		deleteAllBommels();
		Long rootId = createRootBommel("home", "Verein");
		createChildBommel(rootId, "group", "Jugend");

		given()
			.when()
			.get("/Bommels/index?selectedId=" + rootId)
			.then()
			.statusCode(200)
			.body(containsString("kann nicht gelöscht werden"));
	}

	// Helper methods that use transactions properly
	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	void deleteAllBommels()
	{
		bommelRepository.deleteAll();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	Long createRootBommel(String icon, String title)
	{
		Bommel root = new Bommel();
		root.setIcon(icon);
		root.setTitle(title);
		bommelRepository.persist(root);
		return root.getId();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	void createChildBommel(Long parentId, String icon, String title)
	{
		Bommel parent = bommelRepository.findById(parentId);
		Bommel child = new Bommel();
		child.setIcon(icon);
		child.setTitle(title);
		child.parent = parent;
		bommelRepository.persist(child);
	}
}
