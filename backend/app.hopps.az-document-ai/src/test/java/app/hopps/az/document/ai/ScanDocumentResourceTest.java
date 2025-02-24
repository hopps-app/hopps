package app.hopps.az.document.ai;

import app.hopps.commons.Address;
import app.hopps.commons.InvoiceData;
import app.hopps.commons.ReceiptData;
import io.quarkus.test.InjectMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@QuarkusTest
@TestHTTPEndpoint(ScanDocumentResource.class)
class ScanDocumentResourceTest {
    private static final String INVOICE_REQUEST_BODY = "fake invoice data here";
    private static final String RECEIPT_REQUEST_BODY = "fake receipt data here";

    @InjectMock
    AzureAiService azureAiServiceMock;

    @Test
    void invoiceScanWorks() {
        // Arrange
        InvoiceData invoiceData = fakeInvoiceData();

        when(azureAiServiceMock.scanInvoice(Mockito.any(), Mockito.anyString()))
                .thenReturn(Optional.of(invoiceData));
        when(azureAiServiceMock.scanReceipt(Mockito.any(), Mockito.anyString()))
                .thenReturn(Optional.empty());

        // Act
        var receivedData = given()
                .multiPart("document", INVOICE_REQUEST_BODY)
                .multiPart("transactionRecordId", "32")
                .contentType(ContentType.MULTIPART)
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
    void receiptScanWorks() {
        // Arrange
        ReceiptData receiptData = fakeReceiptData();

        when(azureAiServiceMock.scanInvoice(Mockito.any(), Mockito.anyString()))
                .thenReturn(Optional.empty());
        when(azureAiServiceMock.scanReceipt(Mockito.any(), Mockito.anyString()))
                .thenReturn(Optional.of(receiptData));

        // Act
        var receivedData = given()
                .multiPart("document", RECEIPT_REQUEST_BODY)
                .multiPart("transactionRecordId", "32")
                .contentType(ContentType.MULTIPART)
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
        when(azureAiServiceMock.scanInvoice(Mockito.any(), Mockito.anyString()))
                .thenThrow(new RuntimeException());

        // Act + Assert
        given()
                .multiPart("document", INVOICE_REQUEST_BODY)
                .multiPart("transactionRecordId", "32")
                .contentType(ContentType.MULTIPART)
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
