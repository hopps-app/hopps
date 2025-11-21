-- Add async document analysis support to TransactionRecord
-- This enables asynchronous processing with status tracking and analysis results storage

-- Add status tracking columns to TransactionRecord
ALTER TABLE TransactionRecord
    ADD COLUMN created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE TransactionRecord
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';

ALTER TABLE TransactionRecord
    ADD COLUMN updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make total nullable (populated by analysis or user)
ALTER TABLE TransactionRecord
    ALTER COLUMN total DROP NOT NULL;

-- Create sequence for analysis results
CREATE SEQUENCE transaction_record_analysis_result_SEQ START WITH 1 INCREMENT BY 50;

-- Create transaction record analysis result table
CREATE TABLE transaction_record_analysis_result
(
    id                   BIGINT                      NOT NULL PRIMARY KEY,
    transaction_record_id BIGINT                     NOT NULL UNIQUE,
    status               VARCHAR(20)                 NOT NULL,
    extracted_data       JSONB,
    extraction_method    VARCHAR(50),
    confidence_scores    JSONB,
    error_code           VARCHAR(100),
    error_message        VARCHAR(1000),
    failed_step          VARCHAR(50),
    started_at           TIMESTAMP(6) WITH TIME ZONE,
    completed_at         TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT fk_analysis_result_transaction
        FOREIGN KEY (transaction_record_id) REFERENCES TransactionRecord (id)
);

-- Create analysis step progress table
CREATE TABLE analysis_step_progress
(
    analysis_result_id BIGINT      NOT NULL,
    step               VARCHAR(50) NOT NULL,
    status             VARCHAR(20) NOT NULL,
    PRIMARY KEY (analysis_result_id, step),
    CONSTRAINT fk_step_progress_analysis_result
        FOREIGN KEY (analysis_result_id) REFERENCES transaction_record_analysis_result (id)
);

-- Create indexes for better query performance
CREATE INDEX idx_transaction_record_status ON TransactionRecord (status);
CREATE INDEX idx_analysis_result_status ON transaction_record_analysis_result (status);
CREATE INDEX idx_transaction_record_created_at ON TransactionRecord (created_at);
