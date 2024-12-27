package app.hopps.fin_narrator;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService
public interface AiService {

    @SystemMessage("""
            You will receive information about receipts and invoices
            in JSON format, and assign them tags accordingly.
            Tags need to be provided in a comma-separated list.
            Do not output anything but the generated tags.
            
            For example, if you receive a receipt for "Pizzeria Tre Farine",
            you will output tags like "food".
            """)
    @UserMessage("""
            Here is information about a {inputType}:
            
            {jsonData}
            """)
    String tagReceiptOrInvoice(String inputType, String jsonData);

}
