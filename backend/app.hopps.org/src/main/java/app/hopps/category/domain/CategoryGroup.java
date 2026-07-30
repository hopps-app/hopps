package app.hopps.category.domain;

import app.hopps.bommel.domain.Bommel;
import app.hopps.organization.domain.Organization;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * A named categorisation axis for a single organization (e.g. "Kostenstelle", "Projekt", an SKR04 chart of accounts).
 * <p>
 * A group is assigned to zero or more bommels and applies to a transaction's bommel B when an assigned bommel is B or
 * an ancestor of B. An <b>empty</b> assignment set means the group applies to <b>no</b> bommel; to make it apply to
 * every bommel, assign it to the organization's root bommel (inheritance covers all descendants).
 * <p>
 * A group may hold hundreds or thousands of {@link CategoryGroupValue}s, so values are never serialized directly — they
 * are always fetched paginated/searched via dedicated endpoints.
 */
@Entity
@Table(name = "category_group")
@Schema(name = "CategoryGroup", description = "A categorisation axis whose applicability depends on the bommel")
public class CategoryGroup extends PanacheEntity {

    @NotBlank
    private String name;

    private boolean required;

    @NotNull
    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id")
    @JsonIgnore
    private Organization organization;

    @OneToMany(mappedBy = "categoryGroup", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<CategoryGroupValue> values = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "category_group_bommel", joinColumns = @JoinColumn(name = "category_group_id"), inverseJoinColumns = @JoinColumn(name = "bommel_id"))
    @JsonIgnore
    private Set<Bommel> bommels = new HashSet<>();

    public CategoryGroup() {
        // no args constructor
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public List<CategoryGroupValue> getValues() {
        return values;
    }

    public void setValues(List<CategoryGroupValue> values) {
        this.values = values;
    }

    public Set<Bommel> getBommels() {
        return bommels;
    }

    public void setBommels(Set<Bommel> bommels) {
        this.bommels = bommels;
    }
}
