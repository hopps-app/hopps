package app.hopps.bankimport.api;

import app.hopps.bankimport.domain.BankTransaction;
import app.hopps.bankimport.domain.BankTransactionMatch;
import app.hopps.bankimport.domain.BankTransactionStatus;
import app.hopps.document.domain.Document;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.shared.bootstrap.TestdataBootstrapper;
import app.hopps.transaction.domain.Transaction;
import app.hopps.transaction.domain.TransactionStatus;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import io.restassured.specification.RequestSpecification;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static io.restassured.RestAssured.given;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasEntry;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pleo card account: importing the expense export creates linked draft bookings with their category, receipt files are
 * attached by their receipt number, and taking the import back removes the drafts again.
 */
@QuarkusTest
@TestSecurity(user = "alice@example.test", roles = "user")
@OidcSecurity(claims = {
        @Claim(key = "sub", value = "eb4123a3-b722-4798-9af5-8957f823657a")
})
class PleoImportResourceTest {

    private static final long ORGANIZATION_ID = 4L;

    private static final String EXPORT = "\"Date\",\"Receipt\",\"Expense Type\",\"Amount\",\"Currency\","
            + "\"Source description\",\"Category\",\"Owner\",\"Note\",\"Expense ID\"\n"
            + "\"21-04-2026\",\"1000014\",\"Online Card Purchase\",\"-17,94\",\"EUR\",\"UBER TRIP\",\"Transportfahrt \","
            + "\"Erika Muster\",\"Fahrt zum Termin\",\"exp-1\"\n"
            + "\"21-04-2026\",\"1000013\",\"In-Store Card Purchase\",\"-192,06\",\"EUR\",\"Ristorante\",\"geschäftsessen\","
            + "\"Erika Muster\",\"\",\"exp-2\"\n"
            + "\"24-04-2026\",\"1000015\",\"Pleo Invoice\",\"-56,25\",\"EUR\",\"PLEO\",\"\",\"Erika Muster\",\"\",\"exp-3\"\n"
            + "\"03-04-2026\",\"1000009\",\"In-Store Card Purchase\",\"-1.200,00\",\"EUR\",\"Hotel am See\",\"Tagungen\","
            + "\"Erika Muster\",\"Klausur\",\"exp-4\"\n"
            + "\"03-04-2026\",\"1000016\",\"Online Card Purchase\",\"10,00\",\"USD\",\"Shop\",\"\",\"Erika Muster\",\"\","
            + "\"exp-5\"\n";

    @Inject
    Flyway flyway;

    @Inject
    TestdataBootstrapper testdataBootstrapper;

    @Inject
    OrganizationRepository organizationRepository;

    @Inject
    EntityManager em;

    private Long accountId;
    private Long groupId;
    private Long rootBommelId;

    @BeforeEach
    void setup() {
        flyway.clean();
        flyway.migrate();
        testdataBootstrapper.loadTestdata();
        rootBommelId = QuarkusTransaction.requiringNew()
                .call(() -> organizationRepository.findById(ORGANIZATION_ID).getRootBommel().id);

        // A Pleo account needs no IBAN.
        accountId = given().contentType(ContentType.JSON)
                .body(Map.of("name", "Pleo", "accountType", "PLEO"))
                .post("/bankaccounts")
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");

        groupId = given().contentType(ContentType.JSON)
                .body(Map.of(
                        "file", Map.of("formatVersion", 1, "sourceKey", "pleo-test", "name", "Pleo-Kategorie",
                                "required", false, "values", List.of(
                                        Map.of("value", "Travel", "bookable", false),
                                        Map.of("value", "Transportfahrt", "parent", "Travel"),
                                        Map.of("value", "Meals", "bookable", false),
                                        Map.of("value", "Geschäftsessen", "parent", "Meals"))),
                        "bommelIds", List.of(rootBommelId)))
                .post("/category-groups/import")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getLong("group.id");
    }

    private JsonPath importExport(String csv) {
        return given().multiPart("file", "export_2026-04-01_2026-04-30.csv", csv.getBytes(StandardCharsets.UTF_8),
                "text/csv")
                .queryParam("categoryGroupId", groupId)
                .post("/bankaccounts/{id}/pleo/import", accountId)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }

    private JsonPath attach(Object[]... files) {
        RequestSpecification request = given();
        for (Object[] file : files) {
            request = request.multiPart("files", (String) file[0], (byte[]) file[1], "application/octet-stream");
        }
        return request.post("/bankaccounts/{id}/pleo/receipts", accountId)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }

