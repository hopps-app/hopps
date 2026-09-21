# hopps — self-hosted deployment

`docker-compose.yaml` runs a complete Hopps installation on a single host.

## Quick start

```bash
cp .env.example .env
docker compose up -d
```

Then open the SPA at the `PUBLIC_SPA_URL` from your `.env` (default
<http://localhost:8080>) and click **Start initial setup**. This creates your
association and its first administrator account in Keycloak. Once that is done
the start page only offers the login; see [Single-tenant mode](#single-tenant-mode).

## What runs

| Service          | Purpose                                   | Default published port |
|------------------|-------------------------------------------|------------------------|
| `frontend`       | React SPA                                 | 8080                   |
| `org`            | Main API (organizations, receipts, banking) | 8101                 |
| `az-document-ai` | Receipt OCR via Azure Document Intelligence | internal only        |
| `zugferd`        | ZUGFeRD/XRechnung extraction              | internal only          |
| `keycloak`       | Login and user management                 | 8092                   |
| `postgres`       | Database (`org` + `keycloak` schemas)     | 5432 (localhost only)  |
| `minio`          | S3-compatible storage for uploaded receipts | 9000/9001 (localhost only) |
| `mailpit`        | Catches outgoing mail during evaluation   | 8025 (localhost only)  |

## Configuration

Everything is driven from `.env`; see `.env.example` for the full list.

The `PUBLIC_*` URLs are the addresses a **browser** uses. They end up in the
SPA bundle, in the Keycloak issuer, and in the client's redirect URIs, so they
have to be the real externally reachable addresses and not e.g.`keycloak:8080`.
Service-to-service traffic uses the compose network names and is unaffected.

### Putting it behind a reverse proxy

1. Point `PUBLIC_SPA_URL`, `PUBLIC_ORG_URL` and `PUBLIC_KEYCLOAK_URL` at the
   `https://` hostnames.
2. Uncomment `KC_PROXY_HEADERS=xforwarded` in `.env` so Keycloak trusts the
   `X-Forwarded-*` headers.
3. Recreate the stack: `docker compose up -d`.

The Keycloak realm is imported only on the very first start (existing realms are
left alone). If you change `PUBLIC_SPA_URL` afterwards, update the `quarkus-app`
client's redirect URIs and web origins in the Keycloak admin console as well.

### Single-tenant mode

A self-hosted installation serves exactly one association, so the stack runs
with `HOPPS_TENANCY_MODE=single` by default. Compared to the hosted SaaS
(`multi`) this means:

- **One organization, created once.** The registration form is the initial
  setup. As soon as the organization exists it is closed for good: the start
  page only shows the login, `/register` redirects home, and the API answers
  `403` (`SETUP_COMPLETE`) to further sign-ups.
- **Access by invitation only.** Someone who can log in - through a password
  account or an [external identity provider](#signing-in-with-an-external-identity-provider) -
  but is not a member of the organization sees *No access* with a logout
  button. They cannot create an organization of their own. A member with
  administrator rights invites them under *Settings → Association → Add member*;
  Keycloak sends the invitation mail (caught by `mailpit` until you configure
  SMTP). If a Keycloak account for that email already exists (typical for
  identity-provider logins), the invitation links it instead of creating one.
- **The SaaS admin API is off.** Everything under `/admin` (estate overview,
  impersonation) answers `404`. The separate admin app is not part of this stack.

The org service refuses to start with `HOPPS_TENANCY_MODE=single` while the
database holds more than one organization, so a multi-tenant database cannot be
switched over by accident. Switching from `single` to `multi` is always possible.

The SPA reads the mode from the backend (`GET /instance`); there is nothing to
configure on the frontend.

### Email

`mailpit` catches every outgoing mail and shows it at <http://localhost:8025>.
It exists so invitations can be verified without sending anything. For
production, point the realm at a real SMTP server in
*Keycloak → Realm settings → Email*.

### Signing in with an external identity provider

Keycloak can broker logins to any OpenID Connect provider — Authentik, Entra ID,
Google Workspace, another Keycloak — so people sign in with an account they
already have. The login page then shows an extra button next to the password
form, and the first sign-in creates the matching Hopps account automatically.

It is off by default. Switch it on with `IDP_ENABLED=true` plus the endpoints of
your provider in `.env`; the realm import applies it on the first start.

**[EXTERNAL-IDP.md](EXTERNAL-IDP.md) has the full walkthrough** — which endpoint
goes where, how to get the provider's logo onto the button, the pitfalls around
issuer and logout, and a throwaway Authentik you can test against locally.

### Required external services

`az-document-ai` will not start without
`HOPPS_AZURE_DOCUMENT_AI_ENDPOINT` and `HOPPS_AZURE_DOCUMENT_AI_KEY`
(Azure Document Intelligence). `OPENAI_API_KEY` is used by `az-document-ai` and
`zugferd` for field extraction. Both are the operator's own accounts.

## Versions

`TAG` pins `org`, `az-document-ai` and `zugferd` — they are released together
and share one number. `FRONTEND_TAG` and `KEYCLOAK_TAG` are numbered separately.
There is no `latest` tag; always pin explicitly.

## Backups

Two volumes hold all state:

- `hopps-app_postgres_data` — application data and Keycloak users
- `hopps-app_minio_data` — uploaded receipt files

Back up both together; a receipt row without its file is not recoverable.

## Other files

- `docker-compose-infra-only.yaml` — Postgres, Keycloak and MinIO only, for
  running the backend from an IDE. Development helper, not for deployment.
- `docker-compose.authentik.yaml` — optional Authentik identity provider used
  when testing the brokered login locally.
- `hopps-realm.json` — the Keycloak realm imported on first start.
- `EXTERNAL-IDP.md` — brokering logins to an existing OIDC provider.
