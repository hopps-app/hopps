package app.hopps.chatbot.org.client.dto;

/**
 * The bommel a phone number is connected to, as returned by org's internal WhatsApp API.
 *
 * @param previousBommelName
 *            set after a join that moved the number away from another bommel
 */
public record OrgConnection(
        String organizationName,
        Long bommelId,
        String bommelName,
        String bommelEmoji,
        String previousBommelName) {

    /** e.g. "🍺 Kiosk" or "Kiosk" without an emoji. */
    public String bommelLabel() {
        return bommelEmoji == null || bommelEmoji.isBlank() ? bommelName : bommelEmoji + " " + bommelName;
    }
}
