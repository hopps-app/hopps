-- Document direction: INCOMING (Eingangsbeleg, expense) or OUTGOING (Ausgangsbeleg, income)
alter table document
    add column direction varchar(255) check (direction in ('INCOMING', 'OUTGOING'));

-- Existing documents are treated as incoming receipts (expenses) by default
update document set direction = 'INCOMING' where direction is null;
