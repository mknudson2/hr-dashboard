import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy all API requests to backend to avoid cross-origin cookie issues
      // This handles all backend endpoints without requiring code changes
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/analytics": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/employees": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/notifications": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/fmla": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/garnishments": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/turnover": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/events": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/event-types": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/projects": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/timesheets": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/time-entries": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/compensation": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/market-data": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/performance": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/onboarding": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/offboarding": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/equipment": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/contribution-limits": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/pto": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/users": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/aca": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/eeo": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/emails": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/file-uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/sftp": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/payroll": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/capitalized-labor": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/reports": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
