package app.hopps.whatsapp.domain;

public enum WhatsAppContactStatus {
    /** Invitation sent, no answer yet. */
    INVITED,
    /** Invitation accepted: receipts from the number are filed in the bommel. */
    ACTIVE,
    /** Invitation declined in WhatsApp. */
    DECLINED
}
