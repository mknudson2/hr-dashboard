/**
 * Centralized API utility with httpOnly cookie authentication
 *
 * Authentication is handled via httpOnly cookies (XSS protection).
 * The JWT token is stored in an httpOnly cookie that is automatically
 * sent with every request when credentials: 'include' is set.
 */

const API_BASE = '';

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  return fetch(url, {
    ...options,
    credentials: 'include',  // Send httpOnly cookie with every request
    headers: {
      ...options.headers,
    },
  });
}

export async function apiGet<T = unknown>(endpoint: string): Promise<T> {
  const res = await apiFetch(endpoint);
  return res.json();
}

export async function apiPost<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
  const res = await apiFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function apiPut<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
  const res = await apiFetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function apiDelete<T = unknown>(endpoint: string): Promise<T> {
  const res = await apiFetch(endpoint, { method: 'DELETE' });
  return res.json();
}

// For file uploads
export async function apiPostFormData<T = unknown>(endpoint: string, formData: FormData): Promise<T> {
  const res = await apiFetch(endpoint, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// For blob downloads (PDFs, Excel files)
export async function apiGetBlob(endpoint: string): Promise<Blob> {
  const res = await apiFetch(endpoint);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

export { API_BASE };
