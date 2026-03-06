# Bifröst + Mímir Implementation Guide for Claude Code

## Project Overview

You are implementing a brand redesign ("Bifröst") and AI assistant ("Mímir") for an existing employee HR portal. The codebase is at `github.com/mknudson2/hr-dashboard`.

**Key Facts:**
- The repo has TWO separate React apps: root admin dashboard (`/src`) and employee portal (`/employee-portal/src`)
- Bifröst targets the **employee portal** ONLY
- The portal has a view-switching system: `'og'` (Classic), `'modern'` (Modern). We are adding `'bifrost'` as a third view
- **CRITICAL: Bifröst uses the SAME top-nav layout as the Modern view — NOT a sidebar.** It adapts ModernLayout.tsx and ModernTopNav.tsx with Bifröst branding, aurora gradients, and Nordic styling
- OG/Classic and Modern stay intact. Bifröst is additive

**Tech Stack:** React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + FastAPI + SQLAlchemy + SQLite

**Design Direction: "Nordic Modern Fusion"**
- Keep Modern's top navigation bar with dropdown menus (no sidebar)
- Keep Modern's spacious centered layout (max-w-6xl)
- Keep Modern's pill-shaped quick links
- Replace blue-indigo with Bifröst aurora palette (violet, teal, gold)
- Replace blue hero gradient with animated Northern Lights aurora
- Add ShimmerBar (3px animated gradient) above nav
- Add Bifröst bridge logo instead of Building2 icon
- Add Mímir FAB on all pages
- See `MOCKUP-REFERENCE.html` for the exact visual target (open in browser)

---

## Phase 1: Design System

