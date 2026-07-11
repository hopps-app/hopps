package app.hopps.organization.api.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.Instant;

/**
 * One row of the admin organizations table. Aggregates a few cross-entity metrics ({@code belegeCount},
 * {@code lastActivityAt}) alongside core organization fields. {@code contactEmail} is the email of the organization's
 * owner (the member set as responsible for the root bommel at registration), falling back to any member, then null.
 */
@Schema(description = "A single organization row for the admin overview table")
public record AdminOrganizationRow(
        @Schema(description = "Organization id", examples = "42") Long id,
        @Schema(description = "Organization name", examples = "Raketenfreunde e.V.") String name,
        @Schema(description = "URL-safe unique slug", examples = "raketen-freunde") String slug,
        @Schema(description = "Owner's email, or any member's email, or null", examples = "kim@raketenfreunde.tld") String contactEmail,
        @Schema(description = "Number of transactions (Belege) booked for this organization", examples = "128") long belegeCount,
        @Schema(description = "Most recent activity across all members, or null if never seen", examples = "2024-06-01T09:15:00Z") Instant lastActivityAt,
        @Schema(description = "When the organization was registered", examples = "2024-01-15T10:30:00Z") Instant createdAt) {
}
