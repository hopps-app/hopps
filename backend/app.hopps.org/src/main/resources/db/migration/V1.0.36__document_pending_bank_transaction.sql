-- A receipt uploaded onto a bank transaction remembers that bank transaction until the receipt is confirmed. Only then
-- is the bookkeeping transaction created and matched to it, the same as for a receipt uploaded on the receipts page.
-- Cleared on confirm; set to null when the bank transaction is deleted (e.g. an import rollback).
alter table document
    add column pendingBankTransaction_id bigint;

alter table document
    add constraint FK_document_pending_banktx foreign key (pendingBankTransaction_id) references BankTransaction on delete set null;

create index idx_document_pending_banktx on document (pendingBankTransaction_id);
