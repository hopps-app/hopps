package app.hopps.shared.security;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.domain.TreeSearchBommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.member.domain.Member;
import app.hopps.member.domain.Permission;
import app.hopps.member.domain.Role;
import app.hopps.member.repository.MemberRoleRepository;
import app.hopps.organization.domain.Organization;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ForbiddenException;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * The one place that answers what a member may do. Permissions come from the {@link Role}s a member holds on a bommel
 * or any of its ancestors, as a role covers the whole subtree below the bommel it was granted on.
 */
@ApplicationScoped
public class AccessService {

    @Inject
    MemberRoleRepository memberRoleRepository;

    @Inject
    BommelRepository bommelRepository;

    public Set<Permission> permissions(Member member, Bommel bommel) {
        List<Long> lineage = new ArrayList<>();
        lineage.add(bommel.id);
        bommelRepository.getParents(bommel)
                .stream()
                .map(TreeSearchBommel::bommel)
                .forEach(parent -> lineage.add(parent.id));

        Set<Permission> permissions = EnumSet.noneOf(Permission.class);
        memberRoleRepository.rolesOn(member, lineage).forEach(role -> permissions.addAll(role.getPermissions()));
        return permissions;
    }

    /** Permissions on the organization as a whole, i.e. on its root bommel. */
    public Set<Permission> permissions(Member member, Organization organization) {
        Bommel root = organization.getRootBommel();
        return root == null ? EnumSet.noneOf(Permission.class) : permissions(member, root);
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
