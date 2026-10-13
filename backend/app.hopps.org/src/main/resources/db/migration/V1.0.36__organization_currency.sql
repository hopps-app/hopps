-- The currency an organization keeps its books in. Amounts are shown in this currency everywhere in hopps, which is
-- why it can only be changed while the organization has no transactions yet (enforced by the application).
-- Existing organizations were all euro-based, so the default covers them.
alter table organization
    add column currency varchar(3) not null default 'EUR';

alter table organization
    add constraint organization_currency_check check (currency in ('EUR', 'CHF'));
