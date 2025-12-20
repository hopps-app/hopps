package app.hopps.zugferd;

import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.net.URL;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
@TestHTTPEndpoint(ZugFerdResource.class)
class ZugFerdResourceTest
{

	@Test
	void shouldReadZugFerd()
	{

		// prepare
		URL resourceUrl = getClass().getClassLoader().getResource("MustangGnuaccountingBeispielRE-20170509_505.pdf");
		assertNotNull(resourceUrl, "Test file not found in classpath");
		File testFile = new File(resourceUrl.getFile());
		Long referenceId = 123L;

		given()
			.multiPart("file", testFile)
			.multiPart("referenceId", referenceId)
			.contentType(ContentType.MULTIPART)
			.when()
			.post()
			.then()
			.statusCode(200)
			.body("customerName", equalTo("Theodor Est"));
	}

	@Test
	void shouldNotReadNonZugferd()
	{

		// prepare
		URL resourceUrl = getClass().getClassLoader().getResource("wacky-widgets.pdf");
		assertNotNull(resourceUrl, "Test file not found in classpath");
		File testFile = new File(resourceUrl.getFile());
		Long referenceId = 123L;

		given()
			.multiPart("file", testFile)
			.multiPart("referenceId", referenceId)
			.contentType(ContentType.MULTIPART)
			.when()
			.post()
			.then()
			.statusCode(422); // 422: Unprocessable Entity
	}
}
