package app.hopps;

import app.hopps.commons.Address;
import app.hopps.commons.DocumentData;
import app.hopps.commons.DocumentType;
import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import app.hopps.model.AnalyzeDocumentRequest;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.net.MalformedURLException;
import java.net.URI;
import java.time.LocalDate;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@QuarkusTest
@TestHTTPEndpoint(ScanDocumentResource.class)
class ScanDocumentResourceTest {

    private static final String INVOICE_URL = "http://something.test/invoice";
    private static final String RECEIPT_URL = "http://something.test/receipt";
    private static final AnalyzeDocumentRequest INVOICE_REQUEST_BODY = new AnalyzeDocumentRequest(INVOICE_URL);
    private static final AnalyzeDocumentRequest RECEIPT_REQUEST_BODY = new AnalyzeDocumentRequest(RECEIPT_URL);

    @InjectMock
    AzureAiService azureAiServiceMock;

    @Test
    void invoiceScanWorks() throws MalformedURLException {
        // Arrange
        InvoiceData invoiceData = fakeInvoiceData();

        DocumentData acceptedDocument = new DocumentData(
                URI.create(INVOICE_URL).toURL(),
                -1L,
                DocumentType.INVOICE);

        when(azureAiServiceMock.scanInvoice(Mockito.any()))
                .thenReturn(Optional.empty());
        when(azureAiServiceMock.scanReceipt(Mockito.any()))
                .thenReturn(Optional.empty());

        when(azureAiServiceMock.scanInvoice(acceptedDocument))
                .thenReturn(Optional.of(invoiceData));

        // Act
        var receivedData = given()
                .body(INVOICE_REQUEST_BODY)
                .contentType(ContentType.JSON)
                .when()
                .post("invoice")
                .then()
                .statusCode(200)
                .extract()
                .as(InvoiceData.class);

        // Assert
        assertEquals(invoiceData, receivedData);
    }

    @Test
    void receiptScanWorks() throws MalformedURLException {
        // Arrange
        ReceiptData receiptData = fakeReceiptData();

        DocumentData acceptedDocument = new DocumentData(
                URI.create(RECEIPT_URL).toURL(),
                -1L,
                DocumentType.RECEIPT);

        when(azureAiServiceMock.scanInvoice(Mockito.any()))
                .thenReturn(Optional.empty());
        when(azureAiServiceMock.scanReceipt(Mockito.any()))
                .thenReturn(Optional.empty());

        when(azureAiServiceMock.scanReceipt(acceptedDocument))
                .thenReturn(Optional.of(receiptData));

        // Act
        var receivedData = given()
                .body(RECEIPT_REQUEST_BODY)
                .contentType(ContentType.JSON)
                .when()
                .post("receipt")
                .then()
                .statusCode(200)
                .extract()
                .as(ReceiptData.class);

        // Assert
        assertEquals(receiptData, receivedData);
    }

    @Test
    void azureFailureIsPropagatedAsInternalServerError() {
        // Arrange
        when(azureAiServiceMock.scanInvoice(Mockito.any()))
                .thenThrow(new RuntimeException());

        // Act + Assert
        given().body(INVOICE_REQUEST_BODY)
                .contentType(ContentType.JSON)
                .when()
                .post("invoice")
                .then()
                .statusCode(500);
    }

    private static InvoiceData fakeInvoiceData() {
        return new InvoiceData(
                0L,
                BigDecimal.valueOf(135.0),
                LocalDate.now(),
                "EUR",
                Optional.of("Test customer"),
                Optional.of(fakeAddress()),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty());
    }

    private static ReceiptData fakeReceiptData() {
        return new ReceiptData(
                -1L,
                BigDecimal.valueOf(156.9),
                Optional.of("AWS"),
                Optional.of(fakeAddress()),
                Optional.empty());
    }

    private static Address fakeAddress() {
        return new Address(
                "Germany",
                "85276",
                "Bavaria",
                "Pfaffenhofen",
                "Bistumerweg",
                "5");
    }

}
