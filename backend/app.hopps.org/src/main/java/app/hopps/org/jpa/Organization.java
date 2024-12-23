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

import java.net.URL;
import java.util.HashSet;
import java.util.Set;

@Entity
public class Organization extends PanacheEntity {

    @NotBlank
    private String name;

    @NotBlank
    @Pattern(regexp = "^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    private String slug;

    @NotNull
    private TYPE type;

    @Embedded
    private Address address;

    @OneToOne(cascade = { CascadeType.DETACH, CascadeType.REFRESH, CascadeType.PERSIST, CascadeType.MERGE })
    private Bommel rootBommel;

    @ManyToMany(mappedBy = "organizations", cascade = CascadeType.PERSIST)
    private Set<Member> members = new HashSet<>();

    private URL website;
    private URL profilePicture;

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
}
