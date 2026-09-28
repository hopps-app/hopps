/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_TITLE: string;
    readonly VITE_GENERAL_DATE_FORMAT: string;
    readonly VITE_GENERAL_CURRENCY_SYMBOL_AFTER: string;
    // The OpenID Connect provider the SPA logs in at, see services/auth/auth.config.ts
    readonly VITE_OIDC_PROVIDER_URL: string;
    readonly VITE_OIDC_CLIENT_ID: string;
    readonly VITE_OIDC_SCOPE?: string;

    // API URLs
    readonly VITE_API_ORG_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
