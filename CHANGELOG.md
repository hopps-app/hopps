# Changelog

## [2.0.0](https://github.com/hopps-app/hopps/compare/v1.0.0...v2.0.0) (2026-09-30)


### ⚠ BREAKING CHANGES

* **auth:** VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM and VITE_KEYCLOAK_CLIENT_ID are no longer read. Keycloak deployments set VITE_OIDC_PROVIDER_URL=<keycloak url>/realms/<realm> and VITE_OIDC_CLIENT_ID instead. The admin app is unchanged, see #838.
* **charts:** Das Chart bringt keine Datenbank mehr mit. Wer bisher auf das gebündelte Subchart gesetzt hat, muss PostgreSQL selbst bereitstellen und den org-Service über org.envVars/org.envFrom darauf zeigen (Beispiel in values.yaml).

### Bug Fixes

* **charts:** Chart.lock mit Chart.yaml synchronisieren ([#839](https://github.com/hopps-app/hopps/issues/839)) ([138a3cd](https://github.com/hopps-app/hopps/commit/138a3cd07e351544afc93c7c04f41c2334a8e475))


### Refactoring

* **auth:** Identity-Provisioning hinter eine Abstraktion legen, SPA-Login über oidc-client-ts ([#817](https://github.com/hopps-app/hopps/issues/817)) ([326c43f](https://github.com/hopps-app/hopps/commit/326c43f57c9e72be0cdac0b314d56e4e8b392e1d))
