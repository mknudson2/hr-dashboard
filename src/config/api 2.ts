// API Configuration
// In development, we use a Vite proxy to avoid cross-origin cookie issues
// The proxy is configured in vite.config.ts to forward API paths to http://localhost:8000

// API base URL - empty in dev (uses proxy), can be set via env in production
export const API_URL = import.meta.env.VITE_API_URL || '';

// Helper to build API URLs
export const apiUrl = (path: string) => `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
