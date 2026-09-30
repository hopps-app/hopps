/**
 * Issuer URL of the OpenID Connect provider the SPA logs in at, exactly as its discovery document reports it: for
 * Keycloak the realm (`https://id.example.org/realms/hopps`), for Authentik the application
 * (`https://auth.example.org/application/o/hopps/`).
 */
export const oidcProviderUrl: string | undefined = import.meta.env.VITE_OIDC_PROVIDER_URL?.trim() || undefined;

/** Client id of the SPA at that provider. */
export const oidcClientId: string | undefined = import.meta.env.VITE_OIDC_CLIENT_ID?.trim() || undefined;

/**
 * Scopes to request. The default suits Keycloak. Authentik additionally needs `offline_access`, without which it
 * issues no refresh token; with Keycloak that scope would turn every login into an offline session.
 *
 * The container image is built with a placeholder, which the minifier keeps in place of this fallback, so there the
 * default comes from `docker/replaceEnvs.sh`.
 */
export const oidcScope: string = import.meta.env.VITE_OIDC_SCOPE?.trim() || 'openid profile email';
