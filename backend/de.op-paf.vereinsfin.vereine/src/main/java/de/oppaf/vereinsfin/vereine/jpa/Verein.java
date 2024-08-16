package de.oppaf.vereinsfin.vereine.jpa;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.net.URL;

@Entity
public class Verein extends PanacheEntity {

    @NotBlank
    private String name;

    @NotNull
    private TYPE type;

    @Embedded
    private Address address;

    private URL website;
    private URL profilePicture;

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

    public Verein() {

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
}
