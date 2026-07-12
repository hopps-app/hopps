package app.hopps.organization.api.dto;

import app.hopps.organization.domain.Address;
import app.hopps.organization.domain.Organization;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.net.URL;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Full admin detail view of an organization: everything in {@link AdminOrganizationRow} plus the organization's static
 * profile, its members and its bank-import count. Per-organization AI token usage is intentionally not included yet —
 * no metering subsystem exists; it will be added as a separate feature.
 */
@Schema(description = "Full organization detail for the admin detail page")
public record AdminOrganizationDetail(
        Long id,
        String name,
        String slug,
        @Schema(description = "Owner's email, or any member's email, or null") String contactEmail,
        @Schema(description = "Number of uploaded documents (Belege) for this organization") long belegeCount,
        @Schema(description = "Most recent activity across all members, or null if never seen") Instant lastActivityAt,
        @Schema(description = "When the organization was registered") Instant createdAt,
        Organization.TYPE type,
        LocalDate foundingDate,
        String registrationCourt,
        String registrationNumber,
        String taxNumber,
        String country,
        URL website,
        String phoneNumber,
        Address address,
        @Schema(description = "All members linked to this organization") List<AdminMemberSummary> members,
        @Schema(description = "Number of bank statement imports run for this organization") long bankImportCount) {

    public static AdminOrganizationDetail from(Organization org, String contactEmail, long belegeCount,
            Instant lastActivityAt, long bankImportCount) {
        List<AdminMemberSummary> memberSummaries = org.getMembers()
                .stream()
                .map(AdminMemberSummary::from)
                .toList();
        return new AdminOrganizationDetail(
                org.getId(),
                org.getName(),
                org.getSlug(),
                contactEmail,
                belegeCount,
                lastActivityAt,
                org.getCreatedAt(),
                org.getType(),
                org.getFoundingDate(),
                org.getRegistrationCourt(),
                org.getRegistrationNumber(),
                org.getTaxNumber(),
                org.getCountry(),
                org.getWebsite(),
                org.getPhoneNumber(),
                org.getAddress(),
                memberSummaries,
                bankImportCount);
    }
}
