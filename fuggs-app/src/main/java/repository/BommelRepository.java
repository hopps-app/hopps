package repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import model.Bommel;

@ApplicationScoped
public class BommelRepository implements PanacheRepositoryBase<Bommel, String>
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
