-- Partial allocation flag for bank-transaction matches.
--
-- matchedamount already stores how much of a bank transaction is covered by a given bookkeeping transaction. Until now
-- it was always the transaction's full total, re-snapshotted whenever the transaction amount changed. To support
-- splitting one bank movement (e.g. a collective transfer / Sammelüberweisung) across several transactions, the user
-- can now set this amount explicitly. amountmanual marks such hand-set allocations so they are not overwritten by the
-- automatic re-snapshot.
alter table BankTransactionMatch
    add column amountmanual boolean not null default false;
