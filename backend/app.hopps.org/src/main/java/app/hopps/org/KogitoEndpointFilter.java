package app.hopps.org;

import io.quarkus.smallrye.openapi.OpenApiFilter;
import org.eclipse.microprofile.openapi.OASFilter;
import org.eclipse.microprofile.openapi.models.Operation;
import org.eclipse.microprofile.openapi.models.PathItem;

import java.util.List;

/**
 * This Filter is a temporary fix, for removing the endpoints of kogito
 */
@OpenApiFilter(OpenApiFilter.RunStage.RUN)
public class KogitoEndpointFilter implements OASFilter {
    private static final List<String> BLACKLIST = List.of("NewOrganization");

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
