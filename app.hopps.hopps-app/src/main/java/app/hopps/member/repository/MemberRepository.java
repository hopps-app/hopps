package app.hopps.member.repository;

import java.util.List;

import app.hopps.member.domain.Member;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class MemberRepository implements PanacheRepository<Member>
{
	public List<Member> findAllOrderedByName()
	{
		return list("ORDER BY lastName, firstName");
	}

	public List<Member> searchByName(String query)
	{
		return list("lower(firstName) like ?1 or lower(lastName) like ?1",
			"%" + query.toLowerCase() + "%");
	}
}
