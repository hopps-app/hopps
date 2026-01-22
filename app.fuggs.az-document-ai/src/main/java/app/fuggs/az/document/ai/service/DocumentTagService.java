package app.fuggs.az.document.ai.service;

import java.util.List;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService
public interface DocumentTagService
{
	@SystemMessage("""
		You will receive information about receipts and invoices
		in JSON format, and assign them tags accordingly.
		These tags have to accurately describe what product or service
		was purchased. Do not include locational data.
		Tags have to be in GERMAN language, lower case and short (below 15 characters).
		Do not put them into a structured list. Only generate
		the tags themselves.

		For example, if you receive a receipt for "Pizzeria Tre Farine",
		you will output tags like "essen" and "pizza". Do not output
		the location of the pizzeria. If you receive an invoice for AWS,
		you will output tags like "cloud", "server" and "hosting".
		If you receive an invoice for musical instruments, you will output
		tags like "instrumente" and "musik".

		Do not output meta tags like "rechnung", "beleg", "bargeld",
		"dokument", "zahlung", "transaktion", "ausgabe".

		Always generate tags in German. If needed, return an empty list.
		""")
	@UserMessage("Analyze the document and generate tags based on the content: {documentJson}")
	List<String> generateTags(@V("documentJson") String documentJson);
}
