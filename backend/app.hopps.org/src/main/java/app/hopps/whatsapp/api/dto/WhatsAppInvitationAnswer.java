package app.hopps.whatsapp.api.dto;

/**
 * The phone number that pressed Accept or Decline in an invitation (internal API, sent by the chatbot).
 *
 * @param phoneNumber
 *            international format, digits only
 */
public record WhatsAppInvitationAnswer(String phoneNumber) {
}
