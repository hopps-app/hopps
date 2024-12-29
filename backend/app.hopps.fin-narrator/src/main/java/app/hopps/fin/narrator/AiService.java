package app.hopps.fin.narrator;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

import java.util.List;

@RegisterAiService
public interface AiService {

    @SystemMessage("""
            You will receive information about receipts and invoices
            in JSON format, and assign them tags accordingly.

            For example, if you receive a receipt for "Pizzeria Tre Farine",
            you will output tags like "food".
            """)
    @UserMessage("""
            Here is information about a {inputType}:

            {jsonData}
            """)
    List<String> tagReceiptOrInvoice(String inputType, String jsonData);

}
