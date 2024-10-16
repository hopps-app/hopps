package app.hopps.org.jpa;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.util.Objects;
import java.util.Set;

@Entity
public class Bommel extends PanacheEntity {

    private String name;
    private char emoji;

    @ManyToOne(cascade = {CascadeType.DETACH})
    private Member responsibleMember;

    // TODO: Make sure this has an index on it, so we can
    // quickly find children
    @ManyToOne(fetch = FetchType.LAZY)
    private Bommel parent;

    @OneToMany(fetch = FetchType.LAZY, cascade = {CascadeType.REFRESH}, mappedBy = "parent")
    private Set<Bommel> children;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public char getEmoji() {
        return emoji;
    }

    public void setEmoji(char emoji) {
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
                && emoji == bommel.emoji
                && Objects.equals(name, bommel.name)
                && Objects.equals(responsibleMember, bommel.responsibleMember)
                && Objects.equals(parent.id, bommel.parent.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, emoji, responsibleMember, parent.id);
    }
}
