package app.hopps.fin.jpa;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.annotation.Nonnull;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;

import javax.money.MonetaryAmount;

@Entity
public class TransactionRecord extends PanacheEntity {

    private Long bommelId;

    @Nonnull
    @Convert(converter = MonetaryAmountConverter.class)
    private MonetaryAmount amount;

    public Long getId() {
        return id;
    }

    public Long getBommelId() {
        return bommelId;
    }

    public void setBommelId(Long bommelId) {
        this.bommelId = bommelId;
    }

    public MonetaryAmount getAmount() {
        return amount;
    }

    public void setAmount(MonetaryAmount amount) {
        this.amount = amount;
    }
}
