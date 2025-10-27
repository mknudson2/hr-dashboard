export async function getAnalytics() {
  const res = await fetch("http://localhost:8000/analytics");
  return res.json();
}
