package app.hopps.document.client;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;

import com.github.tomakehurst.wiremock.client.WireMock;

import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.ws.rs.core.MediaType;

@QuarkusTest
@TestProfile(WireMockTestProfile.class)
@ConnectWireMock
class DocumentAiClientTest
{
	private static final String INVOICE_RESPONSE = """
		{
			"total": 1234.56,
			"invoiceDate": "2024-03-15",
			"currencyCode": "EUR",
			"customerName": "Hopps GmbH",
			"purchaseOrderNumber": "PO-2024-001",
			"invoiceId": "INV-2024-0042",
			"dueDate": "2024-04-15",
			"amountDue": 1234.56,
			"sender": {
				"name": "Acme Corporation",
				"countryOrRegion": "Germany",
				"postalCode": "12345",
				"state": null,
				"city": "Berlin",
				"street": "Musterstraße 123",
				"additionalAddress": null,
				"taxID": "DE123456789",
				"vatID": "DE987654321",
				"description": null
			},
			"receiver": {
				"name": "Hopps GmbH",
				"countryOrRegion": "Germany",
				"postalCode": "54321",
				"state": null,
				"city": "Munich",
				"street": "Beispielweg 42",
				"additionalAddress": null,
				"taxID": null,
				"vatID": null,
				"description": null
			}
		}
		""";

	private static final String RECEIPT_RESPONSE = """
		{
			"total": 42.50,
			"storeName": "REWE Supermarkt",
			"storeAddress": {
				"name": "REWE",
				"countryOrRegion": "Germany",
				"postalCode": "80331",
				"state": "Bavaria",
				"city": "Munich",
				"street": "Marienplatz 1",
				"additionalAddress": null,
				"taxID": null,
				"vatID": "DE123456789",
				"description": null
			},
			"transactionTime": "2024-03-15T14:30:00"
		}
		""";

	WireMock wireMock;

	@RestClient
	DocumentAiClient documentAiClient;

	@Test
	void shouldScanInvoiceAndReturnExtractedData() throws IOException
	{
		wireMock.register(post(urlEqualTo("/api/az-document-ai/document/scan/invoice"))
			.withHeader("Content-Type", containing("multipart/form-data"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(INVOICE_RESPONSE)));

		try (InputStream testDocument = getClass().getResourceAsStream("/document/receipt.png"))
		{
			InvoiceData result = documentAiClient.scanInvoice(testDocument, 123L);

			assertThat(result, is(notNullValue()));
			assertThat(result.total(), equalTo(new BigDecimal("1234.56")));
			assertThat(result.invoiceDate(), equalTo(LocalDate.of(2024, 3, 15)));
			assertThat(result.currencyCode(), equalTo("EUR"));
			assertThat(result.customerName(), equalTo("Hopps GmbH"));
			assertThat(result.purchaseOrderNumber(), equalTo("PO-2024-001"));
			assertThat(result.invoiceId(), equalTo("INV-2024-0042"));
			assertThat(result.dueDate(), equalTo(LocalDate.of(2024, 4, 15)));
			assertThat(result.amountDue(), equalTo(new BigDecimal("1234.56")));

			// Verify sender
			assertThat(result.sender(), is(notNullValue()));
			assertThat(result.sender().name(), equalTo("Acme Corporation"));
			assertThat(result.sender().city(), equalTo("Berlin"));
			assertThat(result.sender().postalCode(), equalTo("12345"));
			assertThat(result.sender().street(), equalTo("Musterstraße 123"));
			assertThat(result.sender().taxID(), equalTo("DE123456789"));

			// Verify receiver
			assertThat(result.receiver(), is(notNullValue()));
			assertThat(result.receiver().name(), equalTo("Hopps GmbH"));
			assertThat(result.receiver().city(), equalTo("Munich"));
		}
	}

	@Test
	void shouldScanReceiptAndReturnExtractedData() throws IOException
	{
		wireMock.register(post(urlEqualTo("/api/az-document-ai/document/scan/receipt"))
			.withHeader("Content-Type", containing("multipart/form-data"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(RECEIPT_RESPONSE)));

		try (InputStream testDocument = getClass().getResourceAsStream("/document/receipt.png"))
		{
			ReceiptData result = documentAiClient.scanReceipt(testDocument, 456L);

			assertThat(result, is(notNullValue()));
			assertThat(result.total(), equalTo(new BigDecimal("42.50")));
			assertThat(result.storeName(), equalTo("REWE Supermarkt"));
			assertThat(result.transactionTime(), equalTo(LocalDateTime.of(2024, 3, 15, 14, 30, 0)));

			// Verify store address
			assertThat(result.storeAddress(), is(notNullValue()));
			assertThat(result.storeAddress().name(), equalTo("REWE"));
			assertThat(result.storeAddress().city(), equalTo("Munich"));
			assertThat(result.storeAddress().postalCode(), equalTo("80331"));
			assertThat(result.storeAddress().street(), equalTo("Marienplatz 1"));
		}
	}

	@Test
	void shouldHandleNullFieldsInInvoiceResponse() throws IOException
	{
		String minimalResponse = """
			{
				"total": 100.00,
				"invoiceDate": null,
				"currencyCode": "USD",
				"customerName": null,
				"purchaseOrderNumber": null,
				"invoiceId": null,
				"dueDate": null,
				"amountDue": null,
				"sender": null,
				"receiver": null
			}
			""";

		wireMock.register(post(urlEqualTo("/api/az-document-ai/document/scan/invoice"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(minimalResponse)));

		try (InputStream testDocument = getClass().getResourceAsStream("/document/receipt.png"))
		{
			InvoiceData result = documentAiClient.scanInvoice(testDocument, 789L);

			assertThat(result, is(notNullValue()));
			assertThat(result.total(), equalTo(new BigDecimal("100.00")));
			assertThat(result.currencyCode(), equalTo("USD"));
			assertThat(result.invoiceDate(), is(nullValue()));
			assertThat(result.customerName(), is(nullValue()));
			assertThat(result.sender(), is(nullValue()));
			assertThat(result.receiver(), is(nullValue()));
		}
	}

	@Test
	void shouldHandleNullFieldsInReceiptResponse() throws IOException
	{
		String minimalResponse = """
			{
				"total": 25.00,
				"storeName": null,
				"storeAddress": null,
				"transactionTime": null
			}
			""";

		wireMock.register(post(urlEqualTo("/api/az-document-ai/document/scan/receipt"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(minimalResponse)));

		try (InputStream testDocument = getClass().getResourceAsStream("/document/receipt.png"))
		{
			ReceiptData result = documentAiClient.scanReceipt(testDocument, 101L);

			assertThat(result, is(notNullValue()));
			assertThat(result.total(), equalTo(new BigDecimal("25.00")));
			assertThat(result.storeName(), is(nullValue()));
			assertThat(result.storeAddress(), is(nullValue()));
			assertThat(result.transactionTime(), is(nullValue()));
		}
	}
}
