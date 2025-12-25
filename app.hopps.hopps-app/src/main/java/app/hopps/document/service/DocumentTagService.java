package app.hopps.document.service;

import app.hopps.document.domain.Document;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import io.quarkiverse.langchain4j.RegisterAiService;
import jakarta.json.JsonObject;

import java.util.List;

@RegisterAiService
public interface DocumentTagService
{
	@SystemMessage("""
		You will receive information about receipts and invoices
		in JSON format, and assign them tags accordingly.
		These tags have to accurately describe what product or service
		was purchased. Do not include locational data.
		Tags have to be lower case and short (below 15 characters).
		Do not put them into a structured list. Only generate
		the tags themselves.

		For example, if you receive a receipt for "Pizzeria Tre Farine",
		you will output tags like "food" and "pizza". Do not output
		the location of the pizzeria. Do not output " - food".

		If you receive an invoice for AWS, you will output tags like
		"cloud", "servers" and "hosting".
		""")
	@UserMessage("Analyze the document and generate tags based on the content: {document}")
	List<String> tagDocument(@V("document") Document document);
}
