package app.hopps.shared.filter;

import io.quarkus.smallrye.openapi.OpenApiFilter;
import org.eclipse.microprofile.openapi.OASFilter;
import org.eclipse.microprofile.openapi.models.Operation;
import org.eclipse.microprofile.openapi.models.PathItem;

import java.util.List;

/**
 * OpenAPI filter for hiding Kogito BPMN process endpoints from API documentation. This is a temporary fix for removing
 * the endpoints of kogito processes.
 */
@OpenApiFilter(OpenApiFilter.RunStage.RUN)
public class KogitoEndpointFilter implements OASFilter {

    // Unified blacklist from both org and fin modules
    private static final List<String> BLACKLIST = List.of(
            "NewOrganization", // from org module
            "Invoice", // from fin module
            "Receipt" // from fin module
    );

    @Override
    public Operation filterOperation(Operation operation) {
        if (BLACKLIST.stream().anyMatch(x -> operation.getTags() != null && operation.getTags().contains(x))) {
            return null;
        }
        return OASFilter.super.filterOperation(operation);
    }

    @Override
    public PathItem filterPathItem(PathItem pathItem) {
        if (pathItem.getOperations().isEmpty()) {
            return null;
        }
        return OASFilter.super.filterPathItem(pathItem);
    }
}
