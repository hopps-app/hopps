package rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.containsString;

import jakarta.inject.Inject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import model.Bommel;
import repository.BommelRepository;

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
			.body(containsString("Create Root Bommel"))
			.body(containsString("No organization structure defined yet"));
	}

	@Test
	void givenRootBommel_whenIndexCalled_thenShowsTreeView()
	{
		deleteAllBommels();
		String rootId = createRootBommel("home", "Verein");

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
		String rootId = createRootBommel("home", "Verein");

		given()
			.when()
			.get("/Bommels/index?selectedId=" + rootId)
			.then()
			.statusCode(200)
			.body(containsString("Edit: Verein"))
			.body(containsString("Add Child to Verein"));
	}

	@Test
	void givenInvalidSelectedId_whenIndexCalled_thenReturns200WithNoSelection()
	{
		deleteAllBommels();
		createRootBommel("home", "Verein");

		given()
			.when()
			.get("/Bommels/index?selectedId=invalid-id")
			.then()
			.statusCode(200)
			.body(containsString("Click on a bommel"));
	}

	@Test
	void givenBommelWithChildren_whenIndexCalledWithSelectedId_thenDeleteButtonDisabled()
	{
		deleteAllBommels();
		String rootId = createRootBommel("home", "Verein");
		createChildBommel(rootId, "group", "Jugend");

		given()
			.when()
			.get("/Bommels/index?selectedId=" + rootId)
			.then()
			.statusCode(200)
			.body(containsString("Cannot delete"));
	}

	// Helper methods that use transactions properly
	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	void deleteAllBommels()
	{
		bommelRepository.deleteAll();
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	String createRootBommel(String icon, String title)
	{
		Bommel root = new Bommel();
		root.icon = icon;
		root.title = title;
		bommelRepository.persist(root);
		return root.id;
	}

	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	void createChildBommel(String parentId, String icon, String title)
	{
		Bommel parent = bommelRepository.findById(parentId);
		Bommel child = new Bommel();
		child.icon = icon;
		child.title = title;
		child.parent = parent;
		bommelRepository.persist(child);
	}
}
