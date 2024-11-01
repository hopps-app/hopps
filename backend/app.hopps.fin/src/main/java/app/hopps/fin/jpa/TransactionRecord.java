package app.hopps.fin.jpa;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class TransactionRecord extends PanacheEntity {

    public Long getId() {
        return id;
    }
}
