/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_TITLE: string;
    readonly VITE_GENERAL_DATE_FORMAT: string;
    readonly VITE_GENERAL_CURRENCY_SYMBOL_AFTER: string;
    readonly VITE_KEYCLOAK_URL: string;
    readonly VITE_KEYCLOAK_REALM: string;
    readonly VITE_KEYCLOAK_CLIENT_ID: string;
    // Optional: log in at an external OIDC provider (e.g. Authentik) instead of Keycloak, see services/auth/auth.config.ts
    readonly VITE_OIDC_PROVIDER_URL?: string;
    readonly VITE_OIDC_CLIENT_ID?: string;

    // Feature flags
    readonly VITE_ALPHA_VERSION: string;

    // API URLs
    readonly VITE_API_ORG_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
