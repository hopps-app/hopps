package app.hopps.whatsapp.api.dto;

/** Confirms a receipt filed through WhatsApp (internal API). */
public record WhatsAppReceiptResponse(String fileName, String bommelName) {
}
