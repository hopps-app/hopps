package app.hopps.organization.domain;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Legal form (Rechtsform) of an {@link Organization}.
 * <p>
 * Persisted by name ({@link jakarta.persistence.EnumType#STRING})
 * </p>
 * <p>
 * The display strings are held in a field rather than in constant-specific class bodies on purpose: a body turns the
 * constant into an anonymous subclass, and Jackson then serializes it as a bean ({@code {"displayString":"e.V."}})
 * instead of as its name, which breaks the string enum this API publishes.
 * </p>
 */
@Schema(name = "OrganizationType", description = "Legal form of an organization")
public enum OrganizationType {

    /** Eingetragener Verein — the default and by far the most common legal form for German NGOs. */
    EINGETRAGENER_VEREIN("e.V."),
    /** Gemeinnützige GmbH — professionally run organizations with a commercial operation. */
    GEMEINNUETZIGE_GMBH("gGmbH"),
    /** Stiftung, rechtsfähig or as a Treuhandstiftung — endowed assets bound to a purpose, no members. */
    STIFTUNG("Stiftung"),
    /** Gemeinnützige Genossenschaft — members acting economically together (Bürgerenergie, social projects). */
    GEMEINNUETZIGE_GENOSSENSCHAFT("eG"),
    /** Gemeinnützige UG (haftungsbeschränkt) — the "small gGmbH" for founders with little starting capital. */
    GEMEINNUETZIGE_UG("gUG (haftungsbeschränkt)"),
    /** Fallback for anything not covered above. */
    ANDERE("Andere");

    private final String displayString;

    OrganizationType(String displayString) {
        this.displayString = displayString;
    }

    public String getDisplayString() {
        return displayString;
    }
}
