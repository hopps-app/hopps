-- Transactions now store the counterparty on the side matching their direction (expense = sender,
-- income = recipient) and keep the organization on the opposite side. Existing income transactions
-- (total >= 0) previously held their counterparty in `sender`; move it to `recipient` so it keeps
-- displaying. The organization side is only back-filled for transactions created/edited from now on.
update transaction
set recipient_id = sender_id,
    sender_id    = null
where total >= 0
  and recipient_id is null
  and sender_id is not null;
