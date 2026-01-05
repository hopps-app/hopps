package app.hopps.category.api;

import app.hopps.category.domain.Category;
import app.hopps.category.model.CategoryInput;
import app.hopps.category.repository.CategoryRepository;
import app.hopps.org.service.UserOrganizationService;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.SecurityUtils;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.List;

@Path("/category")
public class CategoryResource {

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    SecurityUtils securityUtils;

    @GET
    @Authenticated
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Get all categories for user's organization", description = "Retrieves all categories for the current user's organization")
    @APIResponse(responseCode = "200", description = "Categories retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Category[].class)))
    @APIResponse(responseCode = "404", description = "User or organization not found")
    public List<Category> getAllCategories(@Context SecurityContext securityContext) {
        Organization userOrganization = securityUtils.getUserOrganization(securityContext);
        return categoryRepository.findByOrganization(userOrganization);
    }

    @GET
    @Path("/{id}")
    @Authenticated
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Get category by ID", description = "Retrieves a specific category by its ID within the user's organization")
    @APIResponse(responseCode = "200", description = "Category retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Category.class)))
    @APIResponse(responseCode = "404", description = "Category not found or not accessible")
    public Category getCategoryById(@PathParam("id") Long id, @Context SecurityContext securityContext) {
        Organization userOrganization = securityUtils.getUserOrganization(securityContext);
        Category category = categoryRepository.findById(id);

        if (category == null || !category.getOrganization().getId().equals(userOrganization.getId())) {
            throw new NotFoundException("Category with id " + id + " not found in your organization");
        }
        return category;
    }

    @POST
    @Authenticated
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(summary = "Create a new category", description = "Creates a new category for the user's organization")
    @APIResponse(responseCode = "201", description = "Category created successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Category.class)))
    @APIResponse(responseCode = "400", description = "Invalid category data")
    @APIResponse(responseCode = "404", description = "User or organization not found")
    public Response createCategory(@Valid CategoryInput categoryInput, @Context SecurityContext securityContext) {
        Organization userOrganization = securityUtils.getUserOrganization(securityContext);

        Category category = new Category();
        category.setName(categoryInput.name());
        category.setDescription(categoryInput.description());
        category.setOrganization(userOrganization);

        categoryRepository.persist(category);
        return Response.status(Response.Status.CREATED).entity(category).build();
    }

    @PUT
    @Path("/{id}")
    @Authenticated
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    @Operation(summary = "Update a category", description = "Updates an existing category within the user's organization")
    @APIResponse(responseCode = "200", description = "Category updated successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = Category.class)))
    @APIResponse(responseCode = "404", description = "Category not found or not accessible")
    @APIResponse(responseCode = "400", description = "Invalid category data")
    public Category updateCategory(@PathParam("id") Long id, @Valid CategoryInput categoryInput,
            @Context SecurityContext securityContext) {
        Organization userOrganization = securityUtils.getUserOrganization(securityContext);
        Category existingCategory = categoryRepository.findById(id);

        if (existingCategory == null || !existingCategory.getOrganization().getId().equals(userOrganization.getId())) {
            throw new NotFoundException("Category with id " + id + " not found in your organization");
        }

        existingCategory.setName(categoryInput.name());
        existingCategory.setDescription(categoryInput.description());

        return existingCategory;
    }

    @DELETE
    @Path("/{id}")
    @Authenticated
    @Transactional
    @Operation(summary = "Delete a category", description = "Deletes a category by its ID within the user's organization")
    @APIResponse(responseCode = "204", description = "Category deleted successfully")
    @APIResponse(responseCode = "404", description = "Category not found or not accessible")
    public Response deleteCategory(@PathParam("id") Long id, @Context SecurityContext securityContext) {
        Organization userOrganization = securityUtils.getUserOrganization(securityContext);
        Category category = categoryRepository.findById(id);

        if (category == null || !category.getOrganization().getId().equals(userOrganization.getId())) {
            throw new NotFoundException("Category with id " + id + " not found in your organization");
        }

        categoryRepository.delete(category);
        return Response.noContent().build();
    }
}
