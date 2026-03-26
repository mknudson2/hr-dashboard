# Bifröst ATS Feature Specification

> **Project context:** Bifröst is a React 19 + TypeScript + Vite + Tailwind CSS v4 + FastAPI HR portal with an aurora/Northern Lights aesthetic (violet/teal/gold palette). This spec covers the Applicant Tracking System (ATS) module across three interface surfaces: Applicant Portal, HR Hub, and Employee Portal (HM View). All Microsoft Teams integrations use the **Microsoft Graph API**.

### Hiring Pipeline Stages (Current → Proposed)

**Current pipeline:**
1. Request Submitted
2. Position Posted
3. HR Interview
4. Hiring Manager Interview
5. Tech Screen
6. Offer Extended
7. Offer Result
8. Onboarding Date Set
9. Final Approval / Next Steps

**Proposed addition:** Insert a **Candidate Selection** step between Tech Screen (5) and Offer Extended (6). This is where the HM reviews all candidates, compares scorecards/AI analyses, and selects a candidate to advance to the offer stage.

**Proposed pipeline:**
1. Request Submitted
2. Position Posted
3. HR Interview
4. Hiring Manager Interview
5. Tech Screen
6. **Candidate Selection** ← NEW
7. Offer Extended
8. Offer Result
9. Onboarding Date Set
10. Final Approval / Next Steps

---

## 1. Applicant Portal

### 1.1 Theming

- Apply the existing Bifröst Light theme (matching the Employee Portal) to the entire Applicant Portal.

### 1.2 Hiring Pipeline Visibility

- When an applicant applies for a position, display a **Hiring Timeline/Pipeline tracker** that provides transparency and clarity about where they are in the process.
- The applicant-facing pipeline is a **simplified version** of the internal pipeline. Internal-only steps are consolidated into applicant-friendly labels:

| Internal Steps | Applicant Sees | Description Shown to Applicant |
|---|---|---|
| Request Submitted, Position Posted | Application Received | Your application has been received and is being reviewed |
| HR Interview | HR Interview | Your HR interview is being scheduled / in progress / complete |
| Hiring Manager Interview | Hiring Manager Interview | Your interview with the hiring team is being scheduled / in progress / complete |
| Tech Screen | Technical Assessment | Your technical assessment is being scheduled / in progress / complete |
| Candidate Selection | Under Review | The hiring team is reviewing all candidates |
| Offer Extended | Offer | An offer has been prepared for you |
| Offer Result | Offer | Offer acceptance, negotiation, or next steps |
| Onboarding Date Set | Onboarding | Your start date and onboarding details are being finalized |
| Final Approval / Next Steps | Welcome | Final steps before your first day |

- Pipeline tracker displays:
  - Status indicators for completed, active, and upcoming steps
  - The applicant's current position in the pipeline
  - Contextual messaging appropriate to each stage (e.g., "We're reviewing all candidates — we'll be in touch soon" during the Under Review phase)

### 1.3 Interview Scheduling

- Applicants can self-schedule their initial HR interview by selecting from a list of available time slots.
- Users with the **"Initial HR Interviewer"** role tag can set and manage their available time slots for HR interviews.

### 1.4 Resume/Application — Cross-Role Consideration

- Applicants can indicate whether they would like to be considered for other open roles if they are not selected for the position they applied to.
- **Two opt-in touchpoints:**
  1. **At initial application:** A checkbox/toggle on the application form (e.g., "I'm open to being considered for other roles at NBS"). This signals to HR early in the process that the candidate has broader interest, which can inform how they're evaluated and tracked.
  2. **After non-selection:** When a candidate is notified they were not selected, the notification includes a prompt to opt in (or confirm their earlier opt-in) to remain in the applicant pool for future opportunities.
- If opted in, their profile (resume, application data, contact info) remains in the **applicant pool** for HR to surface in future requisitions.
- **When HR pulls a cross-role candidate into a new requisition:**
  - The candidate enters the new position's pipeline as a fresh applicant at step 1 (all steps apply — different roles have different requirements, HMs, and interview criteria).
  - Their existing profile data (resume, contact info, etc.) is pre-populated so they do not need to re-enter information.
  - The candidate sees a **new, separate pipeline** in their Applicant Portal for the new position, distinct from any previous applications.
  - Previous application history (prior pipelines, scorecards, notes) is accessible to HR but does not carry over into the new pipeline's evaluation.

