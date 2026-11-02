package app.hopps.category.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.api.dto.CategoryGroupCreateRequest;
import app.hopps.category.api.dto.CategoryGroupExport;
import app.hopps.category.api.dto.CategoryGroupImportRequest;
import app.hopps.category.api.dto.CategoryGroupImportResponse;
import app.hopps.category.api.dto.CategoryGroupReportResponse;
import app.hopps.category.api.dto.CategoryGroupResponse;
import app.hopps.category.api.dto.CategoryGroupTemplateDetail;
import app.hopps.category.api.dto.CategoryGroupTemplateOption;
import app.hopps.category.api.dto.CategoryGroupUpdateRequest;
import app.hopps.category.api.dto.CategoryGroupUsageResponse;
import app.hopps.category.api.dto.CategoryGroupValueCreateRequest;
import app.hopps.category.api.dto.CategoryGroupValueResponse;
import app.hopps.category.api.dto.CategoryGroupValueUpdateRequest;
import app.hopps.category.api.dto.CategoryValueEntry;
import app.hopps.category.api.dto.PagedValuesResponse;
import app.hopps.category.api.dto.ReopenImpactRequest;
import app.hopps.category.api.dto.ReopenImpactResponse;
import app.hopps.category.domain.CategoryGroup;
import app.hopps.category.domain.CategoryGroupValue;
import app.hopps.category.repository.CategoryGroupRepository;
import app.hopps.category.repository.CategoryGroupValueRepository;
import app.hopps.category.service.CategoryGroupService;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import app.hopps.template.domain.CategoryGroupTemplate;
import app.hopps.template.repository.CategoryGroupTemplateRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
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
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * CRUD for category groups plus the searchable value sub-resource and the re-draft impact preview.
 */
