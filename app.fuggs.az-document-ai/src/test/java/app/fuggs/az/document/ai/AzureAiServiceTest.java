package app.fuggs.az.document.ai;

import app.fuggs.az.document.ai.model.DocumentData;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
class AzureAiServiceTest
{
	@Inject
	AzureAiService aiService;

	@Test
	@Tag("azure")
	void shouldAnalyzeDocumentAgainstAzure() throws Exception
	{
		// given
		URL imageResource = getClass().getClassLoader().getResource("receipt.png");
		Path imagePath = Paths.get(imageResource.toURI());

		// when
		DocumentData documentData = aiService.scanDocument(imagePath, "receipt.png");

		// then
		assertNotNull(documentData);
	}
}
