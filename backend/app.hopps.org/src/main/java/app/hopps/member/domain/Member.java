package app.hopps.member.domain;

import app.hopps.organization.domain.Organization;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;

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
     * The stable, immutable Keycloak user id (the JWT {@code sub} claim). This is the canonical link between a Keycloak
     * identity and this member. Unlike the email, it never changes when the user updates their profile. Nullable
     * because a member is validated before the Keycloak user is provisioned.
     */
    @JsonIgnore
    @Column(name = "keycloak_id", unique = true)
    private String keycloakId;

    @ManyToMany
    @JoinTable(name = "member_verein", joinColumns = @JoinColumn(name = "member_id"))
    @Schema(examples = "[]")
    private Collection<Organization> organizations = new ArrayList<>();

    /**
     * Last time this member made an authenticated request, stamped (throttled) by {@code LastSeenFilter}.
     */
    @JsonIgnore
    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @JsonIgnore
    public Collection<Organization> getOrganizations() {
        return Collections.unmodifiableCollection(organizations);
    }

    public void setOrganizations(Collection<Organization> organizations) {
        this.organizations = organizations;
    }

    public void addOrganization(Organization organization) {
        this.organizations.add(organization);
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
}