    @Test
    void importCreatesLinkedDraftsWithTheirCategory() {
        JsonPath result = importExport(EXPORT);

        assertEquals(5, result.getInt("totalRows"));
        assertEquals(4, result.getInt("importedRows"));
        assertEquals(1, result.getInt("errorRows"));
        List<String> errors = result.getList("errors", String.class);
        assertEquals(1, errors.size());
        assertThat(errors.get(0), containsString("USD"));
        assertEquals(2, result.getInt("categorizedRows"));
        assertEquals(1, result.getInt("uncategorizedRows"));
        assertEquals(List.of("Tagungen"), result.getList("unknownCategories"));
        assertEquals(4, result.getInt("awaitingReceiptRows"));

        QuarkusTransaction.requiringNew().run(() -> {
            List<BankTransaction> movements = em.createQuery(
                    "SELECT t FROM BankTransaction t WHERE t.bankAccount.id = :id ORDER BY t.bankReference",
                    BankTransaction.class).setParameter("id", accountId).getResultList();
            assertEquals(4, movements.size());
            assertTrue(movements.stream().allMatch(m -> m.getStatus() == BankTransactionStatus.FULLY_MATCHED));

            Transaction taxi = draftOf("1000014");
            assertEquals(TransactionStatus.DRAFT, taxi.getStatus());
            assertEquals("Fahrt zum Termin", taxi.getName());
            assertEquals(0, new BigDecimal("-17.94").compareTo(taxi.getTotal()));
            assertEquals(rootBommelId, taxi.getBommel().id);
            assertEquals("UBER TRIP", taxi.getCounterparty().getName());
            assertEquals(List.of("Transportfahrt"), categoryValues(taxi));

            // Without a note the merchant names the booking; the category is found regardless of case.
            Transaction dinner = draftOf("1000013");
            assertEquals("Ristorante", dinner.getName());
            assertEquals(List.of("Geschäftsessen"), categoryValues(dinner));

            assertTrue(draftOf("1000009").getCategoryValues().isEmpty());
        });

        // The account remembers the group for the next import.
        given().get("/bankaccounts/{id}", accountId)
                .then()
                .statusCode(200)
                .body("categoryGroupId", org.hamcrest.Matchers.is(groupId.intValue()))
                .body("accountType", org.hamcrest.Matchers.is("PLEO"));
    }

    @Test
    void importingTheSameExpensesAgainSkipsThem() {
        importExport(EXPORT);
        JsonPath again = importExport(EXPORT + "\"25-04-2026\",\"1000017\",\"Online Card Purchase\",\"-5,00\",\"EUR\","
                + "\"Kiosk\",\"\",\"Erika Muster\",\"\",\"exp-6\"\n");

        assertEquals(1, again.getInt("importedRows"));
        assertEquals(4, again.getInt("duplicateRows"));
    }

    @Test
    void receiptsAreLinkedByTheirNumberAndSeveralFilesAreMerged() throws IOException {
        importExport(EXPORT);

        byte[] zip = zip(Map.of(
                "belege/1000009a.pdf", pdf("Hotel Rechnung"),
                "belege/1000009b.png", png(),
                "belege/1000014.pdf", pdf("Uber"),
                "belege/9999999.pdf", pdf("fremd"),
                "belege/liesmich.txt", "hallo".getBytes(StandardCharsets.UTF_8),
                "__MACOSX/belege/._1000014.pdf", new byte[] { 0, 5, 22 }));
        JsonPath result = attach(new Object[] { "belege.zip", zip });

        assertThat(result.getList("linked.receiptNumber", String.class), containsInAnyOrder("1000009", "1000014"));
        assertThat(result.getList("linked.find { it.receiptNumber == '1000009' }.fileNames", String.class),
                contains("1000009a.pdf", "1000009b.png"));
        Map<String, String> skipped = result.getMap("skipped.collectEntries { [it.fileName, it.reason] }");
        assertEquals(2, skipped.size());
        assertThat(skipped, hasEntry("9999999.pdf", "NO_EXPENSE"));
        assertThat(skipped, hasEntry("liesmich.txt", "UNSUPPORTED_TYPE"));

        QuarkusTransaction.requiringNew().run(() -> {
            Document hotel = draftOf("1000009").getDocument();
            assertEquals("application/pdf", hotel.getFileContentType());
            assertEquals("1000009.pdf", hotel.getFileName());
            assertEquals(rootBommelId, hotel.getBommel().id);
            assertEquals("1000014.pdf", draftOf("1000014").getDocument().getFileName());
            assertNull(draftOf("1000013").getDocument());
        });

        // A booking keeps its receipt; a second one for the same expense is not taken.
        JsonPath again = attach(new Object[] { "1000014.pdf", pdf("Uber, nochmal") });
        assertTrue(again.getList("linked").isEmpty());
        assertEquals(List.of("HAS_RECEIPT"), again.getList("skipped.reason"));
    }

