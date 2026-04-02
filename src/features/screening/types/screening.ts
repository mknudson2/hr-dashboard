/**
 * TypeScript types for the Bifrost screening module.
 */

export type OrderStatus =
  | "initiated"
  | "applicant-pending"
  | "pending"
  | "partial"
  | "ready"
  | "canceled"
  | "error";

export type OrderDecision = "Approved" | "Decline" | "Review" | null;

export interface ScreeningProduct {
  clientProductGuid: string;
  productName: string;
  productGuid?: string;
}

export interface ScreeningOrder {
  id: number;
  candidate_id: number;
  candidate_name: string;
  order_guid: string | null;
  applicant_guid: string;
  product_guid: string;
  product_name?: string;
  status: OrderStatus;
  decision: OrderDecision;
  quickapp_link?: string | null;
  report_url?: string | null;
  ordered_by_user_id: number;
  created_at: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
}

export interface ScreeningSearch {
  id: number;
  order_search_guid: string;
  search_type: string;
  status: string;
  display_name: string;
  display_value?: string;
}

export interface OrderSubmitRequest {
  candidate_id: number;
  first_name: string;
  last_name: string;
  email: string;
  product_guid: string;
  product_name?: string;
  use_quick_app: boolean;
  certification_acknowledged: boolean;
}

export interface OrderSubmitResponse {
  id: number;
  order_guid: string;
  applicant_guid: string;
  status: string;
  quickapp_link: string | null;
  message: string;
}

export interface ComplianceDocument {
  signedDate: number;
  content: string;
}

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; darkColor: string; darkBgColor: string }
> = {
  initiated: { label: "Initiated", color: "text-gray-600", bgColor: "bg-gray-100", darkColor: "dark:text-gray-300", darkBgColor: "dark:bg-gray-800" },
  "applicant-pending": { label: "Awaiting Applicant", color: "text-amber-700", bgColor: "bg-amber-50", darkColor: "dark:text-amber-300", darkBgColor: "dark:bg-amber-900/30" },
  pending: { label: "In Progress", color: "text-blue-700", bgColor: "bg-blue-50", darkColor: "dark:text-blue-300", darkBgColor: "dark:bg-blue-900/30" },
  partial: { label: "Partially Complete", color: "text-blue-700", bgColor: "bg-blue-50", darkColor: "dark:text-blue-300", darkBgColor: "dark:bg-blue-900/30" },
  ready: { label: "Complete", color: "text-emerald-700", bgColor: "bg-emerald-50", darkColor: "dark:text-emerald-300", darkBgColor: "dark:bg-emerald-900/30" },
  canceled: { label: "Canceled", color: "text-gray-500", bgColor: "bg-gray-50", darkColor: "dark:text-gray-400", darkBgColor: "dark:bg-gray-800" },
  error: { label: "Error", color: "text-red-700", bgColor: "bg-red-50", darkColor: "dark:text-red-300", darkBgColor: "dark:bg-red-900/30" },
};

export const DECISION_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; darkColor: string; darkBgColor: string }
> = {
  Approved: { label: "Approved", color: "text-emerald-700", bgColor: "bg-emerald-50", darkColor: "dark:text-emerald-300", darkBgColor: "dark:bg-emerald-900/30" },
  Decline: { label: "Decline", color: "text-red-700", bgColor: "bg-red-50", darkColor: "dark:text-red-300", darkBgColor: "dark:bg-red-900/30" },
  Review: { label: "Review", color: "text-amber-700", bgColor: "bg-amber-50", darkColor: "dark:text-amber-300", darkBgColor: "dark:bg-amber-900/30" },
};
