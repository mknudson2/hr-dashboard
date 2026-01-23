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
    port: 5174,
    proxy: {
      // Proxy all API requests to backend to avoid cross-origin cookie issues
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/portal": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/fmla": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/employees": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
