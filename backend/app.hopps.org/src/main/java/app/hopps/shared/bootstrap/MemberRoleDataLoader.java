package app.hopps.shared.bootstrap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;

/**
 * Gives the seeded members their roles, by the same rule the V1.0.31 migration applied to existing data: per
 * organization the member with the lowest id is its founder and becomes OWNER on the root bommel, everyone else ADMIN.
 * Runs after the root bommels are linked (order=40).
 */
@ApplicationScoped
public class MemberRoleDataLoader implements EntityDataLoader<TestdataConfig.MemberData> {

    private static final int ORDER = 41;

    @Override
    public int getOrder() {
        return ORDER;
    }

    @Override
    public String getName() {
        return "MemberRole";
    }

    @Override
    public void loadData(TestdataConfig config, EntityManager entityManager) {
        int assigned = entityManager.createNativeQuery("""
                INSERT INTO member_role (id, member_id, bommel_id, role)
                SELECT nextval('member_role_seq'), mv.member_id, o.rootbommel_id,
                       CASE WHEN mv.member_id = (SELECT min(m2.member_id) FROM member_verein m2
                                                 WHERE m2.organizations_id = o.id)
                            THEN 'OWNER' ELSE 'ADMIN' END
                FROM member_verein mv
                JOIN organization o ON o.id = mv.organizations_id
                WHERE o.rootbommel_id IS NOT NULL
                ON CONFLICT (member_id, bommel_id) DO NOTHING
                """).executeUpdate();
        Log.infof("Assigned %d member roles", assigned);
    }
}
