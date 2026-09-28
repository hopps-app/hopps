package app.hopps.member.domain;

import app.hopps.organization.domain.Organization;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Entity
@Schema(name = "Member", description = "An example of a Hopps Member")
public class Member extends PanacheEntity {

    @NotBlank
    @Schema(examples = "Kim", description = "First Name of the Member")
    private String firstName;

    @NotBlank
    @Schema(examples = "Rakete", description = "Last Name of the Member")
    private String lastName;

    @NotBlank
    @Email
    @Schema(examples = "kim.rakete@exemple.com")
    private String email;

    /**
     * The office the person holds in the association (Vereinsfunktion), e.g. "1. Vorsitzende" or "Kassenwart". Free
     * text and optional — it is descriptive only and carries no permissions. Not to be confused with the Keycloak role
     * that governs what a user may do.
     */
    @Size(max = 255)
    @Schema(examples = "Kassenwart", description = "Office held in the association, free text and optional")
    private String position;

    /**
     * The stable, immutable Keycloak user id (the JWT {@code sub} claim). This is the canonical link between a Keycloak
     * identity and this member. Unlike the email, it never changes when the user updates their profile. Nullable
     * because a member is validated before the Keycloak user is provisioned.
     */
    @JsonIgnore
    @Column(name = "keycloak_id", unique = true)
    private String keycloakId;

    /**
     * Whether this person can log in, and how far their invitation got. Derived state as far as clients are concerned:
     * it is set when the Keycloak account is provisioned, never by the caller, hence read-only in the API.
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Schema(description = "Whether the member can log in, and how far their invitation got", examples = "INVITED")
    private MemberStatus status = MemberStatus.NO_ACCESS;

    @OneToMany(mappedBy = "member", cascade = { CascadeType.PERSIST,
            CascadeType.MERGE }, orphanRemoval = true, fetch = FetchType.LAZY)
    @Schema(hidden = true)
    private List<MemberOrganization> organizationMemberships = new ArrayList<>();

    /**
     * Last time this member made an authenticated request, stamped (throttled) by {@code LastSeenFilter}.
     */
    @JsonIgnore
    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    /**
     * One-time link in which an invited person sets their own password, for the inviting admin to pass on. Only set in
     * the response to adding a member, and only when the identity provider could not email the invitation itself
     * (Authentik without a mail server). Never persisted: it is a credential for the new account.
     */
    @Transient
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Schema(description = "One-time link in which the invited person sets their password, to be passed on by the "
            + "inviting admin. Only present right after adding a member whose invitation email could not be sent.")
    private String setupLink;

    @JsonIgnore
    public Collection<Organization> getOrganizations() {
        return organizationMemberships.stream()
                .map(MemberOrganization::getOrganization)
                .toList();
    }

    /** The role this member holds in the given organization, if they belong to it. */
    @JsonIgnore
    public Optional<Role> getRole(Organization organization) {
        return organizationMemberships.stream()
                .filter(link -> Objects.equals(link.getOrganization().getId(), organization.getId()))
                .map(MemberOrganization::getRole)
                .findFirst();
    }

    public void addOrganization(Organization organization, Role role) {
        organizationMemberships.add(new MemberOrganization(this, organization, role));
    }

    /** Ends this member's membership (and role) in the given organization, deleted via {@code orphanRemoval}. */
    public void removeOrganization(Organization organization) {
        organizationMemberships.removeIf(link -> Objects.equals(link.getOrganization().getId(), organization.getId()));
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public String getPosition() {
        return position;
    }

    public void setKeycloakId(String keycloakId) {
        this.keycloakId = keycloakId;
    }

    public String getKeycloakId() {
        return keycloakId;
    }

    public Instant getLastSeenAt() {
        return lastSeenAt;
    }

    public void setLastSeenAt(Instant lastSeenAt) {
        this.lastSeenAt = lastSeenAt;
    }

    public void setStatus(MemberStatus status) {
        this.status = status;
    }

    public MemberStatus getStatus() {
        return status;
    }

    public void setSetupLink(String setupLink) {
        this.setupLink = setupLink;
    }

    public String getSetupLink() {
        return setupLink;
    }
}
