package app.fuggs.document.domain;

import app.fuggs.shared.domain.Tag;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Links a Document to a Tag with additional metadata about the source.
 */
@Entity
@Table(name = "document_tag", uniqueConstraints = @UniqueConstraint(columnNames = { "document_id", "tag_id" }))
public class DocumentTag extends PanacheEntity
{
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	private Document document;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	private Tag tag;

	@Enumerated(EnumType.STRING)
	private TagSource source;

	public DocumentTag()
	{
		// no args
	}

	public DocumentTag(Document document, Tag tag, TagSource source)
	{
		this.document = document;
		this.tag = tag;
		this.source = source;
	}

	public Long getId()
	{
		return id;
	}

	public Document getDocument()
	{
		return document;
	}

	public void setDocument(Document document)
	{
		this.document = document;
	}

	public Tag getTag()
	{
		return tag;
	}

	public void setTag(Tag tag)
	{
		this.tag = tag;
	}

	public TagSource getSource()
	{
		return source;
	}

	public void setSource(TagSource source)
	{
		this.source = source;
	}

	public boolean isAiGenerated()
	{
		return source == TagSource.AI;
	}

	public boolean isManual()
	{
		return source == TagSource.MANUAL;
	}

	/**
	 * Returns the tag name (convenience method for templates).
	 */
	public String getName()
	{
		return tag != null ? tag.getName() : null;
	}
}
