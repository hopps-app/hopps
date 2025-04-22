import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { keycloakify } from "keycloakify/vite-plugin";

export default defineConfig({
    plugins: [
        react(),
        keycloakify({
            themeName: "hopps-login-theme",
            accountThemeImplementation: "none",
            extraThemeProperties: ["parentTheme=keycloak", "includeCommonTemplates=true"]
        })
    ]
});
