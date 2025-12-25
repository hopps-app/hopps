package app.hopps.shared.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import app.hopps.shared.domain.Tag;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TagRepository implements PanacheRepository<Tag>
{
	public Optional<Tag> findByName(String name)
	{
		return find("name", name).firstResultOptional();
	}

	public List<Tag> findAllOrderedByName()
	{
		return list("ORDER BY name");
	}

	/**
	 * Finds existing tags or creates new ones for the given tag names. This
	 * ensures tag reuse across entities.
	 */
	public Set<Tag> findOrCreateTags(Set<String> tagNames)
	{
		return tagNames.stream()
			.map(this::findOrCreateTag)
			.collect(Collectors.toSet());
	}

	/**
	 * Finds an existing tag by name or creates a new one.
	 */
	public Tag findOrCreateTag(String name)
	{
		return findByName(name).orElseGet(() -> {
			Tag tag = new Tag(name);
			persist(tag);
			return tag;
		});
	}
}
