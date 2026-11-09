-- Optional opening balance of a bommel on a reference date, like the opening balance of a bank account. Its balance is
-- this value plus every transaction booked after that date. Both are set together or not at all.
alter table bommel add column opening_balance numeric(38, 2);
alter table bommel add column opening_balance_date date;
alter table bommel add constraint bommel_opening_balance_pair check ((opening_balance is null) = (opening_balance_date is null));
