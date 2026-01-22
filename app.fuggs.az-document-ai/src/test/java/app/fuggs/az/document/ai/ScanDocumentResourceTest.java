package app.fuggs.az.document.ai;

import app.fuggs.az.document.ai.model.DocumentData;
import app.fuggs.az.document.ai.model.TradeParty;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@QuarkusTest
@TestHTTPEndpoint(ScanDocumentResource.class)
class ScanDocumentResourceTest
{
	private static final String REQUEST_BODY = "fake document data here";

	@InjectMock
	AzureAiService azureAiServiceMock;

	@Test
	void documentScanWorks() throws OcrException
	{
		// Arrange
		DocumentData documentData = fakeDocumentData();

		when(azureAiServiceMock.scanDocument(any(), anyString()))
			.thenReturn(documentData);

		// Act
		var receivedData = given()
			.multiPart("document", REQUEST_BODY)
			.multiPart("transactionRecordId", "32")
			.contentType(ContentType.MULTIPART)
			.when()
			.post()
			.then()
			.statusCode(200)
			.extract()
			.as(DocumentData.class);

		// Assert
		assertEquals(documentData, receivedData);
	}

	@Test
	void azureFailureIsPropagatedAsBadRequest() throws OcrException
	{
		// Arrange
		when(azureAiServiceMock.scanDocument(any(), anyString()))
			.thenThrow(new OcrException("Test error"));

		// Act + Assert
		given()
			.multiPart("document", REQUEST_BODY)
			.multiPart("transactionRecordId", "32")
			.contentType(ContentType.MULTIPART)
			.when()
			.post()
			.then()
			.statusCode(400);
	}

	@Test
	void azureRuntimeFailureIsPropagatedAsInternalServerError() throws OcrException
	{
		// Arrange
		when(azureAiServiceMock.scanDocument(any(), anyString()))
			.thenThrow(new RuntimeException());

		// Act + Assert
		given()
			.multiPart("document", REQUEST_BODY)
			.multiPart("transactionRecordId", "32")
			.contentType(ContentType.MULTIPART)
			.when()
			.post()
			.then()
			.statusCode(500);
	}

	@Test
	void fileUploadPreservesBytesCorrectly() throws URISyntaxException, IOException, OcrException
	{
		// Arrange - get the actual test file
		File receiptFile = new File(getClass().getClassLoader().getResource("receipt.png").toURI());
		byte[] expectedBytes = Files.readAllBytes(receiptFile.toPath());

		// Use Answer to verify bytes during invocation (before temp file
		// cleanup)
		when(azureAiServiceMock.scanDocument(any(), anyString()))
			.thenAnswer(invocation -> {
				Path uploadedPath = invocation.getArgument(0);
				byte[] actualBytes = Files.readAllBytes(uploadedPath);
				assertArrayEquals(expectedBytes, actualBytes, "Uploaded file bytes should match original file");
				return fakeDocumentData();
			});

		// Act
		given()
			.multiPart("document", receiptFile, "application/octet-stream")
			.multiPart("transactionRecordId", "123")
			.contentType(ContentType.MULTIPART)
			.when()
			.post()
			.then()
			.statusCode(200);
	}

	private static DocumentData fakeDocumentData()
	{
		return new DocumentData(
			BigDecimal.valueOf(135.0),
			"EUR",
			LocalDate.now(),
			null,
			"INV-001",
			"Test Merchant",
			fakeAddress(),
			"DE123456789",
			"Test Customer",
			"CUST-001",
			null,
			fakeAddress(),
			null,
			LocalDate.now().plusDays(30),
			BigDecimal.valueOf(135.0),
			BigDecimal.valueOf(113.45),
			BigDecimal.valueOf(21.55),
			null,
			null,
			"PO-12345",
			"Net 30",
			null,
			null,
			List.of("food", "pizza"));
	}

	private static TradeParty fakeAddress()
	{
		return new TradeParty(
			"Test Company",
			"Germany",
			"85276",
			"Bavaria",
			"Pfaffenhofen",
			"Bistumerweg",
			"5",
			"taxid",
			"vatid",
			"Test Company Description");
	}
}
