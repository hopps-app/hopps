package app.hopps.shared.bootstrap;

import app.hopps.member.domain.MemberStatus;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

/**
 * Loads Member entities from testdata configuration. Members are loaded second (order=20) after organizations, as they
 * reference organizations.
 */
@ApplicationScoped
public class MemberDataLoader implements EntityDataLoader<TestdataConfig.MemberData> {

    private static final int ORDER = 20;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "Member";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        if (config.getMembers() == null || config.getMembers().isEmpty()) {
            Log.info("No members to load");
            return;
        }

        Log.infof("Loading %d members", config.getMembers().size());

        for (TestdataConfig.MemberData member : config.getMembers()) {
            // Insert member
            // Seeded members exist to be logged in as, so their status follows from whether they have a Keycloak id.
            String status = member.getKeycloakId() != null
                    ? MemberStatus.ACTIVE.name()
                    : MemberStatus.NO_ACCESS.name();

            String memberSql = """
                    INSERT INTO Member (id, email, keycloak_id, firstName, lastName, status)
                    VALUES (:id, :email, :keycloakId, :firstName, :lastName, :status)
                    """;

            entityManager.createNativeQuery(memberSql)
                    .setParameter("id", member.getId())
                    .setParameter("email", member.getEmail())
                    .setParameter("keycloakId", member.getKeycloakId())
                    .setParameter("firstName", member.getFirstName())
                    .setParameter("lastName", member.getLastName())
                    .setParameter("status", status)
                    .executeUpdate();

            // Insert member-organization relationships with the member's role, ADMIN if none is given. Organizations
            // without an OWNER get their founder below.
            if (member.getOrganizationIds() != null) {
                for (Long orgId : member.getOrganizationIds()) {
                    String relationSql = """
                            INSERT INTO Member_Verein (id, member_id, organizations_id, role)
                            VALUES (nextval('member_verein_seq'), :memberId, :orgId, :role)
                            """;

                    entityManager.createNativeQuery(relationSql)
                            .setParameter("memberId", member.getId())
                            .setParameter("orgId", orgId)
                            .setParameter("role", member.getRole() != null ? member.getRole() : "ADMIN")
                            .executeUpdate();
                }
            }

            Log.debugf("Loaded member: %s %s (id=%d)", member.getFirstName(), member.getLastName(), member.getId());
        }

        // Organizations without an OWNER: the member with the lowest id becomes OWNER.
        int assigned = entityManager.createNativeQuery("""
                UPDATE Member_Verein mv
                SET role = 'OWNER'
                WHERE mv.member_id = (SELECT min(m2.member_id) FROM Member_Verein m2
                                       WHERE m2.organizations_id = mv.organizations_id)
                  AND NOT EXISTS (SELECT 1 FROM Member_Verein m3
                                  WHERE m3.organizations_id = mv.organizations_id AND m3.role = 'OWNER')
                """).executeUpdate();
        Log.infof("Assigned %d organization owners", assigned);
    }
}
