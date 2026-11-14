package app.hopps.chatbot.chat.service;

import app.hopps.chatbot.org.client.dto.OrgConnection;

/**
 * Fixed replies of the bot. German, neutral address (no "Sie", no "du"), like the rest of Hopps.
 */
// TODO i18n: pick the language per contact.
public final class ChatReplies {
    public static final String UNSUPPORTED_FILE = "Bitte ein Foto (JPEG/PNG) oder eine PDF-Datei des Belegs senden.";
    public static final String NOT_CONNECTED = "Diese Nummer ist noch mit keinem Bommel verbunden. Zuerst den "
            + "WhatsApp-Einladungslink aus Hopps öffnen (Struktur → Bommel → WhatsApp) und die vorbereitete "
            + "Nachricht abschicken.";
    public static final String DUPLICATE = "Diesen Beleg gibt es in Hopps schon.";
    public static final String TOO_MANY = "Gerade kamen zu viele Anfragen. Bitte später noch einmal versuchen.";
    public static final String TECHNICAL_PROBLEM = "Gerade gibt es ein technisches Problem. Bitte später noch einmal "
            + "versuchen.";
    public static final String UNKNOWN_CODE = "Dieser Code ist unbekannt oder wurde ersetzt. Bitte den aktuellen "
            + "Einladungslink aus Hopps verwenden.";
    public static final String EXPIRED_CODE = "Diese Einladung ist abgelaufen. Bitte im Verein nach einem neuen "
            + "Einladungslink fragen.";
    public static final String DISCONNECTED = "Diese Nummer ist jetzt von Hopps getrennt. Zum erneuten Verbinden "
            + "einfach wieder einen Einladungslink öffnen.";
    public static final String WAS_NOT_CONNECTED = "Diese Nummer ist mit keinem Bommel verbunden.";

    private ChatReplies() {
    }

    public static String joined(OrgConnection connection) {
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
