package app.hopps.shared.repository;

import app.hopps.organization.domain.Organization;
import app.hopps.shared.domain.Tag;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@ApplicationScoped
public class TagRepository implements PanacheRepository<Tag> {
    @Inject
    OrganizationContext organizationContext;

    /**
     * Finds a tag by name within the current organization.
     *
     * @param name
     *            The tag name
     *
     * @return Optional containing the tag if found
     */
    public Optional<Tag> findByName(String name) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        if (orgId == null) {
            return Optional.empty();
        }
        return find("name = ?1 and organization.id = ?2", name, orgId).firstResultOptional();
    }

    /**
     * Finds all tags for the current organization, ordered by name.
     *
     * @return List of tags
     */
    public List<Tag> findAllOrderedByName() {
        Long orgId = organizationContext.getCurrentOrganizationId();
        if (orgId == null) {
            return List.of();
        }
        return list("organization.id = ?1 ORDER BY name", orgId);
    }

    /**
     * Finds existing tags or creates new ones for the given tag names within the current organization. This ensures tag
     * reuse across entities.
     *
     * @param tagNames
     *            Set of tag names
     *
     * @return Set of tags
     */
    public Set<Tag> findOrCreateTags(Set<String> tagNames) {
        return tagNames.stream()
                .map(this::findOrCreateTag)
                .collect(Collectors.toSet());
    }

    /**
     * Finds existing tags or creates new ones for the given tag names within the specified organization.
     * Use this method when running outside of a request context (e.g., in background threads).
     *
     * @param tagNames
     *            Set of tag names
     * @param organization
     *            The organization to scope tags to
     *
     * @return Set of tags
     */
    public Set<Tag> findOrCreateTags(Set<String> tagNames, Organization organization) {
        return tagNames.stream()
                .map(name -> findOrCreateTag(name, organization))
                .collect(Collectors.toSet());
    }

    /**
     * Finds an existing tag by name within the current organization or creates a new one.
     *
     * @param name
     *            The tag name
     *
     * @return The tag
     */
    public Tag findOrCreateTag(String name) {
        return findByName(name).orElseGet(() -> {
            Organization org = organizationContext.getCurrentOrganization();
            if (org == null) {
                throw new IllegalStateException("Cannot create tag without organization context");
            }
            Tag tag = new Tag(name);
            tag.setOrganization(org);
            persist(tag);
            return tag;
        });
    }

    /**
     * Finds an existing tag by name within the specified organization or creates a new one.
     * Use this method when running outside of a request context (e.g., in background threads).
     *
     * @param name
     *            The tag name
     * @param organization
     *            The organization to scope the tag to
     *
     * @return The tag
     */
    public Tag findOrCreateTag(String name, Organization organization) {
        return findByName(name, organization).orElseGet(() -> {
            Tag tag = new Tag(name);
            tag.setOrganization(organization);
            persist(tag);
            return tag;
        });
    }

    /**
     * Finds a tag by name within the specified organization.
     *
     * @param name
     *            The tag name
     * @param organization
     *            The organization to scope the query to
     *
     * @return Optional containing the tag if found
     */
    public Optional<Tag> findByName(String name, Organization organization) {
        if (organization == null || organization.getId() == null) {
            return Optional.empty();
        }
        return find("name = ?1 and organization.id = ?2", name, organization.getId()).firstResultOptional();
    }

    /**
     * Finds a tag by ID, scoped to the current organization. This prevents cross-organization access.
     *
     * @param id
     *            The tag ID
     *
     * @return The tag, or null if not found or not in current organization
     */
    public Tag findByIdScoped(Long id) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        if (orgId == null) {
            return null;
        }
        return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
    }
}
