-- Link members to their Keycloak identity via the stable, immutable user id (JWT "sub" claim)
-- instead of relying on the mutable email address.
alter table member
    add column keycloak_id varchar(255);

alter table member
    add constraint uq_member_keycloak_id unique (keycloak_id);
