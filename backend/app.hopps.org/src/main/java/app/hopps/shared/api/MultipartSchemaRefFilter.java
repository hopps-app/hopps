package app.hopps.shared.api;

import io.quarkus.smallrye.openapi.OpenApiFilter;
import org.eclipse.microprofile.openapi.OASFilter;
import org.eclipse.microprofile.openapi.models.media.MediaType;
import org.eclipse.microprofile.openapi.models.parameters.RequestBody;

/**
 * SmallRye merges the form parts it scans from a multipart resource method into the request body schema, even when the
 * {@code @RequestBody} annotation points at a component. That inline copy loses {@code required} and {@code nullable},
 * so generated clients treat every part as mandatory. Where a multipart body names a component, keep only the
 * reference.
 */
@OpenApiFilter(OpenApiFilter.RunStage.BUILD)
public class MultipartSchemaRefFilter implements OASFilter {
    private static final String MULTIPART = jakarta.ws.rs.core.MediaType.MULTIPART_FORM_DATA;

    @Override
    public RequestBody filterRequestBody(RequestBody requestBody) {
        if (requestBody.getContent() == null) {
            return requestBody;
        }
        MediaType multipart = requestBody.getContent().getMediaType(MULTIPART);
        if (multipart != null && multipart.getSchema() != null && multipart.getSchema().getRef() != null) {
            String ref = multipart.getSchema().getRef();
            multipart.setSchema(org.eclipse.microprofile.openapi.OASFactory.createSchema().ref(ref));
        }
        return requestBody;
    }
}