### 1.5 Communication Features

- **Per-step communication:** At each stage of the hiring pipeline, applicants have access to a messaging/comment feature (mirroring the note/comment system available to HR and HM in the pipeline view). Applicant messages surface directly in the pipeline and are visible to HR and HM.
- **Offer negotiation communication:** If an applicant receives an offer, provide a dedicated communication channel for negotiation and correspondence with HR/HM.

### 1.6 Notifications

- Send **email notifications** to the applicant for pipeline events including:
  - Advancement to the next step
  - Interview results
  - Offer extended
  - Other status changes
- **Offer letters** are accessible and downloadable from the Applicant Portal, but the portal is the primary interface for acceptance, negotiation, and related actions (not email attachments).

### 1.7 Offer Letter Experience

- When an offer letter is assigned to a candidate, also include:
  - Next steps with clear instructions
  - Relevant links and resources
  - Contextual information to build candidate confidence

---

## 2. HR Hub

### 2.1 Scorecards

- Build a **Hiring Manager Scorecard** component with:
  - A scorecard template maker (HR can create and manage reusable templates)
  - A **Tech Screen Scorecard** variant with configurable access controls for technical screeners
  - **OPEN QUESTION:** Should technical screeners get their own dedicated portal view (a lightweight interface scoped to just their tech screen tasks and scorecard), or should they access the scorecard through the existing HR Hub / HM View? Decide before implementation.
- **AI Scorecard Analysis:** On the scorecard section, provide an AI-generated summary and analysis of all scorecards (HR and HM) to give a comprehensive overview of candidate evaluations.

### 2.2 Integrations

- **Microsoft Teams Calendar** integration for interview scheduling visibility.
- **Microsoft Teams Notifications** integration to push portal/recruiting notifications to Teams.
- **Applicant Pool** integration (connect the ATS pipeline to the broader applicant pool/database).
- **I-9 Portal** integration for employment verification workflow.

### 2.3 Offer Extended — Negotiations Section

- Add an optional **Negotiations** section to the Offer Extended stage that includes:
  - Fields to record applicant negotiation details (counter-offers, requests)
  - HM reactions and proposed adjustments
  - Approval workflow requiring sign-off from SVP of HR and SVP of HM's department

### 2.4 Candidate Selection Step — Candidate Comparison View

- The Candidate Selection step (step 6) displays **all applicants** for the position with access to:
  - Individual scorecards (HR and HM)
  - Uploaded resumes
  - AI analysis of each candidate
  - Side-by-side comparison view with AI-assisted candidate comparison
- HR users see this same view.

---

## 3. Employee Portal — Hiring Manager (HM) View

### 3.1 Scorecard Creator

- HMs can create, adjust, and customize their own interview scorecards to match their preferences and role-specific criteria.

### 3.2 Integrations

- **Microsoft Teams Calendar** integration for interview scheduling visibility.
- **Microsoft Teams Notifications** integration to push portal/recruiting notifications to Teams.

### 3.3 HM Decision & Offer Initiation

- On the HM view, within the new **Candidate Selection** pipeline step (step 6), the HM selects a candidate and initiates an offer by specifying:
  - Offered compensation/rate
  - Benefits package (standard, custom, N/A, etc.)
  - Additional notes or special terms
- **This decision is the action that advances the pipeline** from Candidate Selection (step 6) to Offer Extended (step 7).

### 3.4 Offer Results — Approval Workflow

- The Offer Results step includes an **approval chain** where each required stakeholder must accept/acknowledge the hire:
  - SVP of HR
  - HR Recruiting Manager
  - Hiring Manager
  - HM's SVP
  - Other designated approvers as applicable

### 3.5 Offer Results — Negotiation Loop

