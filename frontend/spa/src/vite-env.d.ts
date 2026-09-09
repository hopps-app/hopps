/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_TITLE: string;
    readonly VITE_GENERAL_DATE_FORMAT: string;
    readonly VITE_GENERAL_CURRENCY_SYMBOL_AFTER: string;
    readonly VITE_KEYCLOAK_URL: string;
    readonly VITE_KEYCLOAK_REALM: string;
    readonly VITE_KEYCLOAK_CLIENT_ID: string;

    // API URLs
    readonly VITE_API_ORG_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
