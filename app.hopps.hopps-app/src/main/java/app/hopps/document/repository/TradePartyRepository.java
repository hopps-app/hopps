package app.hopps.document.repository;

import java.util.List;

import app.hopps.document.domain.TradeParty;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TradePartyRepository implements PanacheRepository<TradeParty>
{
	public List<TradeParty> findByNameContaining(String name)
	{
		return find("LOWER(name) LIKE LOWER(?1)", "%" + name + "%").list();
	}
}
