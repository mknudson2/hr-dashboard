/**
 * Annual Wage Increase API service.
 * Follows the same pattern as compensationService.ts.
 */

const API_URL = '';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// =============================================================================
// CYCLES
// =============================================================================

export interface AnnualCycleSettings {
  lookback_date: string;
  wage_matrix_exempt: boolean;
}

export interface AnnualCycle {
  id: number;
  cycle_id: string;
  name: string;
  fiscal_year: number;
  cycle_type: string;
  effective_date: string | null;
  status: string;
  total_budget: number;
  budget_used: number;
  budget_remaining: number;
  total_employees_eligible: number;
  is_annual_auto: boolean;
  target_increase_percentage: number;
  created_at: string | null;
  settings?: AnnualCycleSettings;
}

export interface CreateCycleResponse {
  message: string;
  created: boolean;
  cycle: AnnualCycle;
}

export async function getAnnualCycles(fiscalYear?: number): Promise<AnnualCycle[]> {
  const params = fiscalYear ? `?fiscal_year=${fiscalYear}` : '';
  const res = await fetch(`${API_URL}/annual-increase/cycles${params}`, {
    credentials: 'include',
  });
  return handleResponse(res);
}

export async function createAnnualCycle(fiscalYear: number): Promise<CreateCycleResponse> {
  const res = await fetch(`${API_URL}/annual-increase/cycles?fiscal_year=${fiscalYear}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(res);
}

export async function getAnnualCycle(cycleId: number): Promise<AnnualCycle> {
  const res = await fetch(`${API_URL}/annual-increase/cycles/${cycleId}`, {
    credentials: 'include',
  });
  return handleResponse(res);
}

export async function updateCycleSettings(
  cycleId: number,
  settings: { lookback_date?: string; wage_matrix_exempt?: boolean }
): Promise<AnnualCycleSettings> {
  const res = await fetch(`${API_URL}/annual-increase/cycles/${cycleId}/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return handleResponse(res);
}

export async function recalculateCycle(cycleId: number): Promise<AnnualCycle> {
  const res = await fetch(`${API_URL}/annual-increase/cycles/${cycleId}/recalculate`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse(res);
}

// =============================================================================
// BUDGET AREAS
// =============================================================================

export interface BudgetArea {
  id: number;
  cycle_id: number;
  decision_maker_employee_id: string | null;
  area_label: string;
  title_level: string | null;
  eligible_count: number;
  ineligible_count: number;
  total_budget: number;
  total_allocated: number;
  difference: number;
  is_dashboard_enabled: boolean;
  submission_status: string;
  submitted_at: string | null;
  overage_justification: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export async function getBudgetAreas(cycleId: number): Promise<BudgetArea[]> {
  const res = await fetch(`${API_URL}/annual-increase/cycles/${cycleId}/budget-areas`, {
    credentials: 'include',
  });
  return handleResponse(res);
}

export async function toggleAreaDashboard(
  cycleId: number,
  areaId: number,
  enabled: boolean
): Promise<BudgetArea> {
  const res = await fetch(
    `${API_URL}/annual-increase/cycles/${cycleId}/budget-areas/${areaId}/toggle-dashboard`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_dashboard_enabled: enabled }),
    }
  );
  return handleResponse(res);
}

// =============================================================================
// EMPLOYEES
// =============================================================================

export interface EmployeeEntry {
  id: number;
  cycle_id: number;
  budget_area_id: number;
  employee_id: string;
  employee_name: string | null;
  is_eligible: boolean;
  ineligibility_reason: string | null;
  eligibility_override: boolean;
  override_justification: string | null;
  current_base_rate: number;
  current_annual_wage: number;
  wage_type: string | null;
  employment_type: string | null;
  position: string | null;
  supervisor_name: string | null;
  team: string | null;
  increase_percentage: number;
  projected_base_rate: number;
  projected_annual_wage: number;
  total_difference: number;
}

export async function getCycleEmployees(
  cycleId: number,
  filters?: { eligible?: boolean; budget_area_id?: number; search?: string }
): Promise<EmployeeEntry[]> {
  const params = new URLSearchParams();
  if (filters?.eligible !== undefined) params.set('eligible', String(filters.eligible));
  if (filters?.budget_area_id) params.set('budget_area_id', String(filters.budget_area_id));
  if (filters?.search) params.set('search', filters.search);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_URL}/annual-increase/cycles/${cycleId}/employees${qs}`, {
    credentials: 'include',
  });
  return handleResponse(res);
}

export async function updateEmployeeIncrease(
  cycleId: number,
  entryId: number,
  increasePercentage: number
): Promise<EmployeeEntry> {
  const res = await fetch(
    `${API_URL}/annual-increase/cycles/${cycleId}/employees/${entryId}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ increase_percentage: increasePercentage }),
    }
  );
  return handleResponse(res);
}

// =============================================================================
// LEADERSHIP
// =============================================================================

export interface LeadershipEntry {
  employee_id: string;
  name: string;
  position: string;
  title_level: string;
  area_label: string;
  budget_area_id: number | null;
  is_dashboard_enabled: boolean;
  parent_employee_id: string | null;
}

export async function getLeadership(cycleId: number): Promise<LeadershipEntry[]> {
  const res = await fetch(`${API_URL}/annual-increase/cycles/${cycleId}/leadership`, {
    credentials: 'include',
  });
  return handleResponse(res);
}

// =============================================================================
// SUBMISSIONS
// =============================================================================

export async function getSubmissions(status?: string): Promise<BudgetArea[]> {
  const params = status ? `?status=${status}` : '';
  const res = await fetch(`${API_URL}/annual-increase/submissions${params}`, {
    credentials: 'include',
  });
  return handleResponse(res);
}

export async function approveSubmission(
  areaId: number,
  reviewedBy: string,
  notes?: string
): Promise<BudgetArea> {
  const res = await fetch(`${API_URL}/annual-increase/submissions/${areaId}/approve`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewed_by: reviewedBy, notes }),
  });
  return handleResponse(res);
}

export async function returnSubmission(
  areaId: number,
  reviewedBy: string,
  notes: string
): Promise<BudgetArea> {
  const res = await fetch(`${API_URL}/annual-increase/submissions/${areaId}/return`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewed_by: reviewedBy, notes }),
  });
  return handleResponse(res);
}
