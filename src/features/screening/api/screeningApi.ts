/**
 * API client for the Bifrost screening backend.
 * All calls go to the FastAPI backend (NOT directly to TazWorks).
 */

import type {
  ScreeningProduct,
  ScreeningOrder,
  OrderSubmitRequest,
  OrderSubmitResponse,
  ComplianceDocument,
} from "../types/screening";

const API_BASE = "/screening";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(typeof error.detail === "string" ? error.detail : `HTTP ${response.status}`);
  }

  return response.json();
}

// --- Products ---

export async function fetchProducts(): Promise<ScreeningProduct[]> {
  const data = await apiFetch<{ products: ScreeningProduct[] }>("/products");
  return data.products;
}

// --- Certification ---

export async function fetchCertificationText(): Promise<string> {
  const data = await apiFetch<{ certification_text: string }>("/certification");
  return data.certification_text;
}

// --- Orders ---

export async function submitOrder(
  request: OrderSubmitRequest
): Promise<OrderSubmitResponse> {
  return apiFetch<OrderSubmitResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchOrders(): Promise<{ orders: ScreeningOrder[] }> {
  return apiFetch<{ orders: ScreeningOrder[] }>("/orders");
}

export async function fetchOrder(orderId: number): Promise<ScreeningOrder> {
  return apiFetch<ScreeningOrder>(`/orders/${orderId}`);
}

export async function fetchOrderStatus(orderId: number) {
  return apiFetch<{ orderGuid: string; status: string; decision?: string; reportUrl?: string }>(
    `/orders/${orderId}/status`
  );
}

export async function fetchOrderResults(orderId: number) {
  return apiFetch<Record<string, unknown>>(`/orders/${orderId}/results`);
}

// --- Compliance Documents ---

export async function fetchComplianceDocuments(
  orderId: number,
  docType: string = "APPLICANT_AUTHORIZATION"
): Promise<ComplianceDocument[]> {
  const data = await apiFetch<{ documents: ComplianceDocument[] }>(
    `/orders/${orderId}/documents?doc_type=${docType}`
  );
  return data.documents;
}
