package app.hopps.category.domain;

import app.hopps.organization.domain.Organization;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Entity
@Schema(name = "Category", description = "A category for organizing content or entities")
public class Category extends PanacheEntity {

    @NotBlank
    @Schema(examples = "Technology")
    @Column(length = 255)
    private String name;

    @Schema(examples = "Category for technology-related items")
    private String description;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "organization_id")
    @Schema(description = "The organization this category belongs to")
    @JsonIgnore
    private Organization organization;

    public Category() {
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }
}
