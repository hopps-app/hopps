package app.hopps.az.document.ai.model;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;

@QuarkusTest
class DocumentDataHelperTest
{
	@Test
	void shouldGetCorrectTotal() throws URISyntaxException
	{
		// given
		URL imageResource = getClass().getClassLoader().getResource("receipt.png");
		Path imagePath = Paths.get(imageResource.toURI());
	}
}
