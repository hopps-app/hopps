package app.hopps.org.jpa;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;

import java.util.Objects;
import java.util.Set;

@Entity
@Table(indexes = @Index(columnList = "parent_id"))
public class Bommel extends PanacheEntity {

    private String name;
    private String emoji;

    @ManyToOne(cascade = {CascadeType.DETACH})
    private Member responsibleMember;

    // TODO: Make sure this has an index on it, so we can
    // quickly find children
    @ManyToOne(fetch = FetchType.LAZY, cascade = {CascadeType.REFRESH, CascadeType.DETACH})
    private Bommel parent;

    @OneToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.REFRESH, CascadeType.DETACH, CascadeType.REMOVE}, mappedBy = "parent")
    private Set<Bommel> children;

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

    public Bommel getParent() {
        return parent;
    }

    public void setParent(Bommel parent) {
        this.parent = parent;
    }

    public Set<Bommel> getChildren() {
        return children;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Bommel bommel = (Bommel) o;
        return Objects.equals(id, bommel.id)
                && Objects.equals(getEmoji(), bommel.getEmoji())
                && Objects.equals(getName(), bommel.getName())
                && Objects.equals(getResponsibleMember(), bommel.getResponsibleMember())
                && Objects.equals(getParent() != null ? getParent().id : null, bommel.getParent() != null ? bommel.getParent().id : null)
                && Objects.equals(getChildren(), bommel.getChildren());
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, emoji, responsibleMember, parent.id);
    }
}
