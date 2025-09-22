package app.hopps.org.jpa;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.net.URL;
import java.sql.Date;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Schema(name = "Organization", description = "An example of a Hopps Organization, i.e. Verein")
public class Organization extends PanacheEntity {

    @NotBlank
    @Schema(examples = "Raketenfreunde e.V.")
    private String name;

    @NotBlank
    @Pattern(regexp = "^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    @Schema(examples = "raketen-freunde")
    private String slug;

    @NotNull
    @Schema(examples = "EINGETRAGENER_VEREIN")
    private TYPE type;

    @Embedded
    private Address address;

    @OneToOne(cascade = { CascadeType.DETACH, CascadeType.REFRESH, CascadeType.PERSIST, CascadeType.MERGE })
    @Schema(examples = "null")
    private Bommel rootBommel;

    @ManyToMany(mappedBy = "organizations", cascade = CascadeType.PERSIST)
    @Schema(examples = "[]")
    private Set<Member> members = new HashSet<>();

    @Schema(examples = "https://raketenfreunde.tld")
    private URL website;

    @Schema(examples = "https://example.com/avatar.png")
    private URL profilePicture;

    @Schema(examples = "01.02.2003")
    private Date foundationDate;

    @Schema(examples = "Amtsgericht Pfaffenhofen")
    private String registrationCourt;

    @Schema(examples = "1")
    private String registrationNumber;

    @Schema(examples = "46531254")
    private String taxId;

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

    public TYPE getType() {
        return type;
    }

    public void setType(TYPE type) {
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

    public Set<Member> getMembers() {
        return members;
    }

    public void setMembers(Set<Member> members) {
        this.members = members;
    }

    public void addMember(Member member) {
        this.members.add(member);
    }

    public Bommel getRootBommel() {
        return rootBommel;
    }

    public void setRootBommel(Bommel rootBommel) {
        this.rootBommel = rootBommel;
    }

    public enum TYPE {

        EINGETRAGENER_VEREIN {
            @Override
            public String getDisplayString() {
                return "e.V.";
            }
        };

        // for now, we will only support e.V.

        public abstract String getDisplayString();
    }

    public Date getFoundationDate() {
        return foundationDate;
    }

    public void setFoundationDate(Date foundationDate) {
        this.foundationDate = foundationDate;
    }

    public void setRegistrationCourt(String registerCourt) {
        this.registrationCourt = registerCourt;
    }

    public String getRegistrationCourt() {
        return registrationCourt;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public String getTaxId() {
        return taxId;
    }

    public void setTaxId(String taxId) {
        this.taxId = taxId;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass())
            return false;
        Organization that = (Organization) o;
        return Objects.equals(getName(), that.getName()) && Objects.equals(getSlug(), that.getSlug())
                && getType() == that.getType() && Objects.equals(getAddress(), that.getAddress())
                && Objects.equals(getRootBommel(), that.getRootBommel()) && Objects.equals(getMembers(),
                that.getMembers()) && Objects.equals(getWebsite(), that.getWebsite()) && Objects.equals(
                getProfilePicture(), that.getProfilePicture()) && Objects.equals(getFoundationDate(),
                that.getFoundationDate()) && Objects.equals(getRegistrationCourt(), that.getRegistrationCourt())
                && Objects.equals(getRegistrationNumber(), that.getRegistrationNumber())
                && Objects.equals(getTaxId(), that.getTaxId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getName(), getSlug(), getType(), getAddress(), getRootBommel(), getMembers(), getWebsite(),
                getProfilePicture(), getFoundationDate(), getRegistrationCourt(), getRegistrationNumber(), getTaxId());
    }
}
