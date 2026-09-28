package app.hopps.shared.tenancy;

import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.server.ServerRequestFilter;

/**
 * Hides the SaaS-only API in single-tenant mode. Everything under {@code /admin} manages the estate of organizations —
 * listing them, soft-deleting them, impersonating their members — and has no meaning when there is exactly one. Rather
 * than keeping a second build, the endpoints stay in the image and simply do not exist at runtime: they answer 404, the
 * same as any other path that is not there.
 * <p>
 * Pre-matching so it runs before resource lookup and before the {@code @RolesAllowed} checks on those resources. The
 * HTTP-level {@code authenticated} policy still applies first, so anonymous callers keep getting 401.
 */
public class TenancyRequestFilter {

    private static final String ADMIN_PREFIX = "admin/";

    @Inject
    TenancyService tenancyService;

    @ServerRequestFilter(preMatching = true)
    public Response hideSaasOnlyEndpoints(ContainerRequestContext requestContext) {
        if (!tenancyService.isSingle()) {
            return null;
        }
        String path = requestContext.getUriInfo().getPath();
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        if (path.equals("admin") || path.startsWith(ADMIN_PREFIX)) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return null;
    }
}
