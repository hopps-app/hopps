package app.hopps.template.api;

import app.hopps.template.api.dto.CategoryGroupTemplateRequest;
import app.hopps.template.api.dto.CategoryGroupTemplateResponse;
import app.hopps.template.api.dto.TemplateOrderRequest;
import app.hopps.template.api.dto.TemplateSummaryResponse;
import app.hopps.template.domain.CategoryGroupTemplate;
import app.hopps.template.domain.Template;
import app.hopps.template.domain.TemplateType;
import app.hopps.template.repository.CategoryGroupTemplateRepository;
import app.hopps.template.repository.TemplateRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin-only management of platform-wide templates. Listing and deleting work for every template type; creating,
 * reading and updating go through a per-type sub-path because each type carries different content.
 */
@Path("/admin/templates")
@RolesAllowed("admin")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AdminTemplateResource {

    private static final Logger LOG = LoggerFactory.getLogger(AdminTemplateResource.class);

    @Inject
    TemplateRepository templateRepository;

    @Inject
    CategoryGroupTemplateRepository categoryGroupTemplateRepository;

    @GET
    @Transactional
    @Operation(operationId = "listAdminTemplates", summary = "List templates", description = "All templates, optionally of one type, in their configured order. Includes inactive templates.")
    @APIResponse(responseCode = "200", description = "Templates", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = TemplateSummaryResponse[].class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    public List<TemplateSummaryResponse> list(
            @QueryParam("type") @Parameter(description = "Only templates of this type") TemplateType type) {
        List<TemplateSummaryResponse> result = new ArrayList<>();
        if (type == null || type == TemplateType.CATEGORY_GROUP) {
            List<CategoryGroupTemplate> templates = categoryGroupTemplateRepository.listOrdered();
            List<Long> ids = templates.stream().map(CategoryGroupTemplate::getId).toList();
            Map<Long, Long> valueCounts = categoryGroupTemplateRepository.valueCounts(ids);
            Map<Long, Long> usageCounts = categoryGroupTemplateRepository.usageCounts(ids);
            for (CategoryGroupTemplate t : templates) {
                result.add(new TemplateSummaryResponse(
                        t.getId(),
                        t.getType(),
                        t.getName(),
                        t.getDescription(),
                        t.isActive(),
                        t.getSortIndex(),
                        valueCounts.getOrDefault(t.getId(), 0L),
                        usageCounts.getOrDefault(t.getId(), 0L),
                        t.getCreatedAt(),
                        t.getUpdatedAt()));
            }
        }
        return result;
    }

    @GET
    @Path("/category-groups/{id}")
    @Transactional
    @Operation(operationId = "getAdminCategoryGroupTemplate", summary = "Get a category group template", description = "Returns the template with all of its values, for editing.")
    @APIResponse(responseCode = "200", description = "Template", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupTemplateResponse.class)))
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    @APIResponse(responseCode = "404", description = "Template not found")
    public CategoryGroupTemplateResponse getCategoryGroupTemplate(
            @PathParam("id") @Parameter(description = "The template id") Long id) {
        return toResponse(requireCategoryGroupTemplate(id));
    }

    @POST
    @Path("/category-groups")
    @Transactional
    @Operation(operationId = "createAdminCategoryGroupTemplate", summary = "Create a category group template", description = "Creates a template that organizations can copy into a category group of their own.")
    @APIResponse(responseCode = "201", description = "Template created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupTemplateResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    public Response createCategoryGroupTemplate(@Valid CategoryGroupTemplateRequest request) {
        CategoryGroupTemplate template = new CategoryGroupTemplate();
        apply(template, request);
        template.setSortIndex(templateRepository.nextSortIndex());
        categoryGroupTemplateRepository.persist(template);
        LOG.info("Category group template created: id={}", template.getId());
        return Response.status(Response.Status.CREATED).entity(toResponse(template)).build();
    }

    @PUT
    @Path("/category-groups/{id}")
    @Transactional
    @Operation(operationId = "updateAdminCategoryGroupTemplate", summary = "Update a category group template", description = "Replaces the template's settings and values. Groups that organizations already copied from it are not changed.")
    @APIResponse(responseCode = "200", description = "Template updated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupTemplateResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    @APIResponse(responseCode = "404", description = "Template not found")
    public CategoryGroupTemplateResponse updateCategoryGroupTemplate(
            @PathParam("id") @Parameter(description = "The template id") Long id,
            @Valid CategoryGroupTemplateRequest request) {
        CategoryGroupTemplate template = requireCategoryGroupTemplate(id);
        apply(template, request);
        LOG.info("Category group template updated: id={}", id);
        return toResponse(template);
    }

    @PUT
    @Path("/order")
    @Transactional
    @Operation(operationId = "reorderAdminTemplates", summary = "Reorder templates", description = "Sets the order of the templates, as shown in the admin list and offered to organizations. Templates not listed are moved after the listed ones, keeping their relative order.")
    @APIResponse(responseCode = "204", description = "Order saved")
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    public Response reorder(@Valid TemplateOrderRequest request) {
        List<Template> all = templateRepository.find("order by sortIndex, name").list();
        Map<Long, Template> byId = new HashMap<>();
        for (Template t : all) {
            byId.put(t.getId(), t);
        }
        List<Template> ordered = new ArrayList<>();
        for (Long id : request.ids()) {
            Template t = id == null ? null : byId.remove(id);
            if (t != null) {
                ordered.add(t);
            }
        }
        for (Template t : all) {
            if (byId.containsKey(t.getId())) {
                ordered.add(t);
            }
        }
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setSortIndex(i);
        }
        return Response.noContent().build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(operationId = "deleteAdminTemplate", summary = "Delete a template", description = "Deletes a template of any type. Data that organizations already copied from it stays as it is.")
    @APIResponse(responseCode = "204", description = "Template deleted")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "403", description = "User is not an admin")
    @APIResponse(responseCode = "404", description = "Template not found")
    public Response delete(@PathParam("id") @Parameter(description = "The template id") Long id) {
        Template template = templateRepository.findById(id);
        if (template == null) {
            throw new NotFoundException("Template " + id + " not found");
        }
        templateRepository.delete(template);
        LOG.info("Template deleted: id={}", id);
        return Response.noContent().build();
    }

    private CategoryGroupTemplate requireCategoryGroupTemplate(Long id) {
        CategoryGroupTemplate template = categoryGroupTemplateRepository.findById(id);
        if (template == null) {
            throw new NotFoundException("Template " + id + " not found");
        }
        return template;
    }

    private static void apply(CategoryGroupTemplate template, CategoryGroupTemplateRequest request) {
        template.setName(request.name().trim());
        String description = request.description();
        template.setDescription(description == null || description.isBlank() ? null : description.trim());
        template.setActive(request.active());
        template.setRequired(request.required());
        template.replaceValues(request.values());
    }

    private CategoryGroupTemplateResponse toResponse(CategoryGroupTemplate template) {
        long usage = template.getId() == null ? 0L
                : categoryGroupTemplateRepository.usageCounts(List.of(template.getId()))
                        .getOrDefault(template.getId(), 0L);
        return CategoryGroupTemplateResponse.from(template, usage);
    }
}
