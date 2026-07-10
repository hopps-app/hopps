/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_KEYCLOAK_URL: string;
    readonly VITE_KEYCLOAK_REALM: string;
    readonly VITE_KEYCLOAK_CLIENT_ID: string;
    /** Realm role required to access the admin app. */
    readonly VITE_ADMIN_REALM_ROLE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
