package app.hopps.chatbot.chat.service;

import app.hopps.chatbot.org.client.dto.OrgConnection;

/**
 * Fixed texts of the bot. German, neutral address (no "Sie", no "du"), like the rest of Hopps.
 */
// TODO i18n: pick the language per contact.
public final class ChatReplies {
    public static final String UNSUPPORTED_FILE = "Bitte ein Foto (JPEG/PNG) oder eine PDF-Datei des Belegs senden.";
    public static final String NOT_CONNECTED = "Diese Nummer ist noch mit keinem Bommel verbunden. Dafür braucht es "
            + "eine Einladung: Jemand aus dem Verein kann die Nummer in Hopps unter Struktur → Bommel → WhatsApp "
            + "einladen.";
    public static final String DUPLICATE = "Diesen Beleg gibt es in Hopps schon.";
    public static final String TOO_MANY = "Gerade kamen zu viele Anfragen. Bitte später noch einmal versuchen.";
    public static final String TECHNICAL_PROBLEM = "Gerade gibt es ein technisches Problem. Bitte später noch einmal "
            + "versuchen.";
    public static final String UNKNOWN_INVITATION = "Diese Einladung gilt nicht mehr, vermutlich wurde inzwischen eine "
            + "neuere geschickt oder sie wurde zurückgezogen.";
    public static final String EXPIRED_INVITATION = "Diese Einladung ist abgelaufen. Bitte im Verein um eine neue "
            + "Einladung bitten.";
    public static final String DECLINED = "Einladung abgelehnt. Es kommen keine weiteren Nachrichten dazu.";
    public static final String DISCONNECTED = "Diese Nummer ist jetzt von Hopps getrennt. Für eine neue Verbindung "
            + "braucht es eine neue Einladung aus dem Verein.";
    public static final String WAS_NOT_CONNECTED = "Diese Nummer ist mit keinem Bommel verbunden.";
    public static final String ACCEPT_BUTTON = "Annehmen";
    public static final String DECLINE_BUTTON = "Ablehnen";

    private ChatReplies() {
    }

    /** The invitation as the debug channel shows it; mirrors the WhatsApp template's body. */
    public static String invitation(String inviterName, String bommelLabel, String organizationName) {
        return inviterName + " lädt ein, Belege für " + bommelLabel + " (" + organizationName + ") per WhatsApp an "
                + "Hopps zu schicken. Einfach ein Foto oder PDF in diesen Chat senden.";
    }

    public static String accepted(OrgConnection connection) {
        if (connection.previousBommelName() != null) {
            return "Diese Nummer gehört jetzt zu " + connection.bommelLabel() + " (" + connection.organizationName()
                    + ") statt zu " + connection.previousBommelName() + ". Belege landen ab sofort dort.";
        }
        return "Verbunden mit " + connection.bommelLabel() + " (" + connection.organizationName() + "). Belege "
                + "einfach als Foto oder PDF hier in den Chat schicken. Mit STOP lässt sich die Verbindung trennen.";
    }

    public static String receiptFiled(OrgConnection connection) {
        return "Danke, der Beleg ist bei " + connection.bommelLabel() + " angekommen und wird jetzt ausgelesen.";
    }
}