- Include a **Negotiation** section in the Offer Results step:
  - Record negotiation details and applicant counter-proposals
  - Allow adjustments to the offer letter
  - **Offer letter versioning:** Each iteration of the offer letter is archived and versioned. All previous versions remain accessible for review (e.g., v1, v2, v3). The system never overwrites or deletes prior versions.
  - Provide a **"Return to Offer Extended"** action that:
    - Sends the pipeline back to the Offer Extended stage
    - Annotates the round number (2nd, 3rd, 4th, etc. offer iteration)
    - Archives the current offer letter version before generating/uploading the revised version
  - If adjustments are requested, require **approval from SVP of HR and SVP of HM's department** before the revised offer is sent.

### 3.6 Stakeholder Visibility & Access Roles

- When a HM adds stakeholders to a hiring request, assign visibility roles as follows:

| Role Level | Default Access | Description |
|---|---|---|
| VP / SVP | Full Access (automatic) | Complete pipeline visibility, all details, all actions |
| Hiring Manager | Full Access | Manages pipeline, makes decisions |
| Below HM level | Interview Participation + Pipeline View (no details) (automatic) | Can participate in interviews, see pipeline progress without candidate details |
| Other stakeholders | HM assigns role manually | HM selects from: Interview Participation Only, Pipeline View Only, Full Access |

- HMs can override default assignments and grant additional access as needed.

### 3.7 Candidate Selection Step — Candidate Comparison View

- (Same as HR Hub §2.4) The Candidate Selection step displays all applicants with access to scorecards, resumes, AI analyses, and AI-assisted candidate comparison.

---

## Cross-Cutting Concerns

### Shared Components

- **Pipeline tracker** component (reused across Applicant Portal, HR Hub, HM View)
- **Scorecard viewer/editor** component (reused across HR Hub and HM View)
- **Communication/messaging** component (reused across Applicant Portal and Pipeline views)
- **Approval workflow** component (reused for offer approvals and negotiation approvals)
- **AI analysis** module (scorecard analysis, candidate comparison)

### Integration Dependencies

- **Microsoft Graph API** (Teams calendar sync + Teams push notifications)
- Email notification service
- I-9 verification portal
- AI/LLM service for scorecard analysis and candidate comparison

### Data Model Notes

- **Offer letters** must support versioning. Each negotiation round produces a new immutable version. The data model should store: version number, created timestamp, created by, associated negotiation round, document file reference, and status (draft, sent, accepted, superseded).
- **Applicant pool** entries should track the cross-role consideration opt-in flag, source requisition, and any future requisitions the candidate was surfaced for.

---

## Implementation Roadmap

> **Instructions for Claude Code:** This spec should be implemented in phases. Read the entire document first to understand the full system architecture, then work through each phase sequentially. Do not begin a new phase until the previous phase is reviewed and approved.

### Phase 0 — Architecture & Scaffolding ✅ COMPLETE

### Phase 1 — Shared Components (CURRENT)

**Goal:** Build the reusable components that appear across multiple portal surfaces.

**Deliverables:**
- **Pipeline tracker component** — two variants: internal (10 steps, used in HR Hub and HM View) and applicant-facing (simplified labels per §1.2 mapping table). Both variants consume the same pipeline state machine config.
- **Communication/messaging component** — per-step comment/note system (§1.5). Must support messages from applicants, HR, and HM with role-based visibility.
- **Approval workflow component** — configurable approval chain with stakeholder sign-off (§3.4). Reused for offer approvals and negotiation round approvals.
- **Scorecard viewer/editor component** — displays and edits scorecards with tag-based attributes (Culture Fit, Technical Expert, etc. as seen in the existing UI). Must support both HR and HM scorecard types.
- **Notification service** — email notification dispatch for pipeline events (§1.6). Scaffold the Microsoft Graph API integration for Teams notifications (full integration in Phase 5).

### Phase 2 — Applicant Portal (§1.1–§1.7)
### Phase 3 — HR Hub Additions (§2.1–§2.4)
### Phase 4 — Employee Portal HM View (§3.1–§3.7)
### Phase 5 — Integrations (Graph API, I-9, AI/LLM)
### Phase 6 — Review, Testing & Refinement
