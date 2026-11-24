-- PayPal accounts: an account is either a bank account (identified by its IBAN) or a PayPal account (identified by the
-- PayPal login email, no IBAN). Existing accounts are bank accounts.
alter table BankAccount add column accountType varchar(16) not null default 'BANK';
alter table BankAccount add column paypalEmail varchar(254);
alter table BankAccount alter column iban drop not null;
alter table BankAccount add constraint CK_bankaccount_identifier check (
    (accountType = 'BANK' and iban is not null) or (accountType = 'PAYPAL' and paypalEmail is not null));

-- Movements between two of the organization's own accounts (a PayPal top-up from the bank, a withdrawal to the bank).
-- They keep the account balance right but need no receipt and are not part of the reconciliation worklist.
alter table BankTransaction drop constraint banktransaction_status_check;
alter table BankTransaction add constraint banktransaction_status_check
    check (status in ('UNMATCHED', 'PARTIALLY_MATCHED', 'FULLY_MATCHED', 'IGNORED', 'TRANSFER'));
