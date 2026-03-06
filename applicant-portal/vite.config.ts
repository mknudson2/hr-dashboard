import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Proxy config for applicant portal API routes
const applicantProxy = {
  target: "http://localhost:8000",
  changeOrigin: true,
  headers: { "X-Portal-Source": "applicant-portal" },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
    proxy: {
      "/applicant-portal": applicantProxy,
    },
  },
});
