import path from "path"
import react from "@vitejs/plugin-react"
import svgr from "vite-plugin-svgr";
import {defineConfig} from "vite"

export default defineConfig({
    plugins: [svgr(), react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});