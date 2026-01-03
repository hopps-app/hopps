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
		Bommel selected = selectedId != null ? bommelRepository.findById(selectedId) : null;
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
			flash("error", "Hauptbommel existiert bereits");
			redirect(BommelResource.class).index(null);
			return;
		}

		Bommel root = new Bommel();
		root.setIcon(icon != null ? icon : "home");
		root.setTitle(title);
		root.parent = null;
		bommelRepository.persist(root);

		flash("success", "Hauptbommel erstellt");
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
			flash("error", "Eltern-ID ist erforderlich");
			redirect(BommelResource.class).index(null);
			return;
		}

		Bommel parent = bommelRepository.findById(parentId);
		if (parent == null)
		{
			flash("error", "Eltern-Bommel nicht gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		if (title == null || title.isBlank())
		{
			flash("error", "Titel ist erforderlich");
			redirect(BommelResource.class).index(parentId);
			return;
		}

		Bommel child = new Bommel();
		child.setIcon(icon != null ? icon : "folder");
		child.setTitle(title);
		child.parent = parent;
		bommelRepository.persist(child);

		flash("success", "Kind-Bommel hinzugefügt");
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

		Bommel bommel = bommelRepository.findById(id);
		if (bommel == null)
		{
			flash("error", "Bommel nicht gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		bommel.setIcon(icon != null ? icon : bommel.getIcon());
		bommel.setTitle(title);

		flash("success", "Bommel aktualisiert");
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

		Bommel bommel = bommelRepository.findById(id);
		if (bommel == null)
		{
			flash("error", "Bommel nicht gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		if (bommelRepository.hasChildren(bommel))
		{
			flash("error", "Bommel mit Kindern kann nicht gelöscht werden. Entfernen Sie zuerst alle Kinder.");
			redirect(BommelResource.class).index(id);
			return;
		}

		Long redirectToId = bommel.parent != null ? bommel.parent.getId() : null;

		bommelRepository.delete(bommel);
		flash("success", "Bommel gelöscht");
		redirect(BommelResource.class).index(redirectToId);
	}

	@POST
	@Transactional
	@RolesAllowed("admin")
	public void assignBommelwart(
		@RestForm @NotNull Long bommelId,
		@RestForm Long memberId)
	{
		Bommel bommel = bommelRepository.findById(bommelId);
		if (bommel == null)
		{
			flash("error", "Bommel nicht gefunden");
			redirect(BommelResource.class).index(null);
			return;
		}

		if (memberId == null || memberId == 0)
		{
			bommel.setResponsibleMember(null);
			flash("success", "Bommelwart entfernt");
		}
		else
		{
			Member member = memberRepository.findById(memberId);
			if (member == null)
			{
				flash("error", "Mitglied nicht gefunden");
				redirect(BommelResource.class).index(bommelId);
				return;
			}
			bommel.setResponsibleMember(member);
			flash("success", "Bommelwart zugewiesen: " + member.getDisplayName());
		}

		redirect(BommelResource.class).index(bommelId);
	}
}
