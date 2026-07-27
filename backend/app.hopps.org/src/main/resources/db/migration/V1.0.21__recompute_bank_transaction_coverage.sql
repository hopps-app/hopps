-- Recompute the denormalized bank-transaction coverage and status with the corrected sign convention.
--
-- recomputeStatus previously signed a movement's coverage by the LINKED TRANSACTION's direction. An income movement
-- matched to an oppositely-signed transaction (e.g. a refund allocated to the original expense) therefore got a
-- negative coverage, which doubled the displayed still-open amount (|amount - coverage|) and left the movement stuck
-- as PARTIALLY_MATCHED. Coverage is now signed by the MOVEMENT's own direction (how much of it is allocated). Re-derive
-- matchedamount and status for already-imported matches so existing data reflects the fix without being re-matched.
update BankTransaction bt
set matchedamount = coalesce((
    select sum(case when bt.amount < 0 then -m.matchedamount else m.matchedamount end)
    from BankTransactionMatch m
    where m.banktransaction_id = bt.id
), 0)
where bt.status <> 'IGNORED';

update BankTransaction bt
set status = case
    when bt.matchedamount = 0 then 'UNMATCHED'
    when abs(bt.matchedamount) >= abs(bt.amount) then 'FULLY_MATCHED'
    else 'PARTIALLY_MATCHED'
end
where bt.status <> 'IGNORED';
