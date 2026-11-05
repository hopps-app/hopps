package app.hopps.shared.tenancy;

import app.hopps.organization.domain.Organization;
import app.hopps.organization.repository.OrganizationRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;
import java.util.Optional;

/**
 * Answers the questions the rest of the application has about the tenancy mode: are we single-tenant, has the one
 * organization been set up yet, and which one is it. Nothing here is cached on purpose — the organization count only
 * changes during the initial setup, and the name can be edited any time, so every answer is read fresh.
 */
@ApplicationScoped
public class TenancyService {

    /** Error code sent when sign-up is attempted after the single organization has already been set up. */
    public static final String SETUP_COMPLETE = "SETUP_COMPLETE";

    @Inject
    TenancyConfig config;

    @Inject
    OrganizationRepository organizationRepository;

    public TenancyConfig.Mode mode() {
        return config.mode();
    }

    public boolean isSingle() {
        return config.mode() == TenancyConfig.Mode.SINGLE;
    }

    /**
     * Whether the initial setup still has to happen: single-tenant mode and no (active) organization yet. In
     * multi-tenant mode there is no such thing as a setup, so this is always false.
     */
    public boolean isSetupRequired() {
        return isSingle() && organizationRepository.count() == 0;
    }

    /**
     * The one organization of a single-tenant installation, once it exists. Empty in multi-tenant mode and before the
     * initial setup.
     */
    public Optional<Organization> singleOrganization() {
        if (!isSingle()) {
            return Optional.empty();
        }
        return Optional.ofNullable(organizationRepository.findAll().firstResult());
    }

    /**
     * Guards creating an organization, both the anonymous sign-up and the one for an account that already exists: in
     * single-tenant mode either is only open until the organization exists.
     *
     * @throws ForbiddenException
     *             with code {@link #SETUP_COMPLETE} when the single organization has already been created
     */
    public void assertSignUpAllowed() {
        if (isSingle() && !isSetupRequired()) {
            throw forbidden(SETUP_COMPLETE, "This installation already has its organization; sign-up is closed");
        }
    }

    public static ForbiddenException forbidden(String code, String message) {
        return new ForbiddenException(Response.status(Response.Status.FORBIDDEN)
                .type(MediaType.APPLICATION_JSON)
                .entity(Map.of("code", code, "message", message))
                .build());
    }
}
