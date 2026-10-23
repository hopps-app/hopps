-- A document can now be split into several transactions (one per bommel/category combination), so the
-- document -> transaction link is 1:n. transaction.document_id was never unique, no data changes; the
-- lookup "all transactions of a document" becomes a hot path (document list, split drawer) and gets an index.
create index if not exists idx_transaction_document on transaction (document_id);
