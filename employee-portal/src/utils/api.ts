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

// Handle 401 errors by clearing auth state
function handleUnauthorized() {
  localStorage.removeItem('portal_auth_user');
  window.location.href = '/login';
}

// Extract error message from API response
function extractErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Request failed';
  }

  const errorObj = error as { detail?: unknown };

  // Handle FastAPI validation error format (detail is an array)
  if (Array.isArray(errorObj.detail) && errorObj.detail.length > 0) {
    const firstError = errorObj.detail[0] as { msg?: string };
    return firstError.msg || 'Validation error';
  }

  // Handle standard error format (detail is a string)
  if (typeof errorObj.detail === 'string') {
    return errorObj.detail;
  }

  return 'Request failed';
}

// GET request
export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint);
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(extractErrorMessage(error));
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
    throw new Error(extractErrorMessage(error));
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
    throw new Error(extractErrorMessage(error));
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
    throw new Error(extractErrorMessage(error));
  }
  return response.json();
}

// POST request with FormData (for file uploads)
export async function apiPostFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = `${API_URL}${endpoint}`;

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
    throw new Error(extractErrorMessage(error));
  }
  return response.json();
}
