# Kollicloud (Authentik) Identity Provider — backup

Removed from `src/main/resources/quarkus-realm.json` on 2026-09-01 because the
Keycloak dev-service image (26.6.4) rejects the realm import with:

```
IllegalArgumentException: The url [authorization_url] requires secure connections
    at DefaultExportImportManager.importIdentityProviders(...)
```

The `authorizationUrl` / `logoutUrl` use `http://authentik.local:9000` (and the
other endpoints `http://host.docker.internal:9000`), which newer Keycloak
versions refuse for an OIDC IdP. Dropping the IdP lets the `quarkus` realm
import cleanly so local login works again.

## How to re-add

To restore the Kollicloud login (needs a local Authentik on 9000, see the
"Authentik als Identity Provider lokal testen" section in `.claude/CLAUDE.md`),
paste this object back into the `identityProviders` array of
`src/main/resources/quarkus-realm.json`. If you keep the `http://` URLs, also
pin the dev-service to a Keycloak version that still allows them, e.g.:

```properties
%dev.quarkus.keycloak.devservices.image-name=quay.io/keycloak/keycloak:26.2.1
```

Otherwise switch the endpoints to `https://` (Authentik behind TLS).

## The exact values

```json
{
  "alias": "kollicloud",
  "displayName": "Kollicloud",
  "providerId": "oidc",
  "enabled": true,
  "updateProfileFirstLoginMode": "on",
  "trustEmail": true,
  "storeToken": false,
  "addReadTokenRoleOnCreate": false,
  "authenticateByDefault": false,
  "linkOnly": false,
  "firstBrokerLoginFlowAlias": "first broker login",
  "config": {
    "clientId": "K8L5KlhDnwhEEhLuocQoj8c2pilrLVIXGhFC5ySt",
    "clientSecret": "Xxa0fKKxZv2qHNA0pOfowWuL5nBXjwMui9vRUm1BkFNH7iWlfoo3jFUhJ1629xcmoRZzPtt52JZfxlUkSFfHARAcbgVm2D5H4QcYDWPlaHmcrUTtbSCLfG0jubn4NR6o",
    "clientAuthMethod": "client_secret_post",
    "authorizationUrl": "http://authentik.local:9000/application/o/authorize/",
    "logoutUrl": "http://authentik.local:9000/application/o/keycloak/end-session/",
    "tokenUrl": "http://host.docker.internal:9000/application/o/token/",
    "userInfoUrl": "http://host.docker.internal:9000/application/o/userinfo/",
    "issuer": "http://host.docker.internal:9000/application/o/keycloak/",
    "jwksUrl": "http://host.docker.internal:9000/application/o/keycloak/jwks/",
    "useJwksUrl": "true",
    "validateSignature": "false",
    "defaultScope": "openid email profile",
    "syncMode": "IMPORT"
  }
}
```

Note: `identityProviderMappers` was empty (`[]`) — no Kollicloud mappers to restore.
