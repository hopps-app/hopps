package app.hopps.document.repository;

import java.util.List;

import app.hopps.document.domain.Document;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class DocumentRepository implements PanacheRepository<Document>
{
	public List<Document> findAllOrderedByDate()
	{
		return find("SELECT DISTINCT d FROM Document d LEFT JOIN FETCH d.documentTags ORDER BY d.transactionTime DESC, d.createdAt DESC")
			.list();
	}

	public List<Document> findByBommelId(Long bommelId)
	{
		return find("SELECT DISTINCT d FROM Document d LEFT JOIN FETCH d.documentTags WHERE d.bommel.id = ?1 ORDER BY d.transactionTime DESC",
			bommelId).list();
	}

	public List<Document> findUnassigned()
	{
		return find("bommel IS NULL ORDER BY createdAt DESC").list();
	}
}
