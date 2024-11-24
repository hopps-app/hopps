package app.hopps.fin.jpa;

import app.hopps.fin.jpa.entities.TransactionRecord;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TransactionRecordRepository implements PanacheRepository<TransactionRecord> {
}
