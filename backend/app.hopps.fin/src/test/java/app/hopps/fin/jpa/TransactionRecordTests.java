package app.hopps.fin.jpa;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.javamoney.moneta.Money;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class TransactionRecordTests {

    @Inject
    TransactionRecordRepository repository;

    @Test
    void shouldCreateValidTransactionRecord() {
        TransactionRecord transactionRecord = new TransactionRecord();
        assertNotNull(transactionRecord);
        assertNull(transactionRecord.getId());
    }

    @Test
    void shouldPersistTransactionRecord() {

        // given
        TransactionRecord transactionRecord = new TransactionRecord();
        transactionRecord.setAmount(Money.of(10, "EUR"));

        // when
        QuarkusTransaction.begin();
        repository.persist(transactionRecord);
        QuarkusTransaction.commit();

        // then
        TransactionRecord fromDb = repository.listAll().getFirst();
        assertEquals(10L, fromDb.getAmount().getNumber().longValueExact());
        assertEquals("EUR", fromDb.getAmount().getCurrency().getCurrencyCode());
    }
}
