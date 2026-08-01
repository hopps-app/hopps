-- The office a person holds in the association (Vereinsfunktion), e.g. "1. Vorsitzende" or "Kassenwart".
-- Free text and nullable: it is descriptive only and grants no permissions. Access rights stay in Keycloak.
ALTER TABLE member ADD COLUMN position varchar(255);
