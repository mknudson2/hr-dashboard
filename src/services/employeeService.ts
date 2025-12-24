// src/services/employeeService.ts
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

export const getEmployeeById = async (id: number) => {
  const response = await axios.get(`${API_BASE}/employees/${id}`);
  return response.data;
};

export const getAnalytics = async () => {
  const response = await axios.get(`${API_BASE}/analytics`);
  return response.data;
};

export async function listEmployees() {
  const res = await fetch("http://localhost:8000/employees");
  return res.json();
}

export async function getEmployees() {
  const res = await fetch("http://localhost:8000/employees");
  return res.json();
}
