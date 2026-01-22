package app.fuggs.zugferd;

import app.fuggs.zugferd.model.DocumentData;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class ZugFerdServiceTest
{
	@Inject
	ZugFerdService zugFerdService;

	@Test
	void shouldAnalyzeDocumentWithZugferd() throws Exception
	{
		// given
		InputStream stream = getClass().getClassLoader()
			.getResourceAsStream("MustangGnuaccountingBeispielRE-20170509_505.pdf");

		// when
		DocumentData documentData = zugFerdService.scanDocument(1L, stream);

		// then
		assertNotNull(documentData);
		assertEquals(LocalDate.of(2017, 5, 30), documentData.dueDate());
		assertEquals(LocalDate.of(2017, 5, 9), documentData.date());
		assertEquals("Theodor Est", documentData.customerName());
		assertEquals(BigDecimal.valueOf(571.04), documentData.total());
		assertEquals("RE-20170509/505", documentData.documentId());
		assertEquals("", documentData.currencyCode());
		// Tags should be present (empty if OPENAI_API_KEY not set)
		assertNotNull(documentData.tags());
	}
}
