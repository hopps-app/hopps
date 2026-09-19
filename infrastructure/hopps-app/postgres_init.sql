CREATE DATABASE org;
-- Used only with docker-compose.keycloak.yaml. Created regardless: this script runs
-- once, on an empty volume, so Keycloak can still be added to an existing installation.
CREATE DATABASE keycloak;
