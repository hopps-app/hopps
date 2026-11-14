package app.hopps.whatsapp.api.dto;

/**
 * A phone number redeeming an invite code (internal API, sent by the chatbot).
 *
 * @param code
 *            the code as found in the message, any case, with or without separator
 * @param phoneNumber
 *            international format, digits only (a leading '+' is ignored)
 * @param displayName
 *            WhatsApp profile name, may be null
 */
public record WhatsAppJoinRequest(String code, String phoneNumber, String displayName) {
}
