# Changelog

## [2.1.0](https://github.com/hopps-app/hopps/compare/v2.0.0...v2.1.0) (2026-10-21)


### Features

* **bankimport:** Volksbanken / Raiffeisenbanken Umsatz-CSV template ([#853](https://github.com/hopps-app/hopps/issues/853)) ([a81e621](https://github.com/hopps-app/hopps/commit/a81e62115c0aaa15d51da6f0cf0c5e942322d49e))
* CHF support for registration, bank accounts and import ([#852](https://github.com/hopps-app/hopps/issues/852)) ([504988c](https://github.com/hopps-app/hopps/commit/504988ccecf0396d57febf5623dd455f39da7972))
* **organization:** configurable currency (EUR/CHF), locked after first transaction ([#819](https://github.com/hopps-app/hopps/issues/819)) ([679645c](https://github.com/hopps-app/hopps/commit/679645c84ee3691cfdd41a00499b6a5630be8e28))


### Bug Fixes

* **frontend:** transactions start filter, CHF currency note, password comparison ([#870](https://github.com/hopps-app/hopps/issues/870)) ([43b3843](https://github.com/hopps-app/hopps/commit/43b3843b089e9e41b72a7344d359363c55388345))
* oidc scope default, upgrade notes workflow, compose image tags and org database ([#844](https://github.com/hopps-app/hopps/issues/844)) ([98c8cef](https://github.com/hopps-app/hopps/commit/98c8cefacc6f8db938a1d384704ad5cd233532da))

## [2.0.0](https://github.com/hopps-app/hopps/compare/v1.0.0...v2.0.0) (2026-09-30)


### ⚠ BREAKING CHANGES

* **auth:** VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM and VITE_KEYCLOAK_CLIENT_ID are no longer read. Keycloak deployments set VITE_OIDC_PROVIDER_URL=<keycloak url>/realms/<realm> and VITE_OIDC_CLIENT_ID instead. The admin app is unchanged, see #838.
* **charts:** Das Chart bringt keine Datenbank mehr mit. Wer bisher auf das gebündelte Subchart gesetzt hat, muss PostgreSQL selbst bereitstellen und den org-Service über org.envVars/org.envFrom darauf zeigen (Beispiel in values.yaml).

### Bug Fixes

* **charts:** Chart.lock mit Chart.yaml synchronisieren ([#839](https://github.com/hopps-app/hopps/issues/839)) ([138a3cd](https://github.com/hopps-app/hopps/commit/138a3cd07e351544afc93c7c04f41c2334a8e475))


### Refactoring

* **auth:** Identity-Provisioning hinter eine Abstraktion legen, SPA-Login über oidc-client-ts ([#817](https://github.com/hopps-app/hopps/issues/817)) ([326c43f](https://github.com/hopps-app/hopps/commit/326c43f57c9e72be0cdac0b314d56e4e8b392e1d))
