package app.hopps.shared.security;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.Permission;
import app.hopps.member.domain.Role;
import app.hopps.organization.domain.Organization;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.ForbiddenException;

import java.util.EnumSet;
import java.util.Set;

/**
 * The one place that answers what a member may do. Permissions come from the {@link Role} a member holds in an
 * organization ({@link Member#getRole(Organization)}), which is organization-wide for now — there is no bommel-level
 * override.
 */
@ApplicationScoped
public class AccessService {

    /**
     * Get permisions for member role
     *
     * @param member
     * @param organization
     *
     * @return
     */
    public Set<Permission> permissions(Member member, Organization organization) {
        return member.getRole(organization)
                .map(Role::getPermissions)
                .orElseGet(() -> EnumSet.noneOf(Permission.class));
    }

    /**
     * @throws ForbiddenException
     *             if the member lacks the permission on the organization
     */
    public void require(Member member, Permission permission, Organization organization) {
        if (!permissions(member, organization).contains(permission)) {
            throw new ForbiddenException("Missing permission " + permission);
        }
    }
}
