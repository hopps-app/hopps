package app.fuggs.az.document.ai.model;

import com.azure.ai.documentintelligence.models.AnalyzedDocument;
import com.azure.json.JsonProviders;
import com.azure.json.JsonReader;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@QuarkusTest
class DocumentDataHelperTest
{
	@Test
	void shouldExtractCorrectBruttoFromReceipt() throws IOException
	{
		// given - sample receipt where Azure wrongly labels InvoiceTotal as
		// 84.03
		// (Netto)
		// but SubTotal is 100.00 (actual Brutto)
		AnalyzedDocument document = loadSampleDocument("sample-receipt.02.json");

		// when
		DocumentData data = DocumentDataHelper.fromDocument(document, Collections.emptyList());

		// then
		// Brutto (total) should be 100.00 - what was actually paid
		assertNotNull(data.total());
		assertEquals(0, new BigDecimal("100.00").compareTo(data.total()),
			"Brutto should be 100.00, but was " + data.total());

		// MwSt should be 15.97
		assertNotNull(data.totalTax());
		assertEquals(0, new BigDecimal("15.97").compareTo(data.totalTax()),
			"MwSt should be 15.97, but was " + data.totalTax());

		// SubTotal from Azure contains 100.00 (gross on this receipt)
		assertNotNull(data.subTotal());
		assertEquals(0, new BigDecimal("100.00").compareTo(data.subTotal()),
			"Azure SubTotal should be 100.00, but was " + data.subTotal());
	}

	@Test
	void shouldExtractInvoiceDate() throws IOException
	{
		// given
		AnalyzedDocument document = loadSampleDocument("sample-receipt.02.json");

		// when
		DocumentData data = DocumentDataHelper.fromDocument(document, Collections.emptyList());

		// then
		assertNotNull(data.date());
		assertEquals(2020, data.date().getYear());
		assertEquals(1, data.date().getMonthValue());
		assertEquals(2, data.date().getDayOfMonth());
	}

	@Test
	void shouldExtractInvoiceId() throws IOException
	{
		// given
		AnalyzedDocument document = loadSampleDocument("sample-receipt.02.json");

		// when
		DocumentData data = DocumentDataHelper.fromDocument(document, Collections.emptyList());

		// then
		assertEquals("1/1/1/1001", data.documentId());
	}

	@Test
	void shouldExtractVendorName() throws IOException
	{
		// given
		AnalyzedDocument document = loadSampleDocument("sample-receipt.02.json");

		// when
		DocumentData data = DocumentDataHelper.fromDocument(document, Collections.emptyList());

		// then
		assertEquals("Kassenbeleg", data.merchantName());
	}

	@Test
	void shouldExtractCurrencyCode() throws IOException
	{
		// given
		AnalyzedDocument document = loadSampleDocument("sample-receipt.02.json");

		// when
		DocumentData data = DocumentDataHelper.fromDocument(document, Collections.emptyList());

		// then
		assertEquals("EUR", data.currencyCode());
	}

	@Test
	void shouldExtractPaymentTerm() throws IOException
	{
		// given
		AnalyzedDocument document = loadSampleDocument("sample-receipt.02.json");

		// when
		DocumentData data = DocumentDataHelper.fromDocument(document, Collections.emptyList());

		// then
		assertEquals("VISA", data.paymentTerm());
	}

	private AnalyzedDocument loadSampleDocument(String filename) throws IOException
	{
		try (InputStream is = getClass().getClassLoader().getResourceAsStream(filename))
		{
			assertNotNull(is, "Could not find test resource: " + filename);
			try (JsonReader jsonReader = JsonProviders.createReader(is))
			{
				return AnalyzedDocument.fromJson(jsonReader);
			}
		}
	}
}
