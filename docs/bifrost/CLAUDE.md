# CLAUDE.md — Bifröst + Mímir Project Instructions

## What This Is

This directory (`/docs/bifrost/`) contains the complete implementation specification for two features being added to the `hr-dashboard` repository:

1. **Bifröst** — A brand redesign of the employee portal (new layout, new components, new visual identity)
2. **Mímir** — An AI-powered HR knowledge assistant (RAG chatbot embedded in the portal)

**Work on the `main` branch.** No feature branches.

## Files in This Directory

| File | Purpose | Read When |
|---|---|---|
| `BIFROST-IMPLEMENTATION-GUIDE.md` | **Primary implementation guide** — Phase-by-phase instructions with exact code | Start here. Read fully before writing any code. |
| `ARCHITECTURE-REFERENCE.md` | Codebase structure, file inventory, existing patterns, ModernDashboard data model | Reference when you need to understand how the codebase works |
| `DESIGN-TOKENS.md` | Colors, typography, spacing, component specs | Reference when implementing visual components |
| `MIMIR-SYSTEM-PROMPT.md` | Mímir's system prompt and RAG pipeline configuration | Reference when implementing the backend AI service |
| `MOCKUP-REFERENCE.html` | Interactive HTML mockup showing the ORIGINAL sidebar concept (Login, Dashboard, Benefits, Mímir Chat, Mobile) | Older reference — see fusion mockup for current direction |
| `MOCKUP-FUSION.html` | **PRIMARY VISUAL REFERENCE** — Nordic Modern Fusion showing Dashboard, Profile, Compensation, Handbook with top-nav layout | Open in browser. This is the target design. |
| `MOCKUP-ADMIN.html` | **Admin dashboard reference** — Dark and Light mode versions of the HR Hub admin reskin | Open in browser. Toggle between Dark/Light tabs. |
| `PHASE-7-ADMIN-RESKIN.md` | Phase 7 implementation guide for the HR Admin Dashboard Bifröst reskin | Reference when implementing Phase 7 |

## Workflow — PHASED APPROACH

**Implement ONE phase at a time.** Wait for the user to review and approve before moving to the next phase. The phases are:

1. **Phase 1: Design System** — CSS tokens, fonts, ShimmerBar, BifrostLogo, MimirLogo, StatCard, QuickLinkCard, BifrostCard
2. **Phase 2: Layout Shell** — EmployeeFeaturesContext type change, LayoutSwitcher, BifrostLayout, BifrostSidebar, BifrostTopBar, ViewToggle
3. **Phase 3: Login + Dashboard** — LoginPage rebrand with view preview toggle, BifrostDashboard, payroll next-date endpoint
4. **Phase 4: CSS Override Layer** — .bifrost-theme cascade overrides for all existing pages
5. **Phase 5: Mímir Frontend** — MimirContext, MimirWidget, MimirChatPanel (placeholder backend)
6. **Phase 6: Mímir Backend** — FastAPI router, RAG service, document ingestion, ChromaDB (with placeholder API keys)
7. **Phase 7: Admin Reskin** — Apply Bifröst branding to the HR Admin Dashboard (`/src/`): logo, shimmer bar, violet nav states, stat card accents, chart colors, typography, shimmer toggle in Settings

After completing each phase, run the appropriate build command and report what was done.

## Critical Rules

1. **Read `BIFROST-IMPLEMENTATION-GUIDE.md` completely before writing any code.** It contains the exact execution order, file paths, and code snippets.

2. **The employee portal is at `/employee-portal/src/`, NOT `/src/`.** The root `/src/` is the HR admin dashboard — do not modify it.

3. **Bifröst uses a TOP NAVIGATION layout like the Modern view — NOT a sidebar.** BifrostLayout.tsx mirrors ModernLayout.tsx structure. BifrostTopNav.tsx is adapted from ModernTopNav.tsx. Open `MOCKUP-FUSION.html` in a browser to see the visual target.

4. **Do NOT modify existing OG or Modern view files** (except adding 'bifrost' to view toggle options). OGLayout, ModernLayout, OGDashboard, ModernDashboard, ModernTopNav must remain unchanged.

5. **BifrostTopNav.tsx must be a COPY of ModernTopNav.tsx with targeted changes.** Copy the entire file first, then change logo, colors, avatar gradient, active states, and view toggle. Do NOT rewrite from scratch — all dropdown logic, click-outside handling, keyboard shortcuts, and accessibility must be preserved.

4. **Follow the execution order.** Phase 1 → Phase 2 → Phase 3 → etc. Each phase builds on the previous one.

5. **Test after each phase.** Run `npm run build` in the `employee-portal/` directory after each phase to verify no TypeScript or CSS errors.

6. **Tailwind CSS v4 — NOT v3.** This project uses `@import "tailwindcss"` and `@theme {}` directives. There is no `tailwind.config.js` for the employee portal. Do not create one.

## Quick Start

```bash
# These docs live at /docs/bifrost/ inside the repo
cd hr-dashboard

# Install frontend dependencies
cd employee-portal && npm install && cd ..

# Read the implementation guide
cat docs/bifrost/BIFROST-IMPLEMENTATION-GUIDE.md

# Start with Phase 1: Design System
# Implement Phase 1 only, then report back for review
```

## How to Use with Claude Code

When the user says "implement Phase N", do the following:
1. Read (or re-read) `docs/bifrost/BIFROST-IMPLEMENTATION-GUIDE.md` for the Phase N section
2. Reference `docs/bifrost/ARCHITECTURE-REFERENCE.md` for file paths and patterns
3. Reference `docs/bifrost/DESIGN-TOKENS.md` for visual specifications
4. Implement all items in that phase
5. Run `cd employee-portal && npm run build` to verify
6. Report what was created/modified with a summary
7. **STOP and wait** for user review before starting the next phase

## Brand Quick Reference

- **Primary**: Bifröst Violet `#6C3FA0`
- **Secondary**: Aurora Teal `#2ABFBF`
- **Tertiary**: Bridge Gold `#E8B84B`
- **Background**: Realm White `#F8F7F4`
- **Sidebar**: Deep Night `#1A1A2E`
- **Mímir**: Mímir Blue `#1B3A5C`
- **Display Font**: Jost
- **Body Font**: DM Sans
