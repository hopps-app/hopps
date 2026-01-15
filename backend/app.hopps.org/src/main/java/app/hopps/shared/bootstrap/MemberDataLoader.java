package app.hopps.shared.bootstrap;

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
            String memberSql = """
                    INSERT INTO Member (id, email, firstName, lastName)
                    VALUES (:id, :email, :firstName, :lastName)
                    """;

            entityManager.createNativeQuery(memberSql)
                    .setParameter("id", member.getId())
                    .setParameter("email", member.getEmail())
                    .setParameter("firstName", member.getFirstName())
                    .setParameter("lastName", member.getLastName())
                    .executeUpdate();

            // Insert member-organization relationships
            if (member.getOrganizationIds() != null) {
                for (Long orgId : member.getOrganizationIds()) {
                    String relationSql = """
                            INSERT INTO Member_Verein (member_id, organizations_id)
                            VALUES (:memberId, :orgId)
                            """;

                    entityManager.createNativeQuery(relationSql)
                            .setParameter("memberId", member.getId())
                            .setParameter("orgId", orgId)
                            .executeUpdate();
                }
            }

            Log.debugf("Loaded member: %s %s (id=%d)", member.getFirstName(), member.getLastName(), member.getId());
        }
    }
}
