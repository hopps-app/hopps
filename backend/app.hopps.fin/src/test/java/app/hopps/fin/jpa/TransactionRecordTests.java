package app.hopps.fin.jpa;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

@QuarkusTest
class TransactionRecordTests {
    @Test
    void shouldCreateValidTransactionRecord() {
        TransactionRecord transactionRecord = new TransactionRecord();
        assertNotNull(transactionRecord);
        assertNull(transactionRecord.getId());
    }
}
