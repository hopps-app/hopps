CREATE SEQUENCE IF NOT EXISTS TransactionRecord_seq START WITH 1 INCREMENT BY 50;

CREATE TABLE TransactionRecord
(
    id       BIGINT NOT NULL,
    bommelId BIGINT,
    amount   BIGINT,
    CONSTRAINT pk_transactionrecord PRIMARY KEY (id)
);