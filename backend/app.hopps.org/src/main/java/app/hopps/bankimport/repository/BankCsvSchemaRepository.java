package app.hopps.bankimport.repository;

import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;

@ApplicationScoped
public class BankCsvSchemaRepository implements PanacheRepository<BankCsvSchema> {

    @Inject
    OrganizationContext organizationContext;

    public List<BankCsvSchema> listForCurrentOrganization(boolean includeArchived) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        if (includeArchived) {
            return find("organization.id = ?1", Sort.ascending("name"), orgId).list();
        }
        return find("organization.id = ?1 and archived = false", Sort.ascending("name"), orgId).list();
    }

    public BankCsvSchema findByIdScoped(Long id) {
        Long orgId = organizationContext.getCurrentOrganizationId();
        return find("id = ?1 and organization.id = ?2", id, orgId).firstResult();
    }

    /**
     * Returns true if any BankAccount or BankImport references this schema. Used to prevent deletion of in-use schemas.
     */
    public boolean isReferenced(Long schemaId) {
        long accountRefs = getEntityManager()
                .createQuery("SELECT count(a) FROM BankAccount a WHERE a.defaultSchema.id = :schemaId", Long.class)
                .setParameter("schemaId", schemaId)
                .getSingleResult();
        if (accountRefs > 0) {
            return true;
        }
        long importRefs = getEntityManager()
                .createQuery("SELECT count(i) FROM BankImport i WHERE i.schema.id = :schemaId", Long.class)
                .setParameter("schemaId", schemaId)
                .getSingleResult();
        return importRefs > 0;
    }
}
