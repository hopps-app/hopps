package app.hopps.org.jpa;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.ArrayList;
import java.util.Collection;

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

    @ManyToMany
    @JoinTable(name = "member_verein", joinColumns = @JoinColumn(name = "member_id"))
    @Schema(examples = "[]")
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
