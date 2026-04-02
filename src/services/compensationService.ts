const API_URL = "";

// ============================================================================
// DASHBOARD
// ============================================================================

export const getCompensationDashboard = async () => {
  const response = await fetch(`${API_URL}/compensation/dashboard`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch compensation dashboard");
  return response.json();
};

export const getEmployeeCompensationSummary = async (employeeId: string) => {
  const response = await fetch(`${API_URL}/compensation/employee/${employeeId}/summary`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch employee compensation summary");
  return response.json();
};

// ============================================================================
// BONUSES
// ============================================================================

export const getBonuses = async (filters?: {
  employee_id?: string;
  fiscal_year?: number;
  status?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.employee_id) params.append("employee_id", filters.employee_id);
  if (filters?.fiscal_year) params.append("fiscal_year", filters.fiscal_year.toString());
  if (filters?.status) params.append("status", filters.status);

  const response = await fetch(`${API_URL}/compensation/bonuses?${params}`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch bonuses");
  return response.json();
};

export const getBonus = async (bonusId: number) => {
  const response = await fetch(`${API_URL}/compensation/bonuses/${bonusId}`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch bonus");
  return response.json();
};

export const createBonus = async (bonus: Record<string, unknown>) => {
  const response = await fetch(`${API_URL}/compensation/bonuses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(bonus),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create bonus");
  }
  return response.json();
};

export const updateBonus = async (bonusId: number, bonus: Record<string, unknown>) => {
  const response = await fetch(`${API_URL}/compensation/bonuses/${bonusId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(bonus),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update bonus");
  }
  return response.json();
};

export const deleteBonus = async (bonusId: number) => {
  const response = await fetch(`${API_URL}/compensation/bonuses/${bonusId}`, {
    method: "DELETE",
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Failed to delete bonus");
  return response.json();
};

// ============================================================================
// EQUITY GRANTS
// ============================================================================

export const getEquityGrants = async (filters?: {
  employee_id?: string;
  status?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.employee_id) params.append("employee_id", filters.employee_id);
  if (filters?.status) params.append("status", filters.status);

  const response = await fetch(`${API_URL}/compensation/equity-grants?${params}`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch equity grants");
  return response.json();
};

export const getEquityGrant = async (grantId: number) => {
  const response = await fetch(`${API_URL}/compensation/equity-grants/${grantId}`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch equity grant");
  return response.json();
};

export const createEquityGrant = async (grant: Record<string, unknown>) => {
  const response = await fetch(`${API_URL}/compensation/equity-grants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(grant),
  });
  if (!response.ok) throw new Error("Failed to create equity grant");
  return response.json();
};

export const updateEquityGrant = async (grantId: number, grant: Record<string, unknown>) => {
  const response = await fetch(`${API_URL}/compensation/equity-grants/${grantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(grant),
  });
  if (!response.ok) throw new Error("Failed to update equity grant");
  return response.json();
};

export const deleteEquityGrant = async (grantId: number) => {
  const response = await fetch(`${API_URL}/compensation/equity-grants/${grantId}`, {
    method: "DELETE",
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Failed to delete equity grant");
  return response.json();
};

// ============================================================================
// COMPENSATION REVIEWS
// ============================================================================

export const getCompensationReviews = async (filters?: {
  employee_id?: string;
  status?: string;
  review_type?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.employee_id) params.append("employee_id", filters.employee_id);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.review_type) params.append("review_type", filters.review_type);

  const response = await fetch(`${API_URL}/compensation/reviews?${params}`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch compensation reviews");
  return response.json();
};

export const getCompensationReview = async (reviewId: number) => {
  const response = await fetch(`${API_URL}/compensation/reviews/${reviewId}`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch compensation review");
  return response.json();
};

export const createCompensationReview = async (review: Record<string, unknown>) => {
  const response = await fetch(`${API_URL}/compensation/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(review),
  });
  if (!response.ok) throw new Error("Failed to create compensation review");
  return response.json();
};

export const updateCompensationReview = async (reviewId: number, review: Record<string, unknown>) => {
  const response = await fetch(`${API_URL}/compensation/reviews/${reviewId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(review),
  });
  if (!response.ok) throw new Error("Failed to update compensation review");
  return response.json();
};

export const deleteCompensationReview = async (reviewId: number) => {
  const response = await fetch(`${API_URL}/compensation/reviews/${reviewId}`, {
    method: "DELETE",
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Failed to delete compensation review");
  return response.json();
};

// ============================================================================
// WAGE INCREASE CYCLES
// ============================================================================

export const getWageIncreaseCycles = async (filters?: {
  fiscal_year?: number;
  status?: string;
  cycle_type?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.fiscal_year) params.append("fiscal_year", filters.fiscal_year.toString());
  if (filters?.status) params.append("status", filters.status);
  if (filters?.cycle_type) params.append("cycle_type", filters.cycle_type);

  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles?${params}`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch wage increase cycles");
  return response.json();
};

export const getWageIncreaseCycle = async (cycleId: number) => {
  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles/${cycleId}`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch wage increase cycle");
  return response.json();
};

export const createWageIncreaseCycle = async (cycle: Record<string, unknown>) => {
  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(cycle),
  });
  if (!response.ok) throw new Error("Failed to create wage increase cycle");
  return response.json();
};

export const updateWageIncreaseCycle = async (cycleId: number, cycle: Record<string, unknown>) => {
  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles/${cycleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify(cycle),
  });
  if (!response.ok) throw new Error("Failed to update wage increase cycle");
  return response.json();
};

export const deleteWageIncreaseCycle = async (cycleId: number) => {
  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles/${cycleId}`, {
    method: "DELETE",
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Failed to delete wage increase cycle");
  return response.json();
};

export const getCycleReviews = async (cycleId: number, filters?: { status?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);

  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles/${cycleId}/reviews?${params}`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch cycle reviews");
  return response.json();
};

export const getCycleAnalytics = async (cycleId: number) => {
  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles/${cycleId}/analytics`, { credentials: 'include' });
  if (!response.ok) throw new Error("Failed to fetch cycle analytics");
  return response.json();
};

export const approveCycle = async (cycleId: number, approvedBy: string, notes?: string) => {
  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles/${cycleId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify({ approved_by: approvedBy, notes }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to approve cycle");
  }
  return response.json();
};

export const transitionCycleStatus = async (cycleId: number, newStatus: string, notes?: string) => {
  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles/${cycleId}/transition?new_status=${newStatus}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to transition cycle status");
  }
  return response.json();
};

export const closeCycle = async (cycleId: number, closedBy: string, notes?: string) => {
  const response = await fetch(`${API_URL}/compensation/wage-increase-cycles/${cycleId}/close?closed_by=${closedBy}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to close cycle");
  }
  return response.json();
};
