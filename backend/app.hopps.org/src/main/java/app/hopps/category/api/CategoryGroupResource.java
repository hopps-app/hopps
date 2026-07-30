package app.hopps.category.api;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.category.api.dto.CategoryGroupCreateRequest;
import app.hopps.category.api.dto.CategoryGroupReportResponse;
import app.hopps.category.api.dto.CategoryGroupReportRow;
import app.hopps.category.api.dto.CategoryGroupResponse;
import app.hopps.category.api.dto.CategoryGroupUpdateRequest;
import app.hopps.category.api.dto.CategoryGroupUsageResponse;
import app.hopps.category.api.dto.CategoryGroupValueCreateRequest;
import app.hopps.category.api.dto.CategoryGroupValueResponse;
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
import io.quarkus.panache.common.Page;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.BadRequestException;
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

/**
 * CRUD for category groups plus the searchable value sub-resource and the re-draft impact preview.
 */
@Path("/category-groups")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CategoryGroupResource {

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
    @Path("/{id}/values")
    @Operation(summary = "Search a group's values", description = "Paginated, optionally filtered values of one group — the source for the value picker. Scales to very large value sets.")
    @APIResponse(responseCode = "200", description = "A page of values", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedValuesResponse.class)))
    @APIResponse(responseCode = "404", description = "Group not found")
    public PagedValuesResponse values(
            @PathParam("id") Long id,
            @QueryParam("query") String query,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("25") int size) {
        requireGroup(id);
        List<CategoryGroupValueResponse> items = categoryGroupValueRepository.search(id, query, new Page(page, size))
                .stream()
                .map(CategoryGroupValueResponse::from)
                .toList();
        long total = categoryGroupValueRepository.countSearch(id, query);
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
        categoryGroupRepository.persist(group);

        addValues(group, request.values());

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
    @Operation(summary = "Add values to a group", description = "Adds one or more values. Duplicates within the group are ignored.")
    @APIResponse(responseCode = "200", description = "Values added", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CategoryGroupResponse.class)))
    @APIResponse(responseCode = "404", description = "Group not found")
    public CategoryGroupResponse addValues(@PathParam("id") Long id, CategoryGroupValueCreateRequest request) {
        CategoryGroup group = requireGroup(id);
        addValues(group, request == null ? null : request.values());
        long valueCount = categoryGroupValueRepository.count("categoryGroup.id", id);
        return CategoryGroupResponse.from(group, valueCount);
    }

    @DELETE
    @Path("/{id}/values/{valueId}")
    @Transactional
    @Operation(summary = "Remove a value from a group", description = "Deletes a single value. Values already recorded on transactions are kept as historical text.")
    @APIResponse(responseCode = "204", description = "Value removed")
    @APIResponse(responseCode = "404", description = "Group or value not found")
    public Response removeValue(@PathParam("id") Long id, @PathParam("valueId") Long valueId) {
        requireGroup(id);
        CategoryGroupValue value = categoryGroupValueRepository.findById(valueId);
        if (value == null || !value.getCategoryGroup().getId().equals(id)) {
            throw new NotFoundException("Value not found");
        }
        categoryGroupValueRepository.delete(value);
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
    @Operation(summary = "Category-group report", description = "Aggregates transaction totals grouped by this group's recorded values within an optional transaction-date range (inclusive). Returns per-value income/expense/count plus the overall totals.")
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
        List<CategoryGroupReportRow> rows = new ArrayList<>();
        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        long totalCount = 0;
        for (Object[] r : raw) {
            String value = (String) r[0];
            BigDecimal income = (BigDecimal) r[1];
            BigDecimal expense = (BigDecimal) r[2];
            long count = ((Number) r[3]).longValue();
            rows.add(new CategoryGroupReportRow(value, count, income, expense));
            totalIncome = totalIncome.add(income);
            totalExpense = totalExpense.add(expense);
            totalCount += count;
        }
        return new CategoryGroupReportResponse(id, group.getName(), startDate, endDate, rows, totalIncome, totalExpense,
                totalCount);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private Organization requireOrganization() {
        Organization org = organizationContext.getCurrentOrganization();
        if (org == null) {
            throw new BadRequestException("User is not part of an organization");
        }
        return org;
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

    /** Appends the given values to a group, skipping blanks and values that already exist in the group. */
    private void addValues(CategoryGroup group, List<String> values) {
        if (values == null || values.isEmpty()) {
            return;
        }
        Set<String> existing = new HashSet<>();
        for (CategoryGroupValue v : group.getValues()) {
            existing.add(v.getValue());
        }
        int nextIndex = categoryGroupValueRepository.maxSortIndex(group.getId()) + 1;
        for (String raw : values) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String value = raw.trim();
            if (!existing.add(value)) {
                continue;
            }
            group.getValues().add(new CategoryGroupValue(group, value, nextIndex++));
        }
    }
}
