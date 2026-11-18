package app.hopps.whatsapp.api.dto;

import app.hopps.bommel.domain.Bommel;
import app.hopps.organization.domain.Organization;

/**
 * Which bommel a phone number is connected to (internal API).
 *
 * @param previousBommelName
 *            set after a join that moved the number away from another bommel
 */
public record WhatsAppConnection(
        String organizationName,
        Long bommelId,
        String bommelName,
        String bommelEmoji,
        String previousBommelName) {

    public static WhatsAppConnection of(Organization organization, Bommel bommel, Bommel previous) {
        return new WhatsAppConnection(organization.getName(), bommel.id, bommel.getName(), bommel.getEmoji(),
                previous != null ? previous.getName() : null);
    }
}
