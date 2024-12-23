package app.hopps.org.jpa;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;

import java.util.Objects;
import java.util.Set;

@Entity
@Table(indexes = @Index(columnList = "parent_id"))
@NamedQuery(name = "Bommel.GetParentsRecursive", query = """
                    with parents as (
                        select n.parent.id as bommel
                        from Bommel n
                        where n.id = :startId
        
                        union
        
                        select n.parent.id as bommel
                        from Bommel n
                        join parents c on n.id = c.bommel
                    ) cycle bommel set cycleMark using cyclePath
                    select n as bommel, cycleMark as cycleMark, cyclePath as cyclePath
                    from Bommel n
                    join parents c on n.id = c.bommel
        """)
@NamedQuery(name = "Bommel.GetChildrenRecursive", query = """
                    with children_query as (
                        select n.id as bommel
                        from Bommel n
                        where n.id = :startId
        
                        union
        
                        select n.id as bommel
                        from Bommel n
                        join children_query c on n.parent.id = c.bommel
                    ) cycle bommel set cycleMark using cyclePath
                    select n as bommel, cycleMark as cycleMark, cyclePath as cyclePath
                    from Bommel n
                    join children_query c on n.id = c.bommel
                    where n.id != :startId or cycleMark = true
        """)
@SequenceGenerator(name = "Bommel_SEQ", allocationSize = 1)
public class Bommel extends PanacheEntity {
    public static final String DEFAULT_ROOT_BOMMEL_EMOJI = "\uD83C\uDF33"; // tree

    private String name;
    private String emoji;

    @ManyToOne(cascade = {CascadeType.DETACH, CascadeType.REFRESH})
    private Member responsibleMember;

    @OneToOne(mappedBy = "rootBommel", cascade = {CascadeType.DETACH, CascadeType.REFRESH, CascadeType.PERSIST,
            CascadeType.MERGE})
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, cascade = {CascadeType.REFRESH, CascadeType.DETACH})
    private Bommel parent;

    @OneToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.REFRESH, CascadeType.DETACH,
            CascadeType.REMOVE}, mappedBy = "parent")
    private Set<Bommel> children;

    /**
     * Merges other into this object. Changes every field to that of other, except for the parent or childrens.
     * Therefore, this cannot move the Bommel in the tree, only update it/its responsible member.
     */
    public void merge(Bommel other) {
        this.setName(other.getName());
        this.setEmoji(other.getEmoji());
        this.setResponsibleMember(other.getResponsibleMember());
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmoji() {
        return emoji;
    }

    public void setEmoji(String emoji) {
        this.emoji = emoji;
    }

    public Member getResponsibleMember() {
        return responsibleMember;
    }

    public void setResponsibleMember(Member responsibleMember) {
        this.responsibleMember = responsibleMember;
    }

    public Organization getOrganization() {
        return organization;
    }

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public Bommel getParent() {
        return parent;
    }

    // Write-only, because when reading the id-only setter right below this should be used.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    public void setParent(Bommel parent) {
        this.parent = parent;
    }

    /**
     * This gets the parent bommel, with only the id set. Required for jackson, otherwise we would have unwanted
     * recursion.
     */
    @JsonProperty(value = "parent", access = JsonProperty.Access.READ_ONLY)
    public Bommel getOnlyParentId() {
        if (this.getParent() == null) {
            return null;
        }

        var parentBommel = new Bommel();
        parentBommel.id = this.getParent().id;

        return parentBommel;
    }

    @JsonIgnore
    public Set<Bommel> getChildren() {
        return children;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }

        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Bommel bommel = (Bommel) o;

        return Objects.equals(id, bommel.id)
                && Objects.equals(getEmoji(), bommel.getEmoji())
                && Objects.equals(getName(), bommel.getName())
                && Objects.equals(getResponsibleMember(), bommel.getResponsibleMember())
                && Objects.equals(getParent() != null ? getParent().id : null,
                bommel.getParent() != null ? bommel.getParent().id : null)
                && Objects.equals(getOrganization() != null ? getOrganization().getId() : null,
                bommel.getOrganization() != null ? bommel.getOrganization().getId() : null)
                && Objects.equals(getChildren(), bommel.getChildren());
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, emoji, responsibleMember, getParent() == null ? null : getParent().id,
                getOrganization() == null ? null : getOrganization().getId());
    }

    @Override
    public String toString() {
        return "Bommel{" +
                "id=" + id +
                ", parent.id=" + (parent != null ? parent.id : null) +
                ", organization.id=" + (organization != null ? organization.getId() : null) +
                ", responsibleMember=" + responsibleMember +
                ", emoji='" + emoji + '\'' +
                ", name='" + name + '\'' +
                '}';
    }
}
