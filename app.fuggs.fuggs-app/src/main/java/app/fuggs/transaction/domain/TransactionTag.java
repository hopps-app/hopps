package app.fuggs.transaction.domain;

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
 * Links a TransactionRecord to a Tag with metadata about the source. Follows
 * the same pattern as DocumentTag.
 */
@Entity
@Table(name = "transaction_tag", uniqueConstraints = @UniqueConstraint(columnNames = { "transactionRecord_id", "tag_id" }))
public class TransactionTag extends PanacheEntity
{
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	private TransactionRecord transactionRecord;

	@ManyToOne(fetch = FetchType.EAGER, optional = false)
	private Tag tag;

	@Enumerated(EnumType.STRING)
	private TagSource source;

	public TransactionTag()
	{
	}

	public TransactionTag(TransactionRecord transactionRecord, Tag tag, TagSource source)
	{
		this.transactionRecord = transactionRecord;
		this.tag = tag;
		this.source = source;
	}

	public Long getId()
	{
		return id;
	}

	public TransactionRecord getTransactionRecord()
	{
		return transactionRecord;
	}

	public void setTransactionRecord(TransactionRecord transactionRecord)
	{
		this.transactionRecord = transactionRecord;
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
