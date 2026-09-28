package app.hopps.organization.domain;

import app.hopps.bommel.domain.Bommel;
import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberOrganization;
import app.hopps.member.domain.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;

import java.net.URL;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Schema(name = "Organization", description = "An example of a Hopps Organization, i.e. Verein")
// Soft-delete: a non-null deleted_at hides the organization from every normal query and relationship.
// Admin soft-delete sets this column instead of removing the row; nothing outside a native query sees deleted orgs.
@SQLRestriction("deleted_at is null")
public class Organization extends PanacheEntity {

    @NotBlank
    @Schema(examples = "Raketenfreunde e.V.")
    private String name;

    @NotBlank
    @Pattern(regexp = "^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    @Schema(examples = "raketen-freunde")
    private String slug;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Schema(examples = "EINGETRAGENER_VEREIN")
    private OrganizationType type;

    @Embedded
    private Address address;

    @OneToOne(cascade = { CascadeType.DETACH, CascadeType.REFRESH, CascadeType.PERSIST, CascadeType.MERGE })
    @Schema(examples = "null")
    private Bommel rootBommel;

    /**
     * The inverse, non-owning side of {@link Member#getOrganizations()} — {@link Member} is what persists new
     * memberships, this side exists so a freshly built {@link Organization} can carry its members in memory (e.g. for
     * serializing the response right after creation) and so an existing one can list them back out.
     */
    @OneToMany(mappedBy = "organization", fetch = FetchType.LAZY)
    @Schema(hidden = true)
    private List<MemberOrganization> memberships = new ArrayList<>();

    @Schema(examples = "https://raketenfreunde.tld")
    private URL website;

    @Schema(examples = "https://example.com/avatar.png")
    private URL profilePicture;

    @Schema(examples = "2001-05-15")
    private LocalDate foundingDate;

    @Schema(examples = "Amtsgericht München")
    private String registrationCourt;

    @Schema(examples = "VR 12345")
    private String registrationNumber;

    @Schema(examples = "DE")
    private String country;

    @Schema(examples = "123/456/78901")
    private String taxNumber;

    @Schema(examples = "info@raketenfreunde.tld")
    private String email;

    @Schema(examples = "+49 123 4567890")
    private String phoneNumber;

    @Schema(description = "Whether uploaded documents should be automatically analyzed by AI", examples = "true")
    private boolean autoAnalyzeDocuments = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    @Schema(description = "When the organization was registered", examples = "2024-01-15T10:30:00Z")
    private Instant createdAt;

    @Column(name = "deleted_at")
    @Schema(description = "Soft-delete marker; null while the organization is active", examples = "null")
    private Instant deletedAt;

    @JsonIgnore
    @Schema(hidden = true)
    private String logoKey;

    @JsonIgnore
    @Schema(hidden = true)
    private String logoContentType;

    public Organization() {
        // no args constructor
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public OrganizationType getType() {
        return type;
    }

    public void setType(OrganizationType type) {
        this.type = type;
    }

    public Address getAddress() {
        return address;
    }

    public void setAddress(Address address) {
        this.address = address;
    }

    public URL getWebsite() {
        return website;
    }

    public void setWebsite(URL website) {
        this.website = website;
    }

    public URL getProfilePicture() {
        return profilePicture;
    }

    public void setProfilePicture(URL profilePicture) {
        this.profilePicture = profilePicture;
    }

    @JsonIgnore
    public String getLogoKey() {
        return logoKey;
    }

    public void setLogoKey(String logoKey) {
        this.logoKey = logoKey;
    }

    @JsonIgnore
    public String getLogoContentType() {
        return logoContentType;
    }

    public void setLogoContentType(String logoContentType) {
        this.logoContentType = logoContentType;
    }

    /**
     * Whether a logo has been uploaded for this organization. Exposed instead of the S3 key so clients know when to
     * fetch {@code GET /organization/my/logo}.
     */
    @JsonProperty("hasLogo")
    @Schema(description = "Whether a logo has been uploaded for this organization", examples = "true")
    public boolean hasLogo() {
        return logoKey != null && !logoKey.isBlank();
    }

    public Set<Member> getMembers() {
        return memberships.stream()
                .map(MemberOrganization::getMember)
                .collect(Collectors.toCollection(HashSet::new));
    }

    /**
     * In-memory bookkeeping only — {@link Member#addOrganization(Organization, Role)} is what actually persists the
     * membership. Called alongside it (with the same role) so a freshly built organization already lists its members
     * before it is ever read back from the database.
     */
    public void addMember(Member member, Role role) {
        this.memberships.add(new MemberOrganization(member, this, role));
    }

    public Bommel getRootBommel() {
        return rootBommel;
    }

    public void setRootBommel(Bommel rootBommel) {
        this.rootBommel = rootBommel;
    }

    public LocalDate getFoundingDate() {
        return foundingDate;
    }

    public void setFoundingDate(LocalDate foundingDate) {
        this.foundingDate = foundingDate;
    }

    public String getRegistrationCourt() {
        return registrationCourt;
    }

    public void setRegistrationCourt(String registrationCourt) {
        this.registrationCourt = registrationCourt;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getTaxNumber() {
        return taxNumber;
    }

    public void setTaxNumber(String taxNumber) {
        this.taxNumber = taxNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public boolean isAutoAnalyzeDocuments() {
        return autoAnalyzeDocuments;
    }

    public void setAutoAnalyzeDocuments(boolean autoAnalyzeDocuments) {
        this.autoAnalyzeDocuments = autoAnalyzeDocuments;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
