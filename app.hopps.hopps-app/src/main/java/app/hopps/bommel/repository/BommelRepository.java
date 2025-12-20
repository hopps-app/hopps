package app.hopps.bommel.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import app.hopps.bommel.domain.Bommel;

import java.util.List;

@ApplicationScoped
public class BommelRepository implements PanacheRepository<Bommel>
{
	public Bommel findRoot()
	{
		return find("parent is null").firstResult();
	}

	public boolean hasRoot()
	{
		return findRoot() != null;
	}

	public List<Bommel> findChildren(Bommel parent)
	{
		return list("parent", parent);
	}

	public boolean hasChildren(Bommel bommel)
	{
		return count("parent", bommel) > 0;
	}
}
