import { API_URL } from '@/config/api';

// Direct backend URL for routes that don't work through the Vite proxy
const BACKEND_URL = 'http://localhost:8000';

// Routes that need to use the direct backend URL (Vite proxy workaround)
const DIRECT_BACKEND_ROUTES = ['/performance'];

// Generic API fetch wrapper with credentials
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  // Check if this endpoint needs to use the direct backend URL
  const needsDirectBackend = DIRECT_BACKEND_ROUTES.some(route => endpoint.startsWith(route));
  const baseUrl = needsDirectBackend ? BACKEND_URL : API_URL;
  const url = `${baseUrl}${endpoint}`;

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Handle 401 errors by clearing auth state
function handleUnauthorized() {
  localStorage.removeItem('portal_auth_user');
  window.location.href = '/login';
}

// GET request
export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint);
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}

// POST request
export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}

// PUT request
export async function apiPut<T>(endpoint: string, body?: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}

// DELETE request
export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'DELETE',
  });
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}

// POST request with FormData (for file uploads)
export async function apiPostFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  // Check if this endpoint needs to use the direct backend URL
  const needsDirectBackend = DIRECT_BACKEND_ROUTES.some(route => endpoint.startsWith(route));
  const baseUrl = needsDirectBackend ? BACKEND_URL : API_URL;
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    // Don't set Content-Type header - let the browser set it with the boundary for FormData
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}
