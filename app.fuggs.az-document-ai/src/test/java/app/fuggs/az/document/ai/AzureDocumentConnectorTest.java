package app.fuggs.az.document.ai;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
class AzureDocumentConnectorTest
{
	@Inject
	AzureDocumentConnector connector;

	@Test
	void connectorIsInjected()
	{
		assertNotNull(connector);
	}
}
