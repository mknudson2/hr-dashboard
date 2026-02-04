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
      // Proxy API requests to backend
      // Use specific paths to avoid conflicts with frontend routes
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/analytics": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/notifications": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Turnover - specific API paths (frontend has /turnover page)
      "/turnover/dashboard": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/turnover/terminations": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/turnover/internal-changes": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/turnover/employee": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Events - specific API paths (frontend has /events page)
      "/events/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/event-types": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // FMLA - specific API paths (frontend has /fmla page)
      "/fmla/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Garnishments - specific API paths (frontend has /garnishments page)
      "/garnishments/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Employees - specific API paths (frontend has /employees page)
      "/employees/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Compensation - specific API paths (frontend has /compensation page)
      "/compensation/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Performance - specific API paths (frontend has /performance page)
      "/performance/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Onboarding - specific API paths (frontend has /onboarding page)
      "/onboarding/tasks": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/onboarding/dashboard": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/onboarding/templates": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Offboarding - specific API paths (frontend has /offboarding page)
      "/offboarding/tasks": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/offboarding/dashboard": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/offboarding/templates": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/offboarding/exit-interviews": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/offboarding/package": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Equipment - specific API paths (frontend has /equipment page)
      "/equipment/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Payroll - specific API paths (frontend has /payroll page)
      "/payroll/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // ACA - specific API paths (frontend has /aca page)
      "/aca/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // EEO - specific API paths (frontend has /eeo page)
      "/eeo/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Users - specific API paths (frontend has /users page)
      "/users/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Emails - specific API paths (frontend has /emails page)
      "/emails/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // File uploads - specific API paths (frontend has /file-uploads page)
      "/file-uploads/": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Other API routes (no frontend page conflicts)
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
      "/market-data": {
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
      "/admin": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/sftp": {
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
