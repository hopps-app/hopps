package app.hopps.org.jpa;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.ArrayList;
import java.util.Collection;

@Entity
public class Member extends PanacheEntity {

    // TODO: Add OneToMany to Bommel here and test it

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @NotBlank
    @Email
    private String email;

    @ManyToMany
    @JoinTable(name = "member_verein", joinColumns = @JoinColumn(name = "member_id"))
    private Collection<Organization> organizations = new ArrayList<>();

    @JsonIgnore
    public Collection<Organization> getOrganizations() {
        return organizations;
    }

    public void setOrganizations(Collection<Organization> vereine) {
        this.organizations = vereine;
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
