package app.hopps.rest;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.POST;

import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.RestQuery;

import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import io.quarkiverse.renarde.Controller;
import app.hopps.model.Bommel;
import app.hopps.repository.BommelRepository;

public class Bommels extends Controller
{
	@Inject
	BommelRepository bommelRepository;

	@CheckedTemplate
	public static class Templates
	{
		public static native TemplateInstance index(Bommel root, Bommel selected);
	}

	public TemplateInstance index(@RestQuery Long selectedId)
	{
		Bommel root = bommelRepository.findRoot();
		Bommel selected = selectedId != null ? bommelRepository.findById(selectedId) : null;
		return Templates.index(root, selected);
	}

	@POST
	@Transactional
	public void createRoot(
		@RestForm String icon,
		@RestForm @NotBlank String title)
	{
		if (validationFailed())
		{
			redirect(Bommels.class).index(null);
			return;
		}

		if (bommelRepository.hasRoot())
		{
			flash("error", "Wurzel-Bommel existiert bereits");
			redirect(Bommels.class).index(null);
			return;
		}

		Bommel root = new Bommel();
		root.setIcon(icon != null ? icon : "home");
		root.setTitle(title);
		root.parent = null;
		bommelRepository.persist(root);

		flash("success", "Wurzel-Bommel erstellt");
		redirect(Bommels.class).index(root.getId());
	}

	@POST
	@Transactional
	public void addChild(
		@RestForm Long parentId,
		@RestForm String icon,
		@RestForm String title)
	{
		if (parentId == null)
		{
			flash("error", "Eltern-ID ist erforderlich");
			redirect(Bommels.class).index(null);
			return;
		}

		Bommel parent = bommelRepository.findById(parentId);
		if (parent == null)
		{
			flash("error", "Eltern-Bommel nicht gefunden");
			redirect(Bommels.class).index(null);
			return;
		}

		if (title == null || title.isBlank())
		{
			flash("error", "Titel ist erforderlich");
			redirect(Bommels.class).index(parentId);
			return;
		}

		Bommel child = new Bommel();
		child.setIcon(icon != null ? icon : "folder");
		child.setTitle(title);
		child.parent = parent;
		bommelRepository.persist(child);

		flash("success", "Kind-Bommel hinzugefügt");
		redirect(Bommels.class).index(child.getId());
	}

	@POST
	@Transactional
	public void update(
		@RestForm @NotNull Long id,
		@RestForm String icon,
		@RestForm @NotBlank String title)
	{
		if (validationFailed())
		{
			redirect(Bommels.class).index(id);
			return;
		}

		Bommel bommel = bommelRepository.findById(id);
		if (bommel == null)
		{
			flash("error", "Bommel nicht gefunden");
			redirect(Bommels.class).index(null);
			return;
		}

		bommel.setIcon(icon != null ? icon : bommel.getIcon());
		bommel.setTitle(title);

		flash("success", "Bommel aktualisiert");
		redirect(Bommels.class).index(id);
	}

	@POST
	@Transactional
	public void delete(@RestForm @NotNull Long id)
	{
		if (validationFailed())
		{
			redirect(Bommels.class).index(null);
			return;
		}

		Bommel bommel = bommelRepository.findById(id);
		if (bommel == null)
		{
			flash("error", "Bommel nicht gefunden");
			redirect(Bommels.class).index(null);
			return;
		}

		if (bommelRepository.hasChildren(bommel))
		{
			flash("error", "Bommel mit Kindern kann nicht gelöscht werden. Entfernen Sie zuerst alle Kinder.");
			redirect(Bommels.class).index(id);
			return;
		}

		Long redirectToId = bommel.parent != null ? bommel.parent.getId() : null;

		bommelRepository.delete(bommel);
		flash("success", "Bommel gelöscht");
		redirect(Bommels.class).index(redirectToId);
	}
}
