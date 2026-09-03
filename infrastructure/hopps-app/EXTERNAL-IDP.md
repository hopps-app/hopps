# Signing in with an external identity provider

Hopps authenticates against its own Keycloak. Keycloak can in turn *broker* to an
existing OpenID Connect provider, so people sign in with an account they already
have instead of a password managed here.

```
Browser ──▶ Hopps SPA ──▶ Keycloak ──▶ your OIDC provider
                          (broker)     (Authentik, Entra ID, Google, ...)
```

The login page then shows an extra button next to the password form. On the first
sign-in Keycloak creates a local account from the provider's claims, and the org
service picks it up from there. Password logins keep working alongside it.

This is optional and off by default.

---

## Configuration

Everything lives in `.env`. The values are baked into the realm on the **first**
start of the stack — see [Changing it later](#changing-it-later).

| Variable | What it is |
|---|---|
| `IDP_ENABLED` | `true` turns the button on |
| `IDP_ALIAS` | internal name; appears in the redirect URI and picks the logo |
| `IDP_DISPLAY_NAME` | the button caption |
| `IDP_CLIENT_ID` / `IDP_CLIENT_SECRET` | credentials of the client you register at the provider |
| `IDP_AUTHORIZATION_URL` | where the browser is sent to log in |
| `IDP_TOKEN_URL` | where Keycloak redeems the code |
| `IDP_USERINFO_URL` | where Keycloak reads the profile |
| `IDP_JWKS_URL` | signing keys Keycloak validates tokens against |
| `IDP_LOGOUT_URL` | called on logout |
| `IDP_ISSUER` | expected `iss` claim |

Take the last six straight from your provider's discovery document:

```bash
curl -s https://<provider>/.well-known/openid-configuration | jq
```

Map them as `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`,
`jwks_uri`, `end_session_endpoint`, `issuer`.

### At the provider

Register a **confidential** client (Hopps uses `client_secret_post`) and whitelist
this redirect URI:

```
<PUBLIC_KEYCLOAK_URL>/realms/quarkus/broker/<IDP_ALIAS>/endpoint
```

With the defaults that is `http://localhost:8092/realms/quarkus/broker/oidc/endpoint`.
Change `IDP_ALIAS` and the URI changes with it — they must stay in sync.

Hopps requests the scopes `openid email profile` and needs a **verified email
address** in the token. The org service uses the email as the principal
(`quarkus.oidc.token.principal-claim=email`); without it, sign-in fails.

---

## Two addresses, not one

Some of these URLs are opened in the **user's browser**, the rest are called by
**Keycloak itself**. When your provider is reachable under different names from
those two places — split-horizon DNS, a container network, an internal hostname —
they must be filled in differently:

| Opened by the browser | Called by Keycloak |
|---|---|
| `IDP_AUTHORIZATION_URL` | `IDP_TOKEN_URL` |
| `IDP_LOGOUT_URL` | `IDP_USERINFO_URL` |
| | `IDP_JWKS_URL` |

`IDP_ISSUER` is neither: it is compared against the `iss` claim in the token, so
it must match what the provider actually writes there — **byte for byte, trailing
slash included**. A mismatch fails the login with a signature or issuer error.

If everything is reachable under one public hostname, use it everywhere.

---

## Showing the provider's logo

The button renders with a brand logo only if the login theme has one for your
`IDP_ALIAS`. The mapping lives in the theme, in
[`frontend/keycloak-theme/src/login/Login.tsx`](../../frontend/keycloak-theme/src/login/Login.tsx):

```tsx
import kollicloudLogo from "../assets/kollicloud.svg";

const providerLogos: Record<string, string> = {
    kollicloud: kollicloudLogo
};
```

So a Kollicloud deployment gets its logo by setting `IDP_ALIAS=kollicloud`.

For any other provider, add the asset and one line to that map, then rebuild and
publish the theme image and point `KEYCLOAK_TAG` at it. Without an entry the
button still works — it falls back to the icon Keycloak reports for the provider,
or to no icon at all, showing just `IDP_DISPLAY_NAME`.

The logo also requires the Hopps theme to be active at all: the stack uses
`ghcr.io/hopps-app/hopps/hopps-keycloak`, which bundles it. On a plain Keycloak
image the realm's `loginTheme` cannot be found and Keycloak silently falls back
to its built-in theme, logging `Failed to find LOGIN theme hopps-login-theme`.

---

## Logout

Logging out of Hopps signs the user out of Keycloak and notifies the provider
over a back channel. What it does **not** do is end the session at the provider
itself — that is deliberate, and normal SSO behaviour: leaving one application
should not sign you out of everything. A user who clicks the button again is
signed straight back in without a password prompt.

The reverse direction does not work at all: logging out **at the provider** leaves
Hopps signed in until its session expires on its own. Whether it can work depends
on the provider supporting OIDC back-channel or front-channel logout — Authentik,
for one, advertises neither, so there is nothing for Keycloak to receive.

---

## Trying it locally with Authentik

`docker-compose.authentik.yaml` brings up a throwaway Authentik on
<http://localhost:9100>, admin `akadmin` / `akadmin`:

```bash
docker compose -f docker-compose.authentik.yaml up -d
```

In its admin interface create an **OAuth2/OpenID provider** (client type
*Confidential*) plus an **Application** for it. Note the client ID, the secret and
the application slug, and add the redirect URI for your alias.

Then in `.env` — the split addresses matter here, because the browser reaches
Authentik on the published port while Keycloak reaches it by container name:

```bash
IDP_ENABLED=true
IDP_ALIAS=kollicloud
IDP_DISPLAY_NAME=Kollicloud
IDP_CLIENT_ID=<from Authentik>
IDP_CLIENT_SECRET=<from Authentik>

# browser-facing
IDP_AUTHORIZATION_URL=http://localhost:9100/application/o/authorize/
IDP_LOGOUT_URL=http://localhost:9100/application/o/<slug>/end-session/

# called by Keycloak, over the compose network
IDP_TOKEN_URL=http://authentik-server:9000/application/o/token/
IDP_USERINFO_URL=http://authentik-server:9000/application/o/userinfo/
IDP_JWKS_URL=http://authentik-server:9000/application/o/<slug>/jwks/
IDP_ISSUER=http://authentik-server:9000/application/o/<slug>/

REALM_SSL_REQUIRED=none
```

`REALM_SSL_REQUIRED=none` lifts Keycloak's https requirement for provider URLs.
Keycloak enforces it only when the host does not resolve to localhost or a private
address, so without this the import would succeed or fail depending on whether
Authentik happened to be running when Keycloak started.

Recreate the stack so the realm is imported again, then sign in:

```bash
docker compose down -v && docker compose up -d
```

### One rough edge

Authentik keeps a single `name` attribute where Keycloak wants first and last name
separately. A user shows up with the full name as the first name and an empty last
name, so Keycloak asks them to complete their profile once. Adding a `family_name`
mapping to the Authentik provider or setting last_name as not required avoids that step.

---

## Changing it later

The identity provider is part of the realm import, which runs **only when the
realm does not exist yet**. Editing `.env` afterwards has no effect.

- Still setting up, no data worth keeping: `docker compose down -v && docker compose up -d`
- Live installation: change it in the Keycloak admin console instead, under
  *Identity providers → OpenID Connect v1.0*. The `.env` values then only document
  what was configured.
