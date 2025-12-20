package rest;

import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.POST;

import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.RestQuery;

import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import io.quarkiverse.renarde.Controller;
import model.Bommel;

public class Bommels extends Controller
{
	@CheckedTemplate
	public static class Templates
	{
		public static native TemplateInstance index(Bommel root, Bommel selected);
	}

	public TemplateInstance index(@RestQuery String selectedId)
	{
		Bommel root = Bommel.findRoot();
		Bommel selected = selectedId != null ? Bommel.findById(selectedId) : null;
		return Templates.index(root, selected);
	}

	@POST
	public void createRoot(
		@RestForm @NotBlank String emoji,
		@RestForm @NotBlank String title)
	{
		if (validationFailed())
		{
			index(null);
		}

		if (Bommel.hasRoot())
		{
			flash("error", "Root bommel already exists");
			index(null);
		}

		Bommel root = new Bommel();
		root.emoji = emoji;
		root.title = title;
		root.parent = null;
		root.persist();

		flash("success", "Root bommel created");
		index(null);
	}

	@POST
	public void addChild(
		@RestForm @NotBlank String parentId,
		@RestForm @NotBlank String emoji,
		@RestForm @NotBlank String title)
	{
		if (validationFailed())
		{
			index(null);
		}

		Bommel parent = Bommel.findById(parentId);
		if (parent == null)
		{
			flash("error", "Parent bommel not found");
			index(null);
		}

		Bommel child = new Bommel();
		child.emoji = emoji;
		child.title = title;
		child.parent = parent;
		child.persist();

		flash("success", "Child bommel added");
		redirect(Bommels.class).index(child.id);
	}

	@POST
	public void update(
		@RestForm @NotBlank String id,
		@RestForm @NotBlank String emoji,
		@RestForm @NotBlank String title)
	{
		if (validationFailed())
		{
			index(id);
		}

		Bommel bommel = Bommel.findById(id);
		if (bommel == null)
		{
			flash("error", "Bommel not found");
			index(null);
		}

		bommel.emoji = emoji;
		bommel.title = title;

		flash("success", "Bommel updated");
		redirect(Bommels.class).index(id);
	}

	@POST
	public void delete(@RestForm @NotBlank String id)
	{
		if (validationFailed())
		{
			index(null);
		}

		Bommel bommel = Bommel.findById(id);
		if (bommel == null)
		{
			flash("error", "Bommel not found");
			index(null);
		}

		if (bommel.hasChildren())
		{
			flash("error", "Cannot delete bommel with children. Remove children first.");
			redirect(Bommels.class).index(id);
		}

		String redirectToId = bommel.parent != null ? bommel.parent.id : null;

		bommel.delete();
		flash("success", "Bommel deleted");
		redirect(Bommels.class).index(redirectToId);
	}
}
