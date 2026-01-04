package app.hopps.bommel.api;

import java.util.List;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;

import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.RestQuery;

import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import io.quarkiverse.renarde.Controller;
import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.shared.util.FlashKeys;

@Authenticated
@Path("/bommels")
public class BommelResource extends Controller
{
	@Inject
	BommelRepository bommelRepository;

	@Inject
	MemberRepository memberRepository;

	@Inject
	SecurityIdentity securityIdentity;

	@Inject
	OrganizationContext organizationContext;

	@CheckedTemplate
	public static class Templates
	{
		public static native TemplateInstance index(Bommel root, Bommel selected, List<Member> members);
	}

	@GET
	@Path("")
	public TemplateInstance index(@RestQuery Long selectedId)
	{
		Bommel root = bommelRepository.findRoot();
		Bommel selected = selectedId != null ? bommelRepository.findByIdScoped(selectedId) : null;
		List<Member> members = memberRepository.findAllOrderedByName();
		return Templates.index(root, selected, members);
	}

	@POST
	@Transactional
	@RolesAllowed("admin")
	public void createRoot(
		@RestForm String icon,
		@RestForm @NotBlank String title)
	{
		if (validationFailed())
		{
			redirect(BommelResource.class).index(null);
			return;
		}

		if (bommelRepository.hasRoot())
		{
			flash(FlashKeys.ERROR, "Hauptbommel existiert bereits");
			redirect(BommelResource.class).index(null);
			return;
		}

		// Get current organization
		Organization currentOrg = organizationContext.getCurrentOrganization();
		if (currentOrg == null)
		{
			flash(FlashKeys.ERROR, "Keine Organisation gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		Bommel root = new Bommel();
		root.setIcon(icon != null ? icon : "home");
		root.setTitle(title);
		root.parent = null;
		root.setOrganization(currentOrg);
		bommelRepository.persist(root);

		flash(FlashKeys.SUCCESS, "Hauptbommel erstellt");
		redirect(BommelResource.class).index(root.getId());
	}

	@POST
	@Transactional
	@RolesAllowed("admin")
	public void addChild(
		@RestForm Long parentId,
		@RestForm String icon,
		@RestForm String title)
	{
		if (parentId == null)
		{
			flash(FlashKeys.ERROR, "Eltern-ID ist erforderlich");
			redirect(BommelResource.class).index(null);
			return;
		}

		Bommel parent = bommelRepository.findByIdScoped(parentId);
		if (parent == null)
		{
			flash(FlashKeys.ERROR, "Eltern-Bommel nicht gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		if (title == null || title.isBlank())
		{
			flash(FlashKeys.ERROR, "Titel ist erforderlich");
			redirect(BommelResource.class).index(parentId);
			return;
		}

		// Get current organization
		Organization currentOrg = organizationContext.getCurrentOrganization();
		if (currentOrg == null)
		{
			flash(FlashKeys.ERROR, "Keine Organisation gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		Bommel child = new Bommel();
		child.setIcon(icon != null ? icon : "folder");
		child.setTitle(title);
		child.parent = parent;
		child.setOrganization(currentOrg);
		bommelRepository.persist(child);

		flash(FlashKeys.SUCCESS, "Kind-Bommel hinzugefügt");
		redirect(BommelResource.class).index(child.getId());
	}

	@POST
	@Transactional
	@RolesAllowed("admin")
	public void update(
		@RestForm @NotNull Long id,
		@RestForm String icon,
		@RestForm @NotBlank String title)
	{
		if (validationFailed())
		{
			redirect(BommelResource.class).index(id);
			return;
		}

		Bommel bommel = bommelRepository.findByIdScoped(id);
		if (bommel == null)
		{
			flash(FlashKeys.ERROR, "Bommel nicht gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		bommel.setIcon(icon != null ? icon : bommel.getIcon());
		bommel.setTitle(title);

		flash(FlashKeys.SUCCESS, "Bommel aktualisiert");
		redirect(BommelResource.class).index(id);
	}

	@POST
	@Transactional
	@RolesAllowed("admin")
	public void delete(@RestForm @NotNull Long id)
	{
		if (validationFailed())
		{
			redirect(BommelResource.class).index(null);
			return;
		}

		Bommel bommel = bommelRepository.findByIdScoped(id);
		if (bommel == null)
		{
			flash(FlashKeys.ERROR, "Bommel nicht gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		if (bommelRepository.hasChildren(bommel))
		{
			flash(FlashKeys.ERROR, "Bommel mit Kindern kann nicht gelöscht werden. Entfernen Sie zuerst alle Kinder.");
			redirect(BommelResource.class).index(id);
			return;
		}

		Long redirectToId = bommel.parent != null ? bommel.parent.getId() : null;

		bommelRepository.delete(bommel);
		flash(FlashKeys.SUCCESS, "Bommel gelöscht");
		redirect(BommelResource.class).index(redirectToId);
	}

	@POST
	@Transactional
	@RolesAllowed("admin")
	public void assignBommelwart(
		@RestForm @NotNull Long bommelId,
		@RestForm Long memberId)
	{
		Bommel bommel = bommelRepository.findByIdScoped(bommelId);
		if (bommel == null)
		{
			flash(FlashKeys.ERROR, "Bommel nicht gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		if (memberId == null || memberId == 0)
		{
			bommel.setResponsibleMember(null);
			flash(FlashKeys.SUCCESS, "Bommelwart entfernt");
		}
		else
		{
			Member member = memberRepository.findByIdScoped(memberId);
			if (member == null)
			{
				flash(FlashKeys.ERROR, "Mitglied nicht gefunden");
				redirect(BommelResource.class).index(bommelId);
				return;
			}
			bommel.setResponsibleMember(member);
			flash(FlashKeys.SUCCESS, "Bommelwart zugewiesen: " + member.getDisplayName());
		}

		redirect(BommelResource.class).index(bommelId);
	}
}
