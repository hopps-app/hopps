package app.hopps.fin.narrator;

import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkiverse.wiremock.devservice.ConnectWireMock;
import io.quarkus.test.common.http.TestHTTPEndpoint;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
@ConnectWireMock
@TestHTTPEndpoint(TaggingResource.class)
class TaggingResourceTest {

    private static final String OPENAI_RECEIPT_RESPONSE = """
            {
               "id": "chatcmpl-sdofjsdlkfjslkdjfl",
               "object": "chat.completion",
               "created": 1737565229,
               "model": "gpt-4o-mini-2024-07-18",
               "choices": [
                 {
                   "index": 0,
                   "message": {
                     "role": "assistant",
                     "content": "grocery  \\nfood  ",
                     "refusal": null
                   },
                   "logprobs": null,
                   "finish_reason": "stop"
                 }
               ],
               "usage": {
                 "prompt_tokens": 227,
                 "completion_tokens": 6,
                 "total_tokens": 233,
                 "prompt_tokens_details": {
                   "cached_tokens": 0,
                   "audio_tokens": 0
                 },
                 "completion_tokens_details": {
                   "reasoning_tokens": 0,
                   "audio_tokens": 0,
                   "accepted_prediction_tokens": 0,
                   "rejected_prediction_tokens": 0
                 }
               },
               "service_tier": "default",
               "system_fingerprint": "..."
            }""";

    private static final String OPENAI_INVOICE_RESPONSE = """
            {
               "id": "chatcmpl-sdofjsdlkfjslkdjfl",
               "object": "chat.completion",
               "created": 1737565229,
               "model": "gpt-4o-mini-2024-07-18",
               "choices": [
                 {
                   "index": 0,
                   "message": {
                     "role": "assistant",
                     "content": "cloud  \\nservers  \\nhosting  ",
                     "refusal": null
                   },
                   "logprobs": null,
                   "finish_reason": "stop"
                 }
               ],
               "usage": {
                 "prompt_tokens": 227,
                 "completion_tokens": 6,
                 "total_tokens": 233,
                 "prompt_tokens_details": {
                   "cached_tokens": 0,
                   "audio_tokens": 0
                 },
                 "completion_tokens_details": {
                   "reasoning_tokens": 0,
                   "audio_tokens": 0,
                   "accepted_prediction_tokens": 0,
                   "rejected_prediction_tokens": 0
                 }
               },
               "service_tier": "default",
               "system_fingerprint": "..."
            }""";

    private static final String RECEIPT_TAGGING_REQUEST = """
            {
                "total": 3.36,
                "subTotal": 3.14,
                "storeName": "Kaufland",
                "storeAddress": {
                  "countryOrRegion": "DE",
                  "postalCode": 85354,
                  "state": "Bavaria",
                  "city": "Freising",
                  "road": "Gutenbergstraße",
                  "houseNumber": 2
                }
            }""";

    private static final String INVOICE_TAGGING_REQUEST = """
            {
                "total": 32843.24,
                "currency": "USD",
                "store": "Azure Billing"
            }""";

    WireMock wireMock;

    @Test
    void tagSimpleReceipt() {
        wireMock.register(post(urlEqualTo("/chat/completions"))
                .willReturn(aResponse().withStatus(200).withBody(OPENAI_RECEIPT_RESPONSE)));

        given().body(RECEIPT_TAGGING_REQUEST)
                .contentType(ContentType.JSON)
                .when()
                .post("receipt")
                .then()
                .statusCode(200)
                .body("[0]", equalTo("grocery"))
                .body("[1]", equalTo("food"));
    }

    @Test
    void tagSimpleInvoice() {
        wireMock.register(post(urlEqualTo("/chat/completions"))
                .willReturn(aResponse().withStatus(200).withBody(OPENAI_INVOICE_RESPONSE)));

        given().body(INVOICE_TAGGING_REQUEST)
                .contentType(ContentType.JSON)
                .when()
                .post("invoice")
                .then()
                .statusCode(200)
                .body("[0]", equalTo("cloud"))
                .body("[1]", equalTo("servers"))
                .body("[2]", equalTo("hosting"));
    }
}
