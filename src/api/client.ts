const API_BASE = "http://127.0.0.1:8000";

export async function getAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  return res.json();
}

export async function getEmployees() {
  const res = await fetch(`${API_BASE}/employees`);
  return res.json();
}
