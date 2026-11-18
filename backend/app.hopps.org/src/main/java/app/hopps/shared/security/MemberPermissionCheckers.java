package app.hopps.shared.security;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.Permission;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import io.quarkus.security.PermissionChecker;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.common.annotation.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.context.control.ActivateRequestContext;
import jakarta.inject.Inject;

import java.util.Collection;

/**
 * Grants the {@code @PermissionsAllowed(Permission.Names.XYZ)} checks on the REST endpoints. A permission is granted
 * when the caller's role in their organization includes it ({@link AccessService}); without a member or an
 * organization, nothing is granted.
 * <p>
 * Together with {@code quarkus.security.jaxrs.deny-unannotated-endpoints=true}, every endpoint is denied unless it
 * names what it needs.
 * <p>
 * The checkers query the database, so they are {@link Blocking}: without it Quarkus calls them on the IO thread, the
 * query fails there, and Quarkus turns that failure into a plain 403 without logging it.
 */
@ApplicationScoped
public class MemberPermissionCheckers {

    @Inject
    MemberRepository memberRepository;

    @Inject
    AccessService accessService;

    @PermissionChecker(Permission.Names.VIEW_BOOKKEEPING)
    @Blocking
    @ActivateRequestContext
    public boolean canViewBookkeeping(SecurityIdentity identity) {
        return isGranted(identity, Permission.VIEW_BOOKKEEPING);
    }

    @PermissionChecker(Permission.Names.EDIT_BOOKKEEPING)
    @Blocking
    @ActivateRequestContext
    public boolean canEditBookkeeping(SecurityIdentity identity) {
        return isGranted(identity, Permission.EDIT_BOOKKEEPING);
    }

    @PermissionChecker(Permission.Names.MANAGE_ORGANIZATION)
    @Blocking
    @ActivateRequestContext
    public boolean canManageOrganization(SecurityIdentity identity) {
        return isGranted(identity, Permission.MANAGE_ORGANIZATION);
    }

    @PermissionChecker(Permission.Names.MANAGE_MEMBERS)
    @Blocking
    @ActivateRequestContext
    public boolean canManageMembers(SecurityIdentity identity) {
        return isGranted(identity, Permission.MANAGE_MEMBERS);
    }

    boolean isGranted(SecurityIdentity identity, Permission permission) {
        if (identity == null || identity.isAnonymous()) {
            return false;
        }

        Member member = memberRepository.findByKeycloakId(KeycloakPrincipals.keycloakId(identity.getPrincipal()));
        if (member == null) {
            return false;
        }

        // Same rule as OrganizationContext and SecurityUtils: a member acts in their (for now only) organization.
        Collection<Organization> organizations = member.getOrganizations();
        if (organizations.isEmpty()) {
            return false;
        }

        return accessService.permissions(member, organizations.iterator().next()).contains(permission);
    }
}
