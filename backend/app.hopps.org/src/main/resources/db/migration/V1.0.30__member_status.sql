-- Whether a member can log into hopps: NO_ACCESS while no Keycloak account exists, INVITED once the invitation mail
-- has gone out, INVITATION_FAILED when it could not be sent, ACTIVE for accounts that can log in right away.
alter table member
    add column status varchar(32);

-- Existing rows predate invitations: anyone already linked to a Keycloak identity can log in, the rest cannot.
update member
set status = case when keycloak_id is not null then 'ACTIVE' else 'NO_ACCESS' end;

alter table member
    alter column status set default 'NO_ACCESS';

alter table member
    alter column status set not null;
