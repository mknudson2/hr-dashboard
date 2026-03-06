const API_BASE = "";

export async function getAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getEmployees() {
  const res = await fetch(`${API_BASE}/employees/`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
