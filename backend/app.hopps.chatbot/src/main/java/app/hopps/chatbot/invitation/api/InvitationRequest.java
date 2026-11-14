package app.hopps.chatbot.invitation.api;

/**
 * An invitation org asks the chatbot to send.
 *
 * @param phoneNumber
 *            international format, digits only
 * @param token
 *            goes into the Accept/Decline button payloads
 */
public record InvitationRequest(
        String phoneNumber,
        String recipientName,
        String inviterName,
        String bommelLabel,
        String organizationName,
        String token) {
}
