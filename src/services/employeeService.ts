// src/services/employeeService.ts
import axios from "axios";

const API_BASE = "";

export const getEmployeeById = async (id: number) => {
  const response = await axios.get(`${API_BASE}/employees/${id}`, { withCredentials: true });
  return response.data;
};

export const getAnalytics = async () => {
  const response = await axios.get(`${API_BASE}/analytics`, { withCredentials: true });
  return response.data;
};

export async function listEmployees() {
  const res = await fetch("/employees", { credentials: 'include' });
  return res.json();
}

export async function getEmployees() {
  const res = await fetch("/employees", { credentials: 'include' });
  return res.json();
}
