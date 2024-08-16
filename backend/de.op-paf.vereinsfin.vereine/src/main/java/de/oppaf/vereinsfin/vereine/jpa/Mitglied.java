package de.oppaf.vereinsfin.vereine.jpa;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.ArrayList;
import java.util.Collection;

@Entity
public class Mitglied extends PanacheEntity {

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotBlank
    @Email
    private String email;

    @ManyToMany
    @JoinTable(name = "Mitglied_verein",
            joinColumns = @JoinColumn(name = "mitglied_id"))
    private Collection<Verein> vereine = new ArrayList<>();

    public Collection<Verein> getVereine() {
        return vereine;
    }

    public void setVereine(Collection<Verein> vereine) {
        this.vereine = vereine;
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
}
