export async function listEmployees() {
  const res = await fetch("http://localhost:8000/employees");
  return res.json();
}
