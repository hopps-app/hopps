package app.hopps.member.api;

import java.util.List;

import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.RestPath;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import io.quarkiverse.renarde.Controller;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;

@Authenticated
@Path("/mitglieder")
public class MemberResource extends Controller
{
	@Inject
	MemberRepository memberRepository;

	@Inject
	app.hopps.member.service.MemberKeycloakSyncService memberKeycloakSyncService;

	private static final Logger LOG = LoggerFactory.getLogger(MemberResource.class);

	@CheckedTemplate
	public static class Templates
	{
		public static native TemplateInstance index(List<Member> members);

		public static native TemplateInstance detail(Member member);

		public static native TemplateInstance create();
	}

	@GET
	@Path("")
	public TemplateInstance index()
	{
		List<Member> members = memberRepository.findAllOrderedByName();
		return Templates.index(members);
	}

	@GET
	@Path("/neu")
	public TemplateInstance create()
	{
		return Templates.create();
	}

	@GET
	@Path("/{id}")
	public TemplateInstance detail(@RestPath Long id)
	{
		Member member = memberRepository.findById(id);
		if (member == null)
		{
			flash("error", "Mitglied nicht gefunden");
			redirect(MemberResource.class).index();
			return null;
		}
		return Templates.detail(member);
	}

	@POST
	@Path("/erstellen")
	@Transactional
	@RolesAllowed("admin")
	public void doCreate(
		@RestForm @NotBlank String firstName,
		@RestForm @NotBlank String lastName,
		@RestForm String email,
		@RestForm String phone)
	{
		if (validationFailed())
		{
			redirect(MemberResource.class).create();
			return;
		}

		Member member = new Member();
		member.setFirstName(firstName);
		member.setLastName(lastName);
		member.setEmail(email);
		member.setPhone(phone);
		memberRepository.persist(member);

		// Sync to Keycloak
		try
		{
			memberKeycloakSyncService.syncMemberToKeycloak(member);
			flash("success", "Mitglied erstellt und mit Keycloak synchronisiert");
		}
		catch (Exception e)
		{
			LOG.error("Failed to sync member to Keycloak: memberId={}", member.getId(), e);
			flash("warning", "Mitglied erstellt, aber Keycloak-Synchronisation fehlgeschlagen");
		}

		redirect(MemberResource.class).detail(member.getId());
	}

	@POST
	@Path("/aktualisieren")
	@Transactional
	@RolesAllowed("admin")
	public void update(
		@RestForm Long id,
		@RestForm @NotBlank String firstName,
		@RestForm @NotBlank String lastName,
		@RestForm String email,
		@RestForm String phone)
	{
		if (validationFailed())
		{
			redirect(MemberResource.class).detail(id);
			return;
		}

		Member member = memberRepository.findById(id);
		if (member == null)
		{
			flash("error", "Mitglied nicht gefunden");
			redirect(MemberResource.class).index();
			return;
		}

		member.setFirstName(firstName);
		member.setLastName(lastName);
		member.setEmail(email);
		member.setPhone(phone);

		flash("success", "Mitglied aktualisiert");
		redirect(MemberResource.class).detail(id);
	}

	@POST
	@Path("/loeschen")
	@Transactional
	@RolesAllowed("admin")
	public void delete(@RestForm Long id)
	{
		Member member = memberRepository.findById(id);
		if (member == null)
		{
			flash("error", "Mitglied nicht gefunden");
			redirect(MemberResource.class).index();
			return;
		}

		if (!member.getResponsibleBommels().isEmpty())
		{
			flash("error", "Mitglied ist noch Bommelwart. Bitte zuerst die Zuweisungen entfernen.");
			redirect(MemberResource.class).detail(id);
			return;
		}

		// Delete Keycloak user first
		try
		{
			memberKeycloakSyncService.deleteMemberKeycloakUser(member);
		}
		catch (Exception e)
		{
			LOG.warn("Failed to delete Keycloak user: memberId={}", id, e);
		}

		memberRepository.delete(member);
		flash("success", "Mitglied gelöscht");
		redirect(MemberResource.class).index();
	}
}
