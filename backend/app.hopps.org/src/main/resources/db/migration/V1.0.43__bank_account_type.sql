-- Bank accounts get a type: an ordinary bank account (imported via CSV schema / MT940) or a Pleo card account (imported
-- from Pleo's expense export, with receipts and categories). The IBAN becomes optional: a card account has none, and
-- for ordinary accounts it is no longer needed to import.
alter table BankAccount
    alter column iban drop not null;

alter table BankAccount
    add column accounttype varchar(20) not null default 'BANK';

-- The category group the last Pleo import filled from the export's "Category" column; offered again next time.
alter table BankAccount
    add column categorygroup_id bigint references category_group on delete set null;