### 1A. Update `employee-portal/index.html` — add Google Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
```

### 1B. Update `employee-portal/src/index.css` — add tokens AFTER existing `:root`

Do NOT remove existing styles. Add Bifröst tokens, Tailwind v4 @theme extension, shimmer animation, aurora gradient utility, and `.bifrost-theme` cascade overrides that swap blue → violet. See DESIGN-TOKENS.md for exact values.

Key CSS classes to define:
- `.bifrost-shimmer` — animated gradient bar
- `.bifrost-aurora` — Northern Lights hero background with radial gradients
- `@keyframes shimmerSlide` and `@keyframes auroraShift`
- `.bifrost-theme` overrides: `.bg-blue-600` → violet, `.text-blue-700` → violet, `.from-blue-600` → violet, gradient overrides, focus ring overrides, shadow overrides

### 1C–1G. Create Bifröst components in `employee-portal/src/components/bifrost/`:

**ShimmerBar.tsx** — 3px animated gradient bar (violet → teal → gold → teal → violet)

**BifrostLogo.tsx** — SVG bridge with 3 arcs (violet, teal, gold) + optional "BIFRÖST" wordmark. Props: `size: 'sm' | 'md' | 'lg'`, `showWordmark: boolean`

**MimirLogo.tsx** — SVG concentric circles, innermost fill teal, outer strokes in currentColor with decreasing opacity. Props: `size: number`

**BifrostCard.tsx** — White card with optional colored left border accent. Props: `accent: 'violet' | 'teal' | 'gold' | 'none'`

**AuroraHero.tsx** — The aurora gradient hero section that replaces Modern's blue hero. Contains:
- `.bifrost-aurora` background with animated overlay
- Decorative bridge silhouette (SVG, opacity ~6%)
- Decorative circle (border-2 border-white/4%)
- Time-of-day greeting from `useAuth().user.full_name`
- Action items count message
- Bottom 3px accent gradient strip (violet → teal → gold)
- Uses framer-motion for entrance animation

---

## Phase 2: Layout Shell

### 2A. Modify `employee-portal/src/contexts/EmployeeFeaturesContext.tsx`

Add `'bifrost'` to the viewMode union type everywhere. Update default to `'bifrost'`.

### 2B. Modify `employee-portal/src/components/LayoutSwitcher.tsx`

Add: `if (viewMode === 'bifrost') return <BifrostLayout />;`

### 2C. Modify `employee-portal/src/pages/Dashboard.tsx`

Add: `if (viewMode === 'bifrost') return <BifrostDashboard />;`

### 2D. Create `employee-portal/src/components/BifrostLayout.tsx`

**Modeled after ModernLayout.tsx** — same architecture:
- `min-h-screen bg-realm-white bifrost-theme` wrapper
- Fixed ShimmerBar at `top-0 z-50`
- BifrostTopNav (fixed, offset `top-[3px]` below shimmer)
- Reuses existing MobileNav component
- Centered `max-w-6xl` main content area (same as Modern)
- MimirProvider wrapping + MimirWidget always visible

### 2E. Create `employee-portal/src/components/layout/BifrostTopNav.tsx`

**CRITICAL: Start by copying ModernTopNav.tsx entirely, then make these specific changes:**

1. Logo: `BifrostLogo size="sm"` + "BIFRÖST" in `font-display font-semibold tracking-wider` (replaces Building2 + "HR Hub")
2. Avatar gradient: `from-bifrost-violet to-aurora-teal` (replaces blue-to-indigo)
3. Dropdown active state: `bg-bifrost-violet/8 text-bifrost-violet` (replaces blue-50/blue-700)
4. Active nav link: violet accent instead of blue
5. Position: `fixed top-[3px]` (below ShimmerBar)
6. User menu view toggle: cycle Classic → Bifröst → Modern → Classic
7. Shadow: `shadow-bifrost-violet/25` on avatar
8. **Keep ALL existing functionality**: `getModernNavigation`, SearchModal, keyboard shortcut, dark mode toggle, notifications, logout, dropdown click-outside handling

### 2F. Update view toggle in user menus

In both BifrostTopNav and ModernTopNav user menus, update the view cycle to include all 3 options.

---

## Phase 3: Login + Dashboard

### 3A. Modify `employee-portal/src/pages/LoginPage.tsx`

- Read viewMode from localStorage
- When bifrost: realm-white bg, ShimmerBar, BifrostLogo, violet buttons, 3-way toggle
- When og/modern: keep existing appearances
- Toggle immediately re-renders with selected theme (preview)
- Auth logic stays identical

### 3B. Create `employee-portal/src/pages/BifrostDashboard.tsx`

**ModernDashboard is CANONICAL.** Copy its data model, API calls, interfaces, conditional logic. Change ONLY the visual layer:

**Data fetching (copy from ModernDashboard):**
- `/portal/dashboard` → EmployeeDashboardData
- `/portal/pto/balance` → PTOBalance
- `/portal/supervisor-dashboard` → SupervisorDashboardData
- `/portal/payroll/next-date` → NEW endpoint (see below)

**Visual sections (Bifröst styled):**
1. AuroraHero (replaces blue gradient hero)
2. Action Items (gold accent, same data)
3. Stat Cards with gradient icons + 3px accent strips (same priority logic + next paycheck)
4. Quick link pills with Bifröst gradients + "Ask Mímir ✨" pill with teal glow
5. Active FMLA Cases (teal-to-violet progress bar)
6. Supervisor Team Overview (violet accents)

**Payroll endpoint** — add to `backend/app/api/employee_portal.py`:

Reference date: March 6, 2026. Bi-weekly (14 days). Logic:
```python
PAYROLL_REFERENCE_DATE = date(2026, 3, 6)
days_since = (today - ref).days
days_until = (14 - (days_since % 14)) % 14
next_date = today + timedelta(days=days_until)
```

---

## Phase 4: CSS Override Layer + Mímir CTAs

The `.bifrost-theme` cascade handles blue → violet for all child pages. Test each page and add overrides as needed.

Add contextual Mímir CTA banners on: Benefits, Handbook, FAQs, Time Off pages.

---

## Phase 5: Mímir Frontend (placeholder backend)

Create `MimirContext.tsx`, `MimirWidget.tsx` (FAB + panel), `MimirChatPanel.tsx` with placeholder responses.

---

## Phase 6: Mímir Backend

Create FastAPI router, RAG service, document ingestion. Placeholder API keys with graceful fallback. See MIMIR-SYSTEM-PROMPT.md.

---

## Execution Order

1. Phase 1 → 2. Phase 2A → 3. Phase 2B–2F → 4. Phase 3A → 5. Phase 3B → 6. Phase 4 → 7. Phase 5 → 8. Phase 6

Test `npm run build` after each phase. OG and Modern must still work at every step.
