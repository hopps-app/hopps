package app.hopps.fin.jpa;

import app.hopps.fin.jpa.entities.TransactionRecord;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class TransactionRecordRepository implements PanacheRepository<TransactionRecord> {
    public List<TransactionRecord> findByBommelId(Long bommelId, Page page) {
        return find("bommelId", bommelId).page(page).list();
    }

    public List<TransactionRecord> findWithoutBommel(Page page) {
        return find("bommelId is null").page(page).list();
    }

    public PanacheQuery<TransactionRecord> findAll(List<Long> accessibleBommels) {
        return find("bommelId in (?1) or bommelId is null", accessibleBommels);
    }
}
