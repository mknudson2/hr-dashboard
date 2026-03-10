import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Shared proxy config for all backend routes - identifies this as the HR Hub portal
const hrProxy = {
  target: "http://localhost:8000",
  changeOrigin: true,
  headers: { "X-Portal-Source": "hr" },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/auth": hrProxy,
      "/analytics": hrProxy,
      "/employees": hrProxy,
      "/notifications": hrProxy,
      "/fmla/": { ...hrProxy, rewrite: (path: string) => path },
      "/garnishments": hrProxy,
      "/turnover": hrProxy,
      "/events": hrProxy,
      "/event-types": hrProxy,
      "/projects": hrProxy,
      "/timesheets": hrProxy,
      "/time-entries": hrProxy,
      "/compensation": hrProxy,
      "/market-data": hrProxy,
      "/performance": hrProxy,
      "/onboarding": hrProxy,
      "/offboarding": hrProxy,
      "/equipment": hrProxy,
      "/contribution-limits": hrProxy,
      "/pto": hrProxy,
      "/users": hrProxy,
      "/admin": hrProxy,
      "/aca": hrProxy,
      "/eeo": hrProxy,
      "/settings": hrProxy,
      "/emails": hrProxy,
      "/file-uploads": hrProxy,
      "/sftp": hrProxy,
      "/payroll": hrProxy,
      "/capitalized-labor": hrProxy,
      "/reports": hrProxy,
      "/in-app-notifications": hrProxy,
      "/content-management": hrProxy,
      "/recruiting": hrProxy,
    },
  },
});
