import { API_URL } from '@/config/api';

// Generic API fetch wrapper with credentials
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_URL}${endpoint}`;
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

function handleUnauthorized() {
  localStorage.removeItem('applicant_user');
  window.location.href = '/login';
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint);
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}

export async function apiPut<T>(endpoint: string, body?: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'DELETE',
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}

export async function apiPostFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
}
