package app.hopps.whatsapp.api.dto;

import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

/** Multipart body of a receipt the chatbot received from a connected phone number. */
@Schema(name = "WhatsAppReceiptForm", requiredProperties = { "file" })
public record WhatsAppReceiptForm(
        @RestForm("file") @Schema(type = SchemaType.STRING, format = "binary", description = "The receipt (PNG, JPEG or PDF)") FileUpload file,
        @RestForm("caption") @Schema(description = "Text sent along with the file", maxLength = 2000, nullable = true) String caption) {
}