    @Test
    void mergedPdfHoldsEveryPage() throws IOException {
        importExport(EXPORT);
        attach(new Object[] { "1000009a.pdf", pdf("Seite 1") },
                new Object[] { "1000009b.pdf", pdf("Seite 2") },
                new Object[] { "1000009c.jpg", jpeg() });

        Long documentId = QuarkusTransaction.requiringNew()
                .call(() -> draftOf("1000009").getDocument().getId());
        byte[] merged = given().get("/documents/{id}/file", documentId)
                .then()
                .statusCode(200)
                .extract()
                .asByteArray();
        try (PDDocument document = Loader.loadPDF(merged)) {
            assertEquals(3, document.getNumberOfPages());
        }
    }

    @Test
    void rollbackRemovesTheUnconfirmedDraftsAndTheirReceipts() throws IOException {
        long importId = importExport(EXPORT).getLong("importId");
        attach(new Object[] { "1000014.pdf", pdf("Uber") });

        given().delete("/imports/{id}", importId).then().statusCode(204);

        QuarkusTransaction.requiringNew().run(() -> {
            assertEquals(0, count("SELECT count(t) FROM BankTransaction t WHERE t.bankAccount.id = " + accountId));
            assertEquals(0, count("SELECT count(t) FROM Transaction t WHERE t.name = 'Fahrt zum Termin'"));
            assertEquals(0, count("SELECT count(d) FROM Document d WHERE d.fileName = '1000014.pdf'"));
        });
    }

    @Test
    void anOrdinaryAccountTakesNoPleoExport() {
        Long bankAccountId = given().contentType(ContentType.JSON)
                .body(Map.of("name", "Girokonto ohne IBAN"))
                .post("/bankaccounts")
                .then()
                .statusCode(201)
                .body("accountType", org.hamcrest.Matchers.is("BANK"))
                .body("iban", org.hamcrest.Matchers.nullValue())
                .extract()
                .jsonPath()
                .getLong("id");

        given().multiPart("file", "export.csv", EXPORT.getBytes(StandardCharsets.UTF_8), "text/csv")
                .post("/bankaccounts/{id}/pleo/import", bankAccountId)
                .then()
                .statusCode(400);
    }

    @Test
    void aGroupThatDoesNotApplyToTheAccountIsRejected() {
        Long otherGroup = given().contentType(ContentType.JSON)
                .body(Map.of("file", Map.of("formatVersion", 1, "name", "Woanders", "required", false, "values",
                        List.of(Map.of("value", "X"))), "bommelIds", List.of()))
                .post("/category-groups/import")
                .then()
                .extract()
                .jsonPath()
                .getLong("group.id");

        given().multiPart("file", "export.csv", EXPORT.getBytes(StandardCharsets.UTF_8), "text/csv")
                .queryParam("categoryGroupId", otherGroup)
                .post("/bankaccounts/{id}/pleo/import", accountId)
                .then()
                .statusCode(400);
    }

    // ---------------------------------------------------------------------------------------------------------------

    /** The draft the import created for the expense with this receipt number (call inside a transaction). */
    private Transaction draftOf(String receiptNumber) {
        return em.createQuery("SELECT m.transaction FROM BankTransactionMatch m "
                + "WHERE m.bankTransaction.bankReference = :number ORDER BY m.transaction.id", Transaction.class)
                .setParameter("number", receiptNumber)
                .setMaxResults(1)
                .getSingleResult();
    }

    private static List<String> categoryValues(Transaction transaction) {
        return transaction.getCategoryValues().stream().map(v -> v.getValue()).toList();
    }

    private long count(String jpql) {
        return em.createQuery(jpql, Long.class).getSingleResult();
    }

    private static byte[] pdf(String text) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(50, 700);
                content.showText(text);
                content.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }

    private static byte[] png() throws IOException {
        return image("png");
    }

    private static byte[] jpeg() throws IOException {
        return image("jpg");
    }

    private static byte[] image(String format) throws IOException {
        BufferedImage image = new BufferedImage(40, 60, BufferedImage.TYPE_INT_RGB);
        image.setRGB(3, 4, 0xFF0000);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);
        return out.toByteArray();
    }

    private static byte[] zip(Map<String, byte[]> entries) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            for (Map.Entry<String, byte[]> entry : new java.util.TreeMap<>(entries).entrySet()) {
                zip.putNextEntry(new ZipEntry(entry.getKey()));
                zip.write(entry.getValue());
                zip.closeEntry();
            }
        }
        return out.toByteArray();
    }
}
