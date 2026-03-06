# Codebase Architecture Reference

## Repository Structure

```
hr-dashboard/
├── src/                              # HR Admin Dashboard (DO NOT MODIFY for Bifröst)
│   ├── App.tsx                       # Admin routing
│   ├── layouts/MainLayout.tsx        # Admin layout with sidebar
│   └── pages/                        # 30+ admin pages
│
├── employee-portal/                  # ★ TARGET: Employee Portal
│   ├── index.html                    # MODIFY: Add font imports
│   ├── package.json                  # React 19, Vite 7, Tailwind v4
│   ├── tsconfig.json                 # TypeScript config
│   ├── vite.config.ts                # Vite config (port 5174)
│   └── src/
│       ├── App.tsx                   # Routing (NO changes needed)
│       ├── index.css                 # MODIFY: Add Bifröst tokens
│       ├── main.tsx                  # Entry point (NO changes)
│       │
│       ├── components/
│       │   ├── LayoutSwitcher.tsx     # ★ MODIFY: Add bifrost case
│       │   ├── OGLayout.tsx           # KEEP: Classic layout (unchanged)
│       │   ├── ModernLayout.tsx       # KEEP: Modern layout (unchanged)
│       │   ├── BifrostLayout.tsx      # ★ CREATE: New Bifröst layout
│       │   ├── ViewToggle.tsx         # ★ MODIFY: 3-way toggle
│       │   ├── MainLayout.tsx         # Wrapper (delegates to LayoutSwitcher)
│       │   ├── DarkModeToggle.tsx     # KEEP (used by OG/Modern only)
│       │   │
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx        # KEEP: OG sidebar (unchanged)
│       │   │   ├── TopBar.tsx         # KEEP: OG mobile header (unchanged)
│       │   │   ├── ModernTopNav.tsx   # KEEP: Modern top nav (unchanged) — USE AS BASE for BifrostTopNav
│       │   │   ├── MobileNav.tsx      # KEEP: Mobile drawer (shared by all views)
│       │   │   └── BifrostTopNav.tsx  # ★ CREATE: Adapted copy of ModernTopNav with Bifröst branding
│       │   │
│       │   ├── bifrost/              # ★ CREATE: Entire directory
│       │   │   ├── ShimmerBar.tsx
│       │   │   ├── BifrostLogo.tsx
│       │   │   ├── MimirLogo.tsx
│       │   │   ├── BifrostCard.tsx
│       │   │   └── AuroraHero.tsx     # Aurora gradient hero section (replaces Modern's blue hero)
│       │   │
│       │   ├── mimir/                # ★ CREATE: Entire directory
│       │   │   ├── MimirContext.tsx
│       │   │   ├── MimirWidget.tsx
│       │   │   └── MimirChatPanel.tsx
│       │   │
│       │   ├── common/
│       │   │   ├── FileUpload.tsx     # Reusable (NO changes)
│       │   │   └── SearchModal.tsx    # Reusable (NO changes)
│       │   │
│       │   ├── goals/                # Goal components (NO changes)
│       │   ├── hr/                   # HR components (NO changes)
│       │   ├── payroll/              # Payroll components (NO changes)
│       │   └── performance/          # Performance components (NO changes)
│       │
│       ├── config/
│       │   ├── api.ts                # API base URL config (NO changes)
│       │   └── navigation.ts         # Nav items + filtering (NO changes)
│       │
│       ├── contexts/
│       │   ├── AuthContext.tsx        # Auth (NO changes)
│       │   └── EmployeeFeaturesContext.tsx # ★ MODIFY: Add 'bifrost' to viewMode type
│       │
│       ├── pages/
│       │   ├── Dashboard.tsx          # ★ MODIFY: Add bifrost case
│       │   ├── BifrostDashboard.tsx   # ★ CREATE: Bifröst dashboard
│       │   ├── OGDashboard.tsx        # KEEP: Classic dashboard (unchanged)
│       │   ├── ModernDashboard.tsx    # KEEP: Modern dashboard (unchanged)
│       │   ├── LoginPage.tsx          # ★ MODIFY: Rebrand + view toggle
│       │   ├── Announcements.tsx      # Style via CSS cascade
│       │   ├── EmployeeDirectory.tsx  # Style via CSS cascade
│       │   ├── MySchedule.tsx         # Style via CSS cascade
│       │   ├── Notifications.tsx      # Style via CSS cascade
│       │   │
│       │   ├── my-hr/                # All styled via CSS cascade
│       │   │   ├── Profile.tsx
│       │   │   ├── Compensation.tsx
│       │   │   ├── Benefits.tsx
│       │   │   ├── TimeOff.tsx
│       │   │   ├── Documents.tsx
│       │   │   └── MyPerformance.tsx
│       │   │
│       │   ├── requests/             # All styled via CSS cascade
│       │   │   ├── PTORequests.tsx
│       │   │   ├── NewRequest.tsx
│       │   │   ├── AccommodationRequest.tsx
│       │   │   └── OtherRequest.tsx
│       │   │
│       │   ├── resources/            # Style via CSS cascade + Mímir CTAs
│       │   │   ├── Handbook.tsx
│       │   │   ├── BenefitsGuide.tsx
│       │   │   ├── FAQs.tsx
│       │   │   └── Forms.tsx
│       │   │
│       │   ├── employee/             # All styled via CSS cascade
│       │   ├── supervisor/           # All styled via CSS cascade
│       │   ├── team/                 # All styled via CSS cascade
│       │   └── admin/                # Style via CSS cascade
│       │
│       └── utils/
│           └── api.ts                # apiGet, apiPost, apiPut (NO changes)
│
├── backend/                          # Python FastAPI Backend
│   ├── requirements.txt              # ★ MODIFY: Add langchain, chromadb, anthropic
│   ├── app/
│   │   ├── main.py                   # ★ MODIFY: Register mimir router
│   │   ├── api/
│   │   │   ├── employee_portal.py    # ★ MODIFY: Add /portal/payroll/next-date endpoint
│   │   │   ├── mimir.py              # ★ CREATE: Mímir API router
│   │   │   └── [30+ other routers]   # NO changes
│   │   ├── services/
│   │   │   ├── mimir_service.py      # ★ CREATE: RAG orchestration
│   │   │   ├── document_ingestion_service.py # ★ CREATE: Doc processing
│   │   │   └── [existing services]   # NO changes
│   │   ├── db/
│   │   │   ├── mimir_models.py       # ★ CREATE: Conversation + doc metadata models
│   │   │   └── [existing models]     # NO changes
│   │   └── schemas/
│   │       └── mimir.py              # ★ CREATE: Pydantic schemas
│   └── chroma_data/                  # ★ CREATE: ChromaDB persistent storage dir
│
├── deployment/                       # Deploy scripts (NO changes)
├── docs/                             # Documentation (NO changes)
└── data/                             # Sample data (NO changes)
```

