/**
 * ATS (Applicant Tracking System) shared type definitions.
 * Phase 0 — foundational types used across HR Hub, Employee Portal, and Applicant Portal.
 */

// ============================================================================
// Pipeline & Lifecycle
// ============================================================================

export type LifecycleStageKey =
  | "request_submitted"
  | "position_posted"
  | "hr_interview"
  | "hiring_manager_interview"
  | "tech_screen"
  | "candidate_selection"
  | "offer_extended"
  | "offer_response"
  | "onboarding_date_set"
  | "final_approval";

export type LifecycleStageStatus = "pending" | "active" | "completed" | "skipped" | "blocked";

export type ApplicationStatus =
  | "New" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected" | "Withdrawn";

/** Applicant-facing simplified pipeline stage. */
export interface ApplicantFacingStage {
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  completedAt?: string;
}

// ============================================================================
// Scorecard Templates
// ============================================================================

export interface ScorecardCriterion {
  name: string;
  description?: string;
  weight: number;
  rubric: Record<string, string>; // {"1": "Poor", "2": "Below Average", ..., "5": "Excellent"}
}

export interface ScorecardSection {
  name: string;
  weight: number;
  criteria: ScorecardCriterion[];
}

export interface ScorecardTemplate {
  id: number;
  templateId: string;
  name: string;
  description?: string;
  templateType: "hr" | "hm" | "tech_screen";
  sections: ScorecardSection[];
  recommendationOptions: string[];
  redFlags?: string[];
  suggestedQuestions?: string[];
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// Stakeholder Roles
// ============================================================================

export type StakeholderRole = "vp_svp" | "hiring_manager" | "interviewer" | "observer";

export interface RequisitionStakeholder {
  id: number;
  requisitionId: number;
  userId: number;
  userName: string;
  role: StakeholderRole;
  assignedBy?: number;
  assignedByName?: string;
  assignedAt: string;
  isActive: boolean;
}

export interface StakeholderAccessLevel {
  role: StakeholderRole;
  pipeline: "full" | "view";
  scorecards: "full" | "own_stage" | "none";
  offerComp: "full" | "none";
  messages: "full" | "none";
}

// ============================================================================
// Messaging
// ============================================================================

export type MessageSenderType = "applicant" | "hr" | "hiring_manager";

export interface MessageThread {
  threadId: string;
  applicationId: number;
  applicantName?: string;
  jobTitle?: string;
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
  messageCount: number;
}

export interface ApplicantMessage {
  id: number;
  messageId: string;
  threadId: string;
  senderType: MessageSenderType;
  senderName: string;
  subject?: string;
  body: string;
  bodyHtml?: string;
  isInternal: boolean;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ============================================================================
// Approval Workflows
// ============================================================================

export type ApprovalChainType = "offer" | "negotiation" | "requisition";
export type ApprovalRequestStatus = "Pending" | "Approved" | "Rejected" | "Escalated";
export type ApproverType = "user" | "role" | "hiring_manager" | "department_head";

export interface ApprovalChain {
  id: number;
  name: string;
  chainType: ApprovalChainType;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  steps: ApprovalStepConfig[];
}

export interface ApprovalStepConfig {
  id: number;
  orderIndex: number;
  approverType: ApproverType;
  approverUserId?: number;
  approverUserName?: string;
  approverRole?: string;
  isRequired: boolean;
  timeoutHours?: number;
}

export interface ApprovalRequest {
  id: number;
  resourceType: "offer" | "requisition" | "counter_offer";
  resourceId: number;
  chainId: number;
  currentStepId: number;
  status: ApprovalRequestStatus;
  requestedByName?: string;
  actedByName?: string;
  actedAt?: string;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// Interviewer Availability
// ============================================================================

export interface AvailabilitySlot {
  id: number;
  userId: number;
  userName?: string;
  startTime: string;
  endTime: string;
  timeZone?: string;
  slotDurationMinutes: number;
  isBooked: boolean;
  requisitionId?: number;
}

export interface InterviewDetail {
  id: number;
  interviewId: string;
  scheduledAt: string;
  durationMinutes: number;
  format: string;
  timeZone?: string;
  status: string;
  interviewers: { user_id: number; name: string; role: string }[];
}

export interface ScheduledInterviewDetail extends InterviewDetail {
  stageName: string | null;
  stageLifecycleKey: string | null;
}

// ============================================================================
// Offer Letter (enhanced with versioning)
// ============================================================================

export type OfferStatus =
  | "Draft" | "Pending Approval" | "Approved" | "Sent"
  | "Accepted" | "Declined" | "Expired" | "Rescinded"
  | "Negotiating";

export interface OfferLetterVersion {
  id: number;
  offerId: string;
  applicationId: number;
  positionTitle: string;
  department?: string;
  salary?: number;
  wageType?: string;
  benefitsSummary?: string;
  status: OfferStatus;
  version: number;
  versionNotes?: string;
  previousOfferId?: number;
  isCounterOffer: boolean;
  originalOfferId?: number;
  negotiationNotes?: string;
  createdAt: string;
  sentAt?: string;
}

// ============================================================================
// Candidate Selection
// ============================================================================

export interface CandidateSelectionSummary {
  applicationId: number;
  applicantName: string;
  applicantEmail: string;
  overallRating?: number;
  scorecardCount: number;
  recommendations: Record<string, number>; // {"Strong Hire": 2, "Hire": 1, ...}
  interviewCount: number;
  interviewsCompleted: number;
  resumeScore?: number;
  resumeThresholdLabel?: string;
  isFavorite: boolean;
}

// ============================================================================
// Applicant Pool
// ============================================================================

export interface PoolCandidate {
  id: number;
  applicantId: string;
  firstName: string;
  lastName: string;
  email: string;
  currentTitle?: string;
  currentEmployer?: string;
  yearsOfExperience?: number;
  poolOptedInAt: string;
  sourceApplicationId?: number;
  sourceJobTitle?: string;
}
