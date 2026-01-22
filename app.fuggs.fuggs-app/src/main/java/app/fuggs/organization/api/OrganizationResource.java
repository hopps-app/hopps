package app.fuggs.organization.api;

import java.util.List;

import app.fuggs.shared.security.Roles;
import app.fuggs.shared.util.FlashKeys;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.RestPath;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.fuggs.dashboard.api.DashboardResource;
import app.fuggs.organization.domain.Organization;
import app.fuggs.organization.repository.OrganizationRepository;
import app.fuggs.shared.security.OrganizationContext;
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

/**
 * Controller for organization management. Only accessible to super admins.
 */
@Path("/organisationen")
@Authenticated
public class OrganizationResource extends Controller
{
	private static final Logger LOG = LoggerFactory.getLogger(OrganizationResource.class);

	@Inject
	OrganizationRepository organizationRepository;

	@Inject
	OrganizationContext organizationContext;

	@CheckedTemplate
	public static class Templates
	{
		private Templates()
		{
			// static
		}

		public static native TemplateInstance index(List<Organization> organizations, Organization currentOrg);

		public static native TemplateInstance create();

		public static native TemplateInstance detail(Organization organization);
	}

	/**
	 * Show a list of all organizations (super admin only).
	 */
	@RolesAllowed(Roles.SUPER_ADMIN)
	public TemplateInstance index()
	{
		List<Organization> organizations = organizationRepository.listAll();
		Organization currentOrg = organizationContext.getCurrentOrganization();
		return Templates.index(organizations, currentOrg);
	}

	/**
	 * Show form to create new organization (super admin only).
	 */
	@RolesAllowed(Roles.SUPER_ADMIN)
	public TemplateInstance create()
	{
		return Templates.create();
	}

	/**
	 * Create a new organization (super admin only).
	 */
	@POST
	@Path("/save")
	@RolesAllowed(Roles.SUPER_ADMIN)
	@Transactional
	public void save(
		@NotBlank @RestForm String name,
		@NotBlank @RestForm String slug,
		@RestForm String displayName)
	{
		if (validationFailed())
		{
			create();
		}

		// Check if a slug already exists
		Organization existing = organizationRepository.findBySlug(slug);
		if (existing != null)
		{
			validation.addError("slug", "Slug bereits vergeben");
			create();
		}

		Organization organization = new Organization();
		organization.setName(name);
		organization.setSlug(slug);
		organization.setDisplayName(displayName != null && !displayName.isBlank() ? displayName : name);
		organization.setActive(true);

		organizationRepository.persist(organization);

		LOG.info("Organization created: {} ({})", organization.getName(), organization.getSlug());
		flash(FlashKeys.SUCCESS, "Organisation erfolgreich erstellt");

		index();
	}

	/**
	 * Show organization details (super admin only).
	 */
	@GET
	@Path("/{id}")
	@RolesAllowed(Roles.SUPER_ADMIN)
	public TemplateInstance detail(@RestPath Long id)
	{
		Organization organization = organizationRepository.findById(id);
		if (organization == null)
		{
			flash(FlashKeys.ERROR, "Organisation nicht gefunden");
			index();
		}

		return Templates.detail(organization);
	}

	/**
	 * Switch current organization (super admin only).
	 */
	@POST
	@Path("/switch")
	@RolesAllowed(Roles.SUPER_ADMIN)
	@Transactional
	public void switchOrganization(@RestForm Long organizationId)
	{
		Organization organization = organizationRepository.findById(organizationId);
		if (organization == null)
		{
			flash("error", "Organisation nicht gefunden");
			index();
		}

		organizationContext.switchOrganization(organizationId);

		LOG.info("Super admin switched to organization: {}", organization.getName());
		flash(FlashKeys.SUCCESS, "Zur Organisation \"" + organization.getName() + "\" gewechselt");

		// Redirect to dashboard
		redirect(DashboardResource.class);
	}

	/**
	 * Toggle organization active status (super admin only).
	 */
	@POST
	@Path("/toggle-active")
	@RolesAllowed(Roles.SUPER_ADMIN)
	@Transactional
	public void toggleActive(@RestForm Long id)
	{
		Organization organization = organizationRepository.findById(id);
		if (organization == null)
		{
			flash(FlashKeys.ERROR, "Organisation nicht gefunden");
			index();
		}

		organization.setActive(!organization.isActive());
		organizationRepository.persist(organization);

		LOG.info("Organization {} is now {}", organization.getName(), organization.isActive() ? "active" : "inactive");
		flash("success",
			organization.isActive() ? "Organisation aktiviert" : "Organisation deaktiviert");

		detail(id);
	}
}
