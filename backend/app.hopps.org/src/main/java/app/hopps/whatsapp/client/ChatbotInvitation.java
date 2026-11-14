package app.hopps.whatsapp.client;

/**
 * What the chatbot needs to send an invitation.
 *
 * @param token
 *            goes into the Accept/Decline buttons and comes back with the answer
 */
public record ChatbotInvitation(
        String phoneNumber,
        String recipientName,
        String inviterName,
        String bommelLabel,
        String organizationName,
        String token) {
}
