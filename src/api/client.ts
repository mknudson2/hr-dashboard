const API_BASE = "";

export async function getAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/`);
  return res.json();
}

export async function getEmployees() {
  const res = await fetch(`${API_BASE}/employees/`);
  return res.json();
}