## Key Existing Patterns to Follow

### API Calls (Frontend)
```typescript
// From employee-portal/src/utils/api.ts
import { apiGet, apiPost, apiPut } from '@/utils/api';

// Usage in components:
const data = await apiGet<SomeType>('/portal/dashboard');
const result = await apiPost('/portal/pto/request', { ... });
```

### Auth Context
```typescript
// From employee-portal/src/contexts/AuthContext.tsx
const { user, isAuthenticated, isSupervisor, isEmployee, logout } = useAuth();
// user has: { full_name, email, role, employee_id }
```

### Feature Flags
```typescript
// From employee-portal/src/contexts/EmployeeFeaturesContext.tsx
const { viewMode, setViewMode, features, loading } = useEmployeeFeatures();
// features has: has_active_fmla_cases, benefits_enrolled, is_supervisor, etc.
```

### Navigation Filtering
```typescript
// From employee-portal/src/config/navigation.ts
import { getFilteredNavigation } from '@/config/navigation';
const filteredNav = getFilteredNavigation(isEmployee, isSupervisor, features);
// Returns: { main: NavItem[], sections: NavSection[] }
```

### ModernDashboard Data Model (Canonical for BifrostDashboard)

The ModernDashboard (`employee-portal/src/pages/ModernDashboard.tsx`) is the canonical reference for what the BifrostDashboard should display. Its data model:

