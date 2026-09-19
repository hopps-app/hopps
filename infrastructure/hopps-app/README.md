# hopps — self-hosted deployment

`docker-compose.yaml` runs a complete Hopps installation on a single host. It is
the core (frontend, API, e-invoice reader, database, files on a local volume).
The identity provider is chosen with `HOPPS_AUTH_PROVIDER` in `.env`, see
[Identity provider](#identity-provider).

Optional parts are overlays listed in `COMPOSE_FILE` in `.env`:

| Overlay                        | Adds                                          |
|--------------------------------|-----------------------------------------------|
| `docker-compose.keycloak.yaml` | Hopps's own Keycloak, see [B](#b-the-bundled-keycloak) |
| `docker-compose.s3.yaml`       | MinIO as file storage, see [File storage](#file-storage) |
| `docker-compose.document-ai.yaml` | Reading of non-ZUGFeRD receipts, see [Document AI](#document-ai) |

Every `docker compose` command in this directory then includes them. Don't pass
`-f` by hand: it replaces `COMPOSE_FILE`, so an overlay listed there would
silently drop out.

## Quick start

```bash
cp .env.example .env
# fill in the empty values (passwords, Azure/OpenAI only if wanted)
docker compose up -d
```

This runs the bundled Keycloak, the default. Open the SPA at the
`PUBLIC_SPA_URL` from your `.env` (default <http://localhost:8080>) and click
**Register organization**. The first registration creates both the
organization and its owner account in Keycloak.

To use an existing Authentik instead, see [A](#a-an-existing-authentik).

## What runs

| Service          | Purpose                                   | Default published port |
|------------------|-------------------------------------------|------------------------|
| `frontend`       | React SPA                                 | 8080                   |
| `org`            | Main API (organizations, receipts, banking) | 8101                 |
| `zugferd`        | ZUGFeRD/XRechnung extraction              | internal only          |
| `postgres`       | Database (`org`, plus `keycloak` if used) | 5432 (localhost only)  |

With `docker-compose.s3.yaml` added:

| Service          | Purpose                                   | Default published port |
|------------------|-------------------------------------------|------------------------|
| `minio`          | S3-compatible storage for uploaded receipts | 9000/9001 (localhost only) |

With `docker-compose.document-ai.yaml` added (see [Document AI](#document-ai)):

| Service          | Purpose                                   | Default published port |
|------------------|-------------------------------------------|------------------------|
| `az-document-ai` | Receipt OCR via Azure Document Intelligence | internal only        |

With `docker-compose.keycloak.yaml` added:

| Service          | Purpose                                   | Default published port |
|------------------|-------------------------------------------|------------------------|
| `keycloak`       | Login and user management                 | 8092                   |
| `mailpit`        | Catches Keycloak's mail during evaluation | 8025 (localhost only)  |

## Configuration

Everything is driven from `.env`; see `.env.example` for the full list.

The `PUBLIC_*` URLs are the addresses a **browser** uses. They end up in the
SPA bundle, in the expected token issuer, and in redirect URIs, so they have to
be the real externally reachable addresses and not e.g. `keycloak:8080`.
Service-to-service traffic uses the compose network names and is unaffected.

### Putting it behind a reverse proxy

1. Point `PUBLIC_SPA_URL` and `PUBLIC_ORG_URL` (and `PUBLIC_KEYCLOAK_URL` with
   the Keycloak overlay) at the `https://` hostnames.
2. With the Keycloak overlay, uncomment `KC_PROXY_HEADERS=xforwarded` in `.env`
   so Keycloak trusts the `X-Forwarded-*` headers.
3. Recreate the stack: `docker compose up -d`.

## Identity provider

Hopps supports two, selected with `HOPPS_AUTH_PROVIDER` in `.env`. The
`.env.example` ships with `keycloak`.

### A) An existing Authentik

In `.env`, switch the provider and drop the Keycloak overlay, then fill in
block A:

```bash
HOPPS_AUTH_PROVIDER=authentik
COMPOSE_FILE=docker-compose.yaml
```

No Keycloak runs then: the core stack talks to your Authentik directly.

For organizations whose people already have accounts in an Authentik (e.g.
Kollicloud). Hopps keeps no accounts of its own: people log in with their
Authentik account, and inviting someone into an organization links their
existing account or creates one in Authentik.

**Registering an organization is switched off** in this mode, since Hopps
cannot create the founder's account in someone else's Authentik. Organizations
are not created through the SPA.

In Authentik:

1. Create an **OAuth2/OpenID provider**:
   - Client type **Public** (the SPA is a browser app and holds no secret).
   - Redirect URI `<PUBLIC_SPA_URL>/`, strict. It serves both login and logout.
   - Subject mode **Based on the User's UUID**. Hopps stores the UUID when it
     invites someone and matches it against the token's `sub`; with the default
     (hashed ID) invited members cannot log in.
   - Scopes `openid`, `email`, `profile` and `offline_access`. Hopps uses the
     email as the user's name and needs `offline_access` for refresh tokens.
2. Create an **Application** for that provider. Its issuer (from
   `.well-known/openid-configuration`, trailing slash included) goes into
   `PUBLIC_OIDC_ISSUER_URL`, the provider's client ID into `OIDC_CLIENT_ID`.
3. Create a **service account** allowed to view, create and delete users, and an
   API token for it. That goes into `AUTHENTIK_API_TOKEN`, Authentik's base URL
   into `AUTHENTIK_URL`.
4. For invitations of people without an account: give the brand a **recovery
   flow** whose Authentication is *No requirement*. Optionally put the UUID of
   an **Email stage** into `AUTHENTIK_EMAIL_STAGE_ID` so Authentik mails the
   set-password link; without it the inviting admin sees the link and passes it
   on.

If the `org` container cannot reach the issuer under its public address, set `OIDC_INTERNAL_URL` to the same
URL with an internal host. The issuer inside the tokens is still checked
against `PUBLIC_OIDC_ISSUER_URL`.

### B) The bundled Keycloak

The default, for installations without an identity provider. `.env.example`
already contains these lines; fill in block B (add `:docker-compose.s3.yaml` to
combine it with MinIO):

```bash
HOPPS_AUTH_PROVIDER=keycloak
COMPOSE_FILE=docker-compose.yaml:docker-compose.keycloak.yaml
COMPOSE_PATH_SEPARATOR=:
```

The overlay adds Keycloak and mailpit, and points `org` and `frontend` at it.
Both lines are needed: the variable tells the backend where accounts live, the
overlay runs the Keycloak it talks to. People register
organizations themselves, and invitations create Keycloak accounts.

The Keycloak realm is imported only on the very first start (existing realms are
left alone). If you change `PUBLIC_SPA_URL` afterwards, update the `quarkus-app`
client's redirect URIs and web origins in the Keycloak admin console as well.

#### Email

`mailpit` catches every mail Keycloak sends and shows it at
<http://localhost:8025>. It exists so invitations can be verified without
sending anything. For production, point the realm at a real SMTP server in
*Keycloak → Realm settings → Email*.

#### Brokering to another provider

Keycloak can in turn broker logins to any OpenID Connect provider — Authentik,
Entra ID, Google Workspace, another Keycloak — so people sign in with an account
they already have. The login page then shows an extra button next to the
password form, and the first sign-in creates the matching Keycloak account
automatically. Unlike option A, the accounts live in Keycloak and registration
stays on.

It is off by default. Switch it on with `IDP_ENABLED=true` plus the endpoints of
your provider in `.env`; the realm import applies it on the first start.

**[EXTERNAL-IDP.md](EXTERNAL-IDP.md) has the full walkthrough** — which endpoint
goes where, how to get the provider's logo onto the button, the pitfalls around
issuer and logout, and a throwaway Authentik you can test against locally.

## File storage

Uploaded files (receipts, logos, bank import files) go to the `org_storage`
volume by default. That needs no extra service, but works with a single `org`
container only, since a local directory is not shared between containers.

To keep them in MinIO instead, add `docker-compose.s3.yaml` to `COMPOSE_FILE`
and fill in block C of `.env`. The `org_storage` volume then stays empty.

**Upgrading an installation that already stores files in MinIO:** MinIO used
to be part of the core. Add `docker-compose.s3.yaml` to `COMPOSE_FILE` before
upgrading, or existing receipts will 404: `org` would start fine on an empty
volume. Switching storage never moves files; to move them, copy them out of
MinIO first (`mc mirror`), keeping their paths.

## Document AI

ZUGFeRD/XRechnung e-invoices are always read automatically by `zugferd`. Every
other receipt (photos, scans, plain PDFs) needs `az-document-ai`, which is off
by default because it sends the receipts to Azure Document Intelligence and
OpenAI. Without it those receipts are marked for manual entry.

To enable it, append `:docker-compose.document-ai.yaml` to `COMPOSE_FILE` in
`.env` and fill in block D (`HOPPS_AZURE_DOCUMENT_AI_ENDPOINT`,
`HOPPS_AZURE_DOCUMENT_AI_KEY`) and `OPENAI_API_KEY`. These are the operator's
own accounts.

`zugferd` also uses `OPENAI_API_KEY`, to suggest tags for e-invoices. Left
empty, e-invoices are still read, just without tags. Note that `zugferd` still
attempts the OpenAI call in that case, so the invoice data is sent in a request
OpenAI then rejects.

## Versions

`TAG` pins `org`, `az-document-ai` and `zugferd` — they are released together
and share one number. `FRONTEND_TAG` and `KEYCLOAK_TAG` are numbered separately.
There is no `latest` tag; always pin explicitly.

## Backups

Two volumes hold all state:

- `hopps-app_postgres_data` — application data, and Keycloak's users with the
  Keycloak overlay
- `hopps-app_org_storage` — uploaded files (`hopps-app_minio_data` with the S3
  overlay)

Back up both together; a receipt row without its file is not recoverable.

## Other files

- `docker-compose.keycloak.yaml` — overlay adding Keycloak and mailpit, see
  [The bundled Keycloak](#b-the-bundled-keycloak).
- `docker-compose.s3.yaml` — overlay storing files in MinIO, see
  [File storage](#file-storage).
- `docker-compose.document-ai.yaml` — overlay adding `az-document-ai`, see
  [Document AI](#document-ai).
- `docker-compose-infra-only.yaml` — Postgres and MinIO only, for running the
  backend from an IDE. Development helper, not for deployment.
- `docker-compose.authentik.yaml` — throwaway Authentik for local testing
  only, not part of a deployment. With `HOPPS_AUTH_PROVIDER=authentik` you
  point `.env` at your own Authentik instead.
- `hopps-realm.json` — the Keycloak realm imported on first start.
- `EXTERNAL-IDP.md` — letting Keycloak broker logins to an existing OIDC provider.
