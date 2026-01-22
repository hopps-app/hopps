package app.fuggs.document.client;

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
import java.time.LocalTime;

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
	private static final String DOCUMENT_RESPONSE = """
		{
			"total": 1234.56,
			"currencyCode": "EUR",
			"date": "2024-03-15",
			"time": "14:30:00",
			"documentId": "INV-2024-0042",
			"merchantName": "Acme Corporation",
			"merchantAddress": {
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
			"merchantTaxId": "DE123456789",
			"customerName": "Fuggs GmbH",
			"customerId": "CUST-001",
			"customerAddress": null,
			"billingAddress": {
				"name": "Fuggs GmbH",
				"countryOrRegion": "Germany",
				"postalCode": "54321",
				"state": null,
				"city": "Munich",
				"street": "Beispielweg 42",
				"additionalAddress": null,
				"taxID": null,
				"vatID": null,
				"description": null
			},
			"shippingAddress": null,
			"subTotal": 1037.45,
			"totalTax": 197.11,
			"totalDiscount": null,
			"previousUnpaidBalance": null,
			"purchaseOrderNumber": "PO-2024-001",
			"paymentTerm": "Net 30",
			"serviceStartDate": null,
			"serviceEndDate": null
		}
		""";

	WireMock wireMock;

	@RestClient
	DocumentAiClient documentAiClient;

	@Test
	void shouldScanDocumentAndReturnExtractedData() throws IOException
	{
		wireMock.register(post(urlEqualTo("/api/az-document-ai/document/scan"))
			.withHeader("Content-Type", containing("multipart/form-data"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(DOCUMENT_RESPONSE)));

		try (InputStream testDocument = getClass().getResourceAsStream("/document/receipt.png"))
		{
			DocumentData result = documentAiClient.scanDocument(testDocument, 123L);

			assertThat(result, is(notNullValue()));
			assertThat(result.total(), equalTo(new BigDecimal("1234.56")));
			assertThat(result.currencyCode(), equalTo("EUR"));
			assertThat(result.date(), equalTo(LocalDate.of(2024, 3, 15)));
			assertThat(result.time(), equalTo(LocalTime.of(14, 30, 0)));
			assertThat(result.documentId(), equalTo("INV-2024-0042"));
			assertThat(result.merchantName(), equalTo("Acme Corporation"));
			assertThat(result.merchantTaxId(), equalTo("DE123456789"));
			assertThat(result.customerName(), equalTo("Fuggs GmbH"));
			assertThat(result.customerId(), equalTo("CUST-001"));
			assertThat(result.subTotal(), equalTo(new BigDecimal("1037.45")));
			assertThat(result.totalTax(), equalTo(new BigDecimal("197.11")));
			assertThat(result.purchaseOrderNumber(), equalTo("PO-2024-001"));
			assertThat(result.paymentTerm(), equalTo("Net 30"));

			// Verify merchant address
			assertThat(result.merchantAddress(), is(notNullValue()));
			assertThat(result.merchantAddress().name(), equalTo("Acme Corporation"));
			assertThat(result.merchantAddress().city(), equalTo("Berlin"));
			assertThat(result.merchantAddress().postalCode(), equalTo("12345"));
			assertThat(result.merchantAddress().street(), equalTo("Musterstraße 123"));

			// Verify billing address
			assertThat(result.billingAddress(), is(notNullValue()));
			assertThat(result.billingAddress().name(), equalTo("Fuggs GmbH"));
			assertThat(result.billingAddress().city(), equalTo("Munich"));
		}
	}

	@Test
	void shouldHandleNullFieldsInResponse() throws IOException
	{
		String minimalResponse = """
			{
				"total": 100.00,
				"currencyCode": "USD",
				"date": null,
				"time": null,
				"documentId": null,
				"merchantName": null,
				"merchantAddress": null,
				"merchantTaxId": null,
				"customerName": null,
				"customerId": null,
				"customerAddress": null,
				"billingAddress": null,
				"shippingAddress": null,
				"subTotal": null,
				"totalTax": null,
				"totalDiscount": null,
				"previousUnpaidBalance": null,
				"purchaseOrderNumber": null,
				"paymentTerm": null,
				"serviceStartDate": null,
				"serviceEndDate": null
			}
			""";

		wireMock.register(post(urlEqualTo("/api/az-document-ai/document/scan"))
			.willReturn(aResponse()
				.withStatus(200)
				.withHeader("Content-Type", MediaType.APPLICATION_JSON)
				.withBody(minimalResponse)));

		try (InputStream testDocument = getClass().getResourceAsStream("/document/receipt.png"))
		{
			DocumentData result = documentAiClient.scanDocument(testDocument, 789L);

			assertThat(result, is(notNullValue()));
			assertThat(result.total(), equalTo(new BigDecimal("100.00")));
			assertThat(result.currencyCode(), equalTo("USD"));
			assertThat(result.date(), is(nullValue()));
			assertThat(result.time(), is(nullValue()));
			assertThat(result.documentId(), is(nullValue()));
			assertThat(result.merchantName(), is(nullValue()));
			assertThat(result.merchantAddress(), is(nullValue()));
			assertThat(result.customerName(), is(nullValue()));
		}
	}
}
