import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
// Shared proxy config for all backend routes - identifies this as the Employee Portal
var portalProxy = {
    target: "http://localhost:8000",
    changeOrigin: true,
    headers: { "X-Portal-Source": "employee-portal" },
};
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 5174,
        proxy: {
            "/auth": portalProxy,
            "/portal": portalProxy,
            "/fmla": portalProxy,
            "/employees": portalProxy,
            "/performance": portalProxy,
            "/in-app-notifications": portalProxy,
            "/mimir": {
                target: "http://localhost:8000",
                changeOrigin: true,
                headers: { "X-Portal-Source": "employee-portal" },
            },
            "/portal/internal-jobs": portalProxy,
            "/portal/my-internal-applications": portalProxy,
            "/portal/hiring-manager": portalProxy,
            "/recruiting/lifecycle": portalProxy,
        },
    },
});
