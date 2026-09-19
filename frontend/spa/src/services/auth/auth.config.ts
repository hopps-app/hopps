/**
 * Issuer URL of a generic OpenID Connect provider, e.g. an Authentik application
 * (`https://auth.example.org/application/o/hopps/`). Set it for deployments that run without Keycloak because their
 * accounts live in the partner's own identity provider: the SPA then logs in there directly. Unset (the default), the
 * SPA logs in through Keycloak.
 */
export const oidcProviderUrl: string | undefined = import.meta.env.VITE_OIDC_PROVIDER_URL?.trim() || undefined;

/** Client id of the SPA at that provider. Only read when {@link oidcProviderUrl} is set. */
export const oidcClientId: string | undefined = import.meta.env.VITE_OIDC_CLIENT_ID?.trim() || undefined;

/**
 * Registering an organization creates the founder's account, which hopps can only do in its own Keycloak. With an
 * external provider the partner owns the accounts, and people start from an existing login instead.
 */
export const isSelfRegistrationEnabled = oidcProviderUrl === undefined;
