/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_TITLE: string;
    readonly VITE_KEYCLOAK_URL: string;
    readonly VITE_KEYCLOAK_REALM: string;
    readonly VITE_KEYCLOAK_CLIENT_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