@Path("/category-groups")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CategoryGroupResource {

    private static final int TEMPLATE_PREVIEW_SIZE = 5;

    @Inject
    CategoryGroupRepository categoryGroupRepository;

    @Inject
    CategoryGroupValueRepository categoryGroupValueRepository;

    @Inject
    CategoryGroupService categoryGroupService;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    CategoryGroupTemplateRepository categoryGroupTemplateRepository;

    @GET
    @Operation(summary = "List category groups", description = "All category groups of the current organization, or only those applicable to a bommel when bommelId is given. Values are not included — fetch them via /{id}/values.")
    @APIResponse(responseCode = "200", description = "Category groups", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupResponse[].class)))
    public List<CategoryGroupResponse> list(
            @QueryParam("bommelId") @org.eclipse.microprofile.openapi.annotations.parameters.Parameter(description = "Return only groups applicable to this bommel (self or ancestor assignment)") Long bommelId) {
        requireOrganization();

        List<CategoryGroup> groups;
        if (bommelId != null) {
            Bommel bommel = bommelRepository.findById(bommelId);
            groups = categoryGroupService.applicableGroups(bommel);
        } else {
            groups = categoryGroupRepository.findAllForCurrentOrg();
        }

        List<Long> ids = groups.stream().map(CategoryGroup::getId).toList();
        Map<Long, Long> counts = categoryGroupRepository.valueCountsByGroup(ids);
        return groups.stream()
                .map(g -> CategoryGroupResponse.from(g, counts.getOrDefault(g.getId(), 0L)))
                .toList();
    }

    @GET
    @Path("/templates")
    @Transactional
    @Operation(operationId = "listCategoryGroupTemplates", summary = "List category group templates", description = "The templates the current organization can add as a category group, with a short value preview. Templates the organization already used carry the id of the group created from them; they can still be used again.")
    @APIResponse(responseCode = "200", description = "Templates", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupTemplateOption[].class)))
    @APIResponse(responseCode = "400", description = "User is not part of an organization")
    @APIResponse(responseCode = "401", description = "User not logged in")
    public List<CategoryGroupTemplateOption> templates() {
        requireOrganization();
        List<CategoryGroupTemplate> templates = categoryGroupTemplateRepository.listActive();
        List<Long> ids = templates.stream().map(CategoryGroupTemplate::getId).toList();
        Map<Long, Long> valueCounts = categoryGroupTemplateRepository.valueCounts(ids);
        Map<Long, Long> added = categoryGroupRepository.groupIdsByTemplateForCurrentOrg();
        return templates.stream()
                .map(t -> new CategoryGroupTemplateOption(
                        t.getId(),
                        t.getName(),
                        t.getDescription(),
                        t.isRequired(),
                        valueCounts.getOrDefault(t.getId(), 0L),
                        categoryGroupTemplateRepository.firstValues(t.getId(), TEMPLATE_PREVIEW_SIZE),
                        added.get(t.getId())))
                .toList();
    }

    @GET
    @Path("/templates/{templateId}")
    @Transactional
    @Operation(operationId = "getCategoryGroupTemplate", summary = "Get a category group template", description = "The template with all of its values, used to pre-fill the create dialog. Creating the group then goes through POST /category-groups with the templateId, so the usual checks (required flag, re-draft impact) apply.")
    @APIResponse(responseCode = "200", description = "Template", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupTemplateDetail.class)))
    @APIResponse(responseCode = "400", description = "User is not part of an organization")
    @APIResponse(responseCode = "401", description = "User not logged in")
    @APIResponse(responseCode = "404", description = "Template not found or not active")
    public CategoryGroupTemplateDetail template(
            @PathParam("templateId") @org.eclipse.microprofile.openapi.annotations.parameters.Parameter(description = "The template id") Long templateId) {
        requireOrganization();
        CategoryGroupTemplate template = requireActiveTemplate(templateId);
        return new CategoryGroupTemplateDetail(
                template.getId(),
                template.getName(),
                template.getDescription(),
                template.isRequired(),
                template.toEntries());
    }

    @GET
    @Path("/{id}/values")
    @Operation(summary = "Search a group's values", description = "Paginated, optionally filtered values of one group in tree order — the source for the value picker. The search also matches the parent, so a parent finds its children. Scales to very large value sets.")
    @APIResponse(responseCode = "200", description = "A page of values", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedValuesResponse.class)))
    @APIResponse(responseCode = "404", description = "Group not found")
    public PagedValuesResponse values(
            @PathParam("id") Long id,
            @QueryParam("query") String query,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("25") int size,
            @QueryParam("selection") @DefaultValue("false") @org.eclipse.microprofile.openapi.annotations.parameters.Parameter(description = "Leave out hidden values, as the picker for new bookings does. Parents that cannot be booked stay in, marked as not selectable.") boolean selection,
            @QueryParam("topLevel") @DefaultValue("false") @org.eclipse.microprofile.openapi.annotations.parameters.Parameter(description = "Only values without a parent") boolean topLevel) {
        requireGroup(id);
        List<CategoryGroupValue> values = categoryGroupValueRepository.search(id, query, selection, topLevel,
                new Page(page, size));
        Map<Long, Long> childCounts = categoryGroupValueRepository
                .childCounts(values.stream().map(CategoryGroupValue::getId).toList());
        List<CategoryGroupValueResponse> items = values.stream()
                .map(v -> CategoryGroupValueResponse.from(v, childCounts.getOrDefault(v.getId(), 0L)))
                .toList();
        long total = categoryGroupValueRepository.countSearch(id, query, selection, topLevel);
        return new PagedValuesResponse(items, total);
    }

    @POST
    @Transactional
    @Operation(summary = "Create a category group", description = "Creates a group with its bommel assignments and initial values. Optionally resets affected confirmed transactions to draft.")
    @APIResponse(responseCode = "201", description = "Group created", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid input")
    public Response create(@Valid CategoryGroupCreateRequest request) {
        Organization org = requireOrganization();

        CategoryGroup group = new CategoryGroup();
        group.setName(request.name());
        group.setRequired(request.required());
        group.setOrganization(org);
        group.setBommels(resolveBommels(request.bommelIds(), org));
        if (request.templateId() != null) {
            CategoryGroupTemplate template = requireActiveTemplate(request.templateId());
            group.setTemplateId(template.getId());
            group.setSourceKey(template.getSourceKey());
        }
        categoryGroupRepository.persist(group);

        categoryGroupService.addEntries(group, request.values());

        if (request.reopenAffectedTransactions()) {
            categoryGroupService.reopenTransactions(
                    categoryGroupService.affectedConfirmedTransactionIds(request.required(), request.bommelIds(),
                            null));
        }

        long valueCount = group.getValues().size();
        return Response.status(Response.Status.CREATED)
                .entity(CategoryGroupResponse.from(group, valueCount))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Update a category group", description = "Updates name, required flag and bommel assignments. Values are managed via the /values sub-resource. Optionally resets affected confirmed transactions to draft.")
    @APIResponse(responseCode = "200", description = "Group updated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupResponse.class)))
    @APIResponse(responseCode = "404", description = "Group not found")
    public CategoryGroupResponse update(@PathParam("id") Long id, @Valid CategoryGroupUpdateRequest request) {
        Organization org = requireOrganization();
        CategoryGroup group = requireGroup(id);

        group.setName(request.name());
        group.setRequired(request.required());
        group.setBommels(resolveBommels(request.bommelIds(), org));

        if (request.reopenAffectedTransactions()) {
            categoryGroupService.reopenTransactions(
                    categoryGroupService.affectedConfirmedTransactionIds(request.required(), request.bommelIds(), id));
        }

        long valueCount = categoryGroupValueRepository.count("categoryGroup.id", id);
        return CategoryGroupResponse.from(group, valueCount);
    }

    @POST
    @Path("/{id}/values")
    @Transactional
    @Operation(summary = "Add values to a group", description = "Adds one or more values, optionally under a top-level value. Duplicates within the group are ignored.")
    @APIResponse(responseCode = "200", description = "Values added", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupResponse.class)))
    @APIResponse(responseCode = "400", description = "The parent is not a top-level value of this group")
    @APIResponse(responseCode = "404", description = "Group not found")
    public CategoryGroupResponse addValues(@PathParam("id") Long id, CategoryGroupValueCreateRequest request) {
        CategoryGroup group = requireGroup(id);
        if (request != null && request.values() != null) {
            String parent = request.parentId() == null ? null : requireParent(id, request.parentId()).getValue();
            List<CategoryValueEntry> entries = new ArrayList<>();
            if (parent != null) {
                // already in the group, so it is not added again; the list only has to be complete
                entries.add(CategoryValueEntry.of(parent));
            }
            request.values().forEach(value -> entries.add(new CategoryValueEntry(value, parent, null, null)));
            categoryGroupService.addEntries(group, entries);
        }
        long valueCount = categoryGroupValueRepository.count("categoryGroup.id", id);
        return CategoryGroupResponse.from(group, valueCount);
    }

    @PUT
    @Path("/{id}/values/{valueId}")
    @Transactional
    @Operation(summary = "Update a value", description = "Moves a value in the hierarchy and sets whether it can be booked and whether it is hidden. Existing bookings keep the value either way. The value itself is not renamed: transactions store it as text.")
    @APIResponse(responseCode = "200", description = "Value updated", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupValueResponse.class)))
    @APIResponse(responseCode = "400", description = "The hierarchy would become deeper than two levels")
    @APIResponse(responseCode = "404", description = "Group or value not found")
    @APIResponse(responseCode = "409", description = "A mandatory group would be left without any value that can be chosen")
    public CategoryGroupValueResponse updateValue(@PathParam("id") Long id, @PathParam("valueId") Long valueId,
            @Valid CategoryGroupValueUpdateRequest request) {
        CategoryGroup group = requireGroup(id);
        CategoryGroupValue value = requireValue(id, valueId);
        long selectableBefore = categoryGroupValueRepository.countSelectable(id);
        long childCount = categoryGroupValueRepository.childCounts(List.of(valueId)).getOrDefault(valueId, 0L);

        if (request.parentId() == null) {
            value.setParent(null);
        } else {
            if (request.parentId().equals(valueId)) {
                throw new BadRequestException("A category cannot be its own parent");
            }
            if (childCount > 0) {
                throw new BadRequestException("A category with children cannot be moved under another one");
            }
            value.setParent(requireParent(id, request.parentId()));
        }
        value.setBookable(request.bookable());
        value.setHidden(request.hidden());

        if (group.isRequired() && selectableBefore > 0 && categoryGroupValueRepository.countSelectable(id) == 0) {
            throw new ClientErrorException("A mandatory group needs at least one value that can be chosen",
                    Response.Status.CONFLICT);
        }
        return CategoryGroupValueResponse.from(value, childCount);
    }

    @DELETE
    @Path("/{id}/values/{valueId}")
    @Transactional
    @Operation(summary = "Remove a value from a group", description = "Deletes a single value; its children move to the top level. Values already recorded on transactions are kept as historical text.")
    @APIResponse(responseCode = "204", description = "Value removed")
    @APIResponse(responseCode = "404", description = "Group or value not found")
    public Response removeValue(@PathParam("id") Long id, @PathParam("valueId") Long valueId) {
        requireGroup(id);
        categoryGroupValueRepository.delete(requireValue(id, valueId));
        return Response.noContent().build();
    }

    @GET
    @Path("/{id}/usage")
    @Operation(summary = "Group usage", description = "How many transactions (draft or confirmed) currently carry a value for this group — shown before deletion.")
    @APIResponse(responseCode = "200", description = "Usage count", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupUsageResponse.class)))
    @APIResponse(responseCode = "404", description = "Group not found")
    public CategoryGroupUsageResponse usage(@PathParam("id") Long id) {
        requireGroup(id);
        return new CategoryGroupUsageResponse(categoryGroupService.countLinkedTransactions(id));
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Delete a category group", description = "Deletes a group and its values, and removes the group's value from every transaction that carried it (draft or confirmed).")
    @APIResponse(responseCode = "204", description = "Group deleted")
    @APIResponse(responseCode = "404", description = "Group not found")
    public Response delete(@PathParam("id") Long id) {
        CategoryGroup group = requireGroup(id);
        categoryGroupService.deleteLinkedValues(id);
        categoryGroupRepository.delete(group);
        return Response.noContent().build();
    }

    @GET
    @Path("/{id}/export")
    @Transactional
    @Operation(operationId = "exportCategoryGroup", summary = "Export a category group", description = "The group with its hierarchy and settings as a portable file. A group that was never exported gets its stable source key here. Bommel assignments are not part of the file.")
    @APIResponse(responseCode = "200", description = "Export file", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupExport.class)))
    @APIResponse(responseCode = "404", description = "Group not found")
    public CategoryGroupExport export(@PathParam("id") Long id) {
        CategoryGroup group = requireGroup(id);
        if (group.getSourceKey() == null) {
            group.setSourceKey(UUID.randomUUID().toString());
        }
        List<CategoryValueEntry> values = categoryGroupValueRepository.allInTreeOrder(id)
                .stream()
                .map(v -> new CategoryValueEntry(v.getValue(), v.getParent() == null ? null : v.getParent().getValue(),
                        v.isBookable(), v.isHidden()))
                .toList();
        return new CategoryGroupExport(CategoryGroupExport.FORMAT_VERSION, group.getSourceKey(), group.getName(),
                group.isRequired(), values);
    }

    @POST
    @Path("/import")
    @Transactional
    @Operation(operationId = "importCategoryGroup", summary = "Import a category group", description = "Creates a group from an export file. If the organization already has a group from the same source, its missing categories are added instead; existing categories and the group's settings stay as they are.")
    @APIResponse(responseCode = "200", description = "Import done", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupImportResponse.class)))
    @APIResponse(responseCode = "400", description = "Invalid or unsupported file")
    public CategoryGroupImportResponse importGroup(@Valid CategoryGroupImportRequest request) {
        Organization org = requireOrganization();
        CategoryGroupExport file = request.file();
        if (file.formatVersion() != CategoryGroupExport.FORMAT_VERSION) {
            throw new BadRequestException("Unsupported file format version: " + file.formatVersion());
        }
        if (file.name() == null || file.name().isBlank()) {
            throw new BadRequestException("The file has no group name");
        }

        boolean hasKey = file.sourceKey() != null && !file.sourceKey().isBlank();
        CategoryGroup group = hasKey ? categoryGroupRepository.findBySourceKeyForCurrentOrg(file.sourceKey().trim())
                : null;
        boolean created = group == null;
        if (created) {
            group = new CategoryGroup();
            group.setName(file.name().trim());
            group.setRequired(file.required());
            group.setOrganization(org);
            group.setBommels(resolveBommels(request.bommelIds(), org));
            group.setSourceKey(hasKey ? file.sourceKey().trim() : UUID.randomUUID().toString());
            categoryGroupRepository.persist(group);
        }

        int added = categoryGroupService.addEntries(group, file.values());

        if (created && request.reopenAffectedTransactions()) {
            categoryGroupService.reopenTransactions(
                    categoryGroupService.affectedConfirmedTransactionIds(file.required(), request.bommelIds(), null));
        }

        long valueCount = categoryGroupValueRepository.count("categoryGroup.id", group.getId());
        return new CategoryGroupImportResponse(CategoryGroupResponse.from(group, valueCount), created, added);
    }

    @POST
    @Path("/reopen-impact")
    @Operation(summary = "Preview the re-draft impact", description = "For a pending group state (creating or editing), returns the already-confirmed transactions that would be reset to draft if the group became mandatory for its bommels.")
    @APIResponse(responseCode = "200", description = "Impact preview", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ReopenImpactResponse.class)))
    public ReopenImpactResponse reopenImpact(ReopenImpactRequest request) {
        requireOrganization();
        List<Long> affected = categoryGroupService.affectedConfirmedTransactionIds(
                request.required(), request.bommelIds(), request.id());
        return new ReopenImpactResponse(affected.size(), affected);
    }

    @GET
    @Path("/{id}/report")
    @Operation(summary = "Category-group report", description = "Aggregates transaction totals grouped by this group's recorded values within an optional transaction-date range (inclusive). Returns per-value income/expense/count, rolled up to parent values, plus the overall totals.")
    @APIResponse(responseCode = "200", description = "Aggregated report", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupReportResponse.class)))
    @APIResponse(responseCode = "404", description = "Group not found")
    public CategoryGroupReportResponse report(
            @PathParam("id") Long id,
            @QueryParam("startDate") @org.eclipse.microprofile.openapi.annotations.parameters.Parameter(description = "Filter transactions from this date (ISO format: YYYY-MM-DD)") String startDate,
            @QueryParam("endDate") @org.eclipse.microprofile.openapi.annotations.parameters.Parameter(description = "Filter transactions until this date, inclusive (ISO format: YYYY-MM-DD)") String endDate,
            @QueryParam("bommelId") @org.eclipse.microprofile.openapi.annotations.parameters.Parameter(description = "Restrict to these bommel ID(s); repeatable and combined with OR") List<Long> bommelIds) {
        CategoryGroup group = requireGroup(id);

        Instant startInstant = null;
        Instant endInstant = null;
        if (startDate != null && !startDate.isBlank()) {
            startInstant = LocalDate.parse(startDate).atStartOfDay(ZoneOffset.UTC).toInstant();
        }
        if (endDate != null && !endDate.isBlank()) {
            // inclusive upper bound → start of the following day
            endInstant = LocalDate.parse(endDate).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        }

        List<Object[]> raw = categoryGroupService.valueSumsForReport(id, startInstant, endInstant, bommelIds);
        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        long totalCount = 0;
        for (Object[] r : raw) {
            totalIncome = totalIncome.add((BigDecimal) r[1]);
            totalExpense = totalExpense.add((BigDecimal) r[2]);
            totalCount += ((Number) r[3]).longValue();
        }
        return new CategoryGroupReportResponse(id, group.getName(), startDate, endDate,
                CategoryGroupService.reportRows(raw, categoryGroupValueRepository.parentsByValue(id)), totalIncome,
                totalExpense, totalCount);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private Organization requireOrganization() {
        Organization org = organizationContext.getCurrentOrganization();
        if (org == null) {
            throw new BadRequestException("User is not part of an organization");
        }
        return org;
    }

    private CategoryGroupTemplate requireActiveTemplate(Long templateId) {
        CategoryGroupTemplate template = categoryGroupTemplateRepository.findById(templateId);
        if (template == null || !template.isActive()) {
            throw new NotFoundException("Template " + templateId + " not found");
        }
        return template;
    }

    private CategoryGroup requireGroup(Long id) {
        CategoryGroup group = categoryGroupRepository.findByIdScoped(id);
        if (group == null) {
            throw new NotFoundException("Category group " + id + " not found in your organization");
        }
        return group;
    }

    private Set<Bommel> resolveBommels(List<Long> bommelIds, Organization org) {
        Set<Bommel> result = new HashSet<>();
        if (bommelIds == null) {
            return result;
        }
        for (Long bommelId : bommelIds) {
            if (bommelId == null) {
                continue;
            }
            Bommel bommel = bommelRepository.findById(bommelId);
            if (bommel == null) {
                throw new BadRequestException("Bommel not found: " + bommelId);
            }
            if (!bommelRepository.getOrganization(bommel).getId().equals(org.getId())) {
                throw new BadRequestException("Bommel is not part of your organization: " + bommelId);
            }
            result.add(bommel);
        }
        return result;
    }

    private CategoryGroupValue requireValue(Long groupId, Long valueId) {
        CategoryGroupValue value = categoryGroupValueRepository.findById(valueId);
        if (value == null || !value.getCategoryGroup().getId().equals(groupId)) {
            throw new NotFoundException("Value not found");
        }
        return value;
    }

    /** A value that can take children: top-level and in this group. */
    private CategoryGroupValue requireParent(Long groupId, Long parentId) {
        CategoryGroupValue parent = categoryGroupValueRepository.findById(parentId);
        if (parent == null || !parent.getCategoryGroup().getId().equals(groupId)) {
            throw new BadRequestException("Parent is not part of this group: " + parentId);
        }
        if (parent.getParent() != null) {
            throw new BadRequestException("Categories can only be nested one level deep");
        }
        return parent;
    }
}