```typescript
// Interfaces (copy these into BifrostDashboard)
interface PTOBalance {
  vacation_available: number;
  sick_available: number;
  personal_available: number;
}

interface Case {
  id: number;
  case_number: string;
  status: string;
  leave_type: string;
  hours_used: number;
  hours_remaining: number;
}

interface EmployeeDashboardData {
  employee_id: string;
  employee_name: string;
  active_cases: Case[];
  pending_submissions: Array<{ id: number; status: string }>;
  recent_submissions: Array<{ id: number; leave_date: string; hours_requested: number; status: string }>;
  rolling_12mo_hours_used: number;
  rolling_12mo_hours_available: number;
}

interface SupervisorDashboardData {
  team_size: number;
  team_members_on_fmla: number;
  pending_submissions: number;
  submissions_to_review: Array<{
    id: number;
    employee_name: string;
    leave_date: string;
    hours_requested: number;
  }>;
}

interface ActionItem {
  id: string;
  type: 'pto' | 'fmla' | 'performance' | 'approval' | 'document';
  title: string;
  description: string;
  link: string;
  icon: React.ElementType;
}
```

**API endpoints used by ModernDashboard:**
- `GET /portal/dashboard` → EmployeeDashboardData
- `GET /portal/pto/balance` → PTOBalance
- `GET /portal/supervisor-dashboard` → SupervisorDashboardData (supervisor only)
- `GET /portal/payroll/next-date` → NEW for Bifröst (see implementation guide)

**Stat card priority logic (from ModernDashboard `getStatCards()`):**
1. Always show PTO if available
2. Show FMLA hours if has active cases
3. Show pending approvals if supervisor
4. Show benefits status if enrolled and room
5. Fill remaining with documents link
6. Max 3 cards total

**Quick links (from ModernDashboard):**
- Profile → /my-hr/profile
- Documents → /my-hr/documents
- Handbook → /resources/handbook
- FAQs → /resources/faqs
- Benefits → /my-hr/benefits
- Time Off → /my-hr/time-off
- (BifrostDashboard adds: Ask Mímir → opens MimirContext panel)

**Conditional sections:**
- Action Items: shown if pending FMLA submissions or pending supervisor approvals
- Active FMLA Cases: shown if `employeeData.active_cases.length > 0`
- Supervisor Team Overview: shown if `isSupervisor && supervisorData`

### Backend Router Registration
```python
# From backend/app/main.py - pattern for registering new routers:
app.include_router(employee_portal.router, prefix="/portal", tags=["employee-portal"])
app.include_router(portal_features.router, prefix="/portal/features", tags=["portal-features"])
# Add: app.include_router(mimir.router, prefix="/mimir", tags=["mimir"])
```

### Backend Auth Dependencies
```python
# From backend/app/api/auth.py - use these for endpoint protection:
from app.api.auth import get_current_user, require_admin

# For employee endpoints:
@router.post("/chat")
async def chat(request: ChatRequest, current_user = Depends(get_current_user)):
    ...

# For admin-only endpoints:
@router.post("/admin/ingest")
async def ingest(file: UploadFile, current_user = Depends(require_admin)):
    ...
```

## Important Constraints

1. **Tailwind CSS v4**: Uses `@import "tailwindcss"` and `@tailwindcss/vite` plugin. NO `tailwind.config.js` file. Theme extension is done via `@theme {}` in CSS.

2. **React Router v7**: Uses `react-router-dom@7.9.4`. Routes defined in App.tsx with `<Route>` elements.

3. **No external state management**: Uses React Context for state (AuthContext, EmployeeFeaturesContext). No Redux, Zustand, etc.

4. **Framer Motion**: Already installed and used extensively for animations. Use `motion` and `AnimatePresence` for Bifröst transitions.

5. **Lucide React**: Icon library (`lucide-react@0.548.0`). All icons should come from here.

6. **Dark mode**: Existing OG/Modern views use `class` strategy (`darkMode: 'class'`). Bifröst layout ignores this — sidebar is always dark, content is always light.

7. **API base URL**: Configured in `employee-portal/src/config/api.ts`. Backend runs on a different port (8000 by default).

8. **CORS**: Already configured in backend `main.py` to allow the portal origin.

9. **Auth cookies**: httpOnly JWT cookies. The portal uses `credentials: 'include'` for API calls.

10. **SQLite**: The backend uses SQLite (file-based). ChromaDB should also use file-based persistent storage, not a separate server.
