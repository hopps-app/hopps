package rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.containsString;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import model.Bommel;

@QuarkusTest
class BommelsTest
{

	@BeforeEach
	void setUp()
	{
		Bommel.listAll().clear();
	}

	@Test
	void givenNoBommels_whenIndexCalled_thenShowsCreateRootForm()
	{
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
		Bommel root = new Bommel();
		root.emoji = "🏛️";
		root.title = "Verein";
		root.persist();

		given()
			.when()
			.get("/Bommels/index")
			.then()
			.statusCode(200)
			.body(containsString("cds-tree-view"))
			.body(containsString("🏛️ Verein"));
	}

	@Test
	void givenRootBommel_whenIndexCalledWithSelectedId_thenShowsEditForm()
	{
		Bommel root = new Bommel();
		root.emoji = "🏛️";
		root.title = "Verein";
		root.persist();

		given()
			.when()
			.get("/Bommels/index?selectedId=" + root.id)
			.then()
			.statusCode(200)
			.body(containsString("Edit: 🏛️ Verein"))
			.body(containsString("Add Child to 🏛️ Verein"));
	}

	@Test
	void givenInvalidSelectedId_whenIndexCalled_thenReturns200WithNoSelection()
	{
		Bommel root = new Bommel();
		root.emoji = "🏛️";
		root.title = "Verein";
		root.persist();

		given()
			.when()
			.get("/Bommels/index?selectedId=invalid-id")
			.then()
			.statusCode(200)
			.body(containsString("Select a Bommel"));
	}

	@Test
	void givenBommelWithChildren_whenIndexCalledWithSelectedId_thenDeleteButtonDisabled()
	{
		Bommel root = new Bommel();
		root.emoji = "🏛️";
		root.title = "Verein";
		root.persist();

		Bommel child = new Bommel();
		child.emoji = "👦";
		child.title = "Jugend";
		child.parent = root;
		child.persist();

		given()
			.when()
			.get("/Bommels/index?selectedId=" + root.id)
			.then()
			.statusCode(200)
			.body(containsString("Cannot delete this bommel because it has children"));
	}
}
