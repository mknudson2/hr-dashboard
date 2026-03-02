# Phase 7: Bifröst HR Hub Admin Reskin

## Overview

Apply the Bifröst brand system to the HR Admin Dashboard (`/src/`). This is the admin-facing half of the platform. Unlike the employee portal (which uses a top-nav layout), the admin dashboard KEEPS its sidebar architecture — admins navigate 16+ pages frequently and need persistent nav access.

**Key changes:**
- Bridge logo + "BIFRÖST" wordmark + "HR Hub · Admin" subtitle replaces "HR Hub"
- Vertical shimmer bar (3px animated gradient) along sidebar left edge, with toggle in Settings
- Sidebar active state: violet left accent bar + violet tint background (replaces solid blue)
- User avatar: violet → teal gradient (replaces solid blue)
- Stat card accent strips (2px gradient tops) color-coded by category
- Donut chart colors: Bifröst palette (violet, teal, gold)
- Birthday date circles: violet tint; Anniversary circles: teal tint
- Tenure badges: violet styling
- Typography: Jost for headings/numbers, DM Sans for body
- Dark mode default, light mode available via existing toggle
- All existing functionality preserved — this is a CSS/styling pass, not a restructure

**Visual reference:** Open `docs/bifrost/MOCKUP-ADMIN.html` in a browser (both dark and light tabs).

---

## 7A. Update `index.html` (root) — Add Google Fonts

Add to `<head>` (same fonts as employee portal):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
```

## 7B. Update `src/index.css` — Add Bifröst Tokens

Add the same Bifröst design tokens and `@theme` extension used in the employee portal. The admin app also uses Tailwind v4 with `@import "tailwindcss"`.

Add AFTER the existing content:

```css
/* ===== BIFRÖST ADMIN TOKENS ===== */
:root {
  --bifrost-violet: #6C3FA0;
  --bifrost-violet-light: #8B5FC4;
  --bifrost-violet-dark: #5A2E8A;
  --aurora-teal: #2ABFBF;
  --aurora-teal-dark: #1F9E9E;
  --bridge-gold: #E8B84B;
  --bridge-gold-dark: #D4A030;
  --realm-white: #F8F7F4;
  --frost: #EEF2F7;
  --deep-night: #1A1A2E;
  --night-mid: #20203A;
  --night-card: #252545;
  --mimir-blue: #1B3A5C;
  --well-silver: #B8C4D0;
}

@theme {
  --color-bifrost-violet: #6C3FA0;
  --color-bifrost-violet-light: #8B5FC4;
  --color-bifrost-violet-dark: #5A2E8A;
  --color-aurora-teal: #2ABFBF;
  --color-aurora-teal-dark: #1F9E9E;
  --color-bridge-gold: #E8B84B;
  --color-bridge-gold-dark: #D4A030;
  --color-realm-white: #F8F7F4;
  --color-frost: #EEF2F7;
  --color-deep-night: #1A1A2E;
  --color-night-mid: #20203A;
  --color-night-card: #252545;
  --color-mimir-blue: #1B3A5C;
  --color-well-silver: #B8C4D0;
  --font-display: 'Jost', 'Montserrat', sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
}

/* Vertical shimmer bar for sidebar */
.bifrost-shimmer-v {
  background: linear-gradient(180deg, var(--bifrost-violet), var(--aurora-teal), var(--bridge-gold), var(--aurora-teal), var(--bifrost-violet));
  background-size: 100% 300%;
  animation: shimmerV 6s ease infinite;
}
.bifrost-shimmer-v.static {
  animation: none;
  background: linear-gradient(180deg, var(--bifrost-violet), var(--aurora-teal), var(--bridge-gold));
  background-size: 100% 100%;
}

@keyframes shimmerV {
  0% { background-position: 50% 0%; }
  50% { background-position: 50% 100%; }
  100% { background-position: 50% 0%; }
}
```

## 7C. Modify `src/layouts/MainLayout.tsx` — Apply Bifröst Branding

This is the main file to modify. Key changes:

**1. Logo section** — Replace:
```tsx
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">HR Hub</h1>
```
With BifrostLogo (small bridge SVG) + "BIFRÖST" text + "HR Hub · Admin" subtitle.

Create `src/components/BifrostAdminLogo.tsx`:
```tsx
export default function BifrostAdminLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 36 36" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
        <path d="M 4 24 Q 18 2 32 24" fill="none" stroke="#6C3FA0" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M 7 24 Q 18 5 29 24" fill="none" stroke="#2ABFBF" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M 10 24 Q 18 8 26 24" fill="none" stroke="#E8B84B" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="4" y1="24" x2="4" y2="29" stroke="#6C3FA0" strokeWidth="2" strokeLinecap="round"/>
        <line x1="32" y1="24" x2="32" y2="29" stroke="#6C3FA0" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div>
        <div className="font-display text-[13px] font-semibold text-gray-900 dark:text-white tracking-[2px]">
          BIFRÖST
        </div>
        <div className="text-[9.5px] text-gray-400 dark:text-gray-500 tracking-wide">
          HR Hub · Admin
        </div>
      </div>
    </div>
  );
}
```

**2. Sidebar wrapper** — Add vertical shimmer bar as a 3px div on the left edge of the sidebar:
```tsx
<aside className="w-[230px] fixed left-0 top-0 h-full flex">
  {/* Vertical shimmer bar */}
  <div className={`w-[3px] h-full bifrost-shimmer-v ${shimmerAnimated ? '' : 'static'} flex-shrink-0`} />
  {/* Sidebar content */}
  <div className="flex-1 bg-white dark:bg-gray-800 shadow-md flex flex-col">
    {/* ... header, nav, footer ... */}
  </div>
</aside>
```

**3. Nav item active state** — Replace:
```tsx
isActive ? "bg-blue-600 text-white" : "text-gray-700 ..."
```
With:
```tsx
isActive
  ? "bg-bifrost-violet/10 dark:bg-bifrost-violet/15 text-bifrost-violet dark:text-white font-semibold border-l-[3px] border-bifrost-violet -ml-[3px]"
  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
```

**4. User avatar** — Replace `bg-blue-600` with:
```tsx
className="w-8 h-8 rounded-full bg-gradient-to-br from-bifrost-violet to-aurora-teal flex items-center justify-center text-white font-semibold"
```

**5. Shimmer animation setting** — Read from localStorage:
```tsx
const [shimmerAnimated, setShimmerAnimated] = useState(() => {
  const stored = localStorage.getItem('bifrost_shimmer_animated');
  return stored !== 'false'; // Default to animated
});
```

**6. Main content area** — Keep the existing `ml-64` offset but update to `ml-[233px]` (230px sidebar + 3px shimmer).

## 7D. Modify `src/pages/DashboardPage.tsx` — Bifröst Styling

Apply these visual changes to the dashboard stat cards and widgets:

**Stat cards:** Add a 2px gradient accent strip at the top of each card. Map card categories to Bifröst gradients:
- Employee count cards → violet gradient
- Termination/turnover cards → gold gradient or red gradient
- International/headcount cards → teal gradient
- Regrettable turnover → pink gradient

**Donut chart colors:** Replace the current color array with Bifröst palette:
```tsx
const BIFROST_CHART_COLORS = ['#6C3FA0', '#2ABFBF', '#E8B84B', '#8B5FC4', '#1F9E9E', '#F0CC73'];
```

**Birthday/Anniversary widgets:**
- Birthday date circles: `bg-bifrost-violet/10 text-bifrost-violet-light` (dark) / `bg-bifrost-violet/8 text-bifrost-violet` (light)
- Anniversary date circles: `bg-aurora-teal/10 text-aurora-teal` (dark) / `bg-aurora-teal/8 text-aurora-teal-dark` (light)
- Tenure badges: `bg-bifrost-violet/12 text-bifrost-violet-light` (dark) / `bg-bifrost-violet/6 text-bifrost-violet` (light)

**Typography:**
- Page title "HR Dashboard Overview": `font-display text-xl font-medium`
- Stat values (194, 53, 27.41%): `font-display text-3xl font-semibold`
- Stat labels: `font-body text-xs`

**Status badges:**
- "Growing": `bg-aurora-teal/12 text-aurora-teal` (dark) / `bg-aurora-teal/8 text-aurora-teal-dark` (light)
- "Moderate": `bg-bridge-gold/12 text-bridge-gold` (dark) / `bg-bridge-gold/8 text-bridge-gold-dark` (light)

## 7E. Modify `src/pages/SettingsPage.tsx` — Add Shimmer Toggle

Add a setting in the Appearance or Display section of the Settings page:

```tsx
// Add to the existing settings sections:
<div className="flex items-center justify-between py-3">
  <div>
    <p className="font-medium text-gray-900 dark:text-white">Sidebar Shimmer Animation</p>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Animate the gradient bar on the sidebar edge, or keep it static
    </p>
  </div>
  <button
    onClick={() => {
      const newVal = !shimmerAnimated;
      setShimmerAnimated(newVal);
      localStorage.setItem('bifrost_shimmer_animated', String(newVal));
      // Dispatch event so MainLayout picks up the change
      window.dispatchEvent(new Event('shimmerSettingChanged'));
    }}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      shimmerAnimated ? 'bg-bifrost-violet' : 'bg-gray-300 dark:bg-gray-600'
    }`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
      shimmerAnimated ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
</div>
```

In `MainLayout.tsx`, listen for the setting change:
```tsx
useEffect(() => {
  const handleShimmerChange = () => {
    const stored = localStorage.getItem('bifrost_shimmer_animated');
    setShimmerAnimated(stored !== 'false');
  };
  window.addEventListener('shimmerSettingChanged', handleShimmerChange);
  return () => window.removeEventListener('shimmerSettingChanged', handleShimmerChange);
}, []);
```

## 7F. Global CSS Override — Blue → Violet Cascade

Add to `src/index.css` to catch blue accents across all 30+ admin pages without modifying them individually:

```css
/* Bifröst admin global overrides */
.bg-blue-600 { background-color: var(--bifrost-violet) !important; }
.bg-blue-500 { background-color: var(--bifrost-violet) !important; }
.hover\:bg-blue-700:hover { background-color: var(--bifrost-violet-dark) !important; }
.text-blue-600 { color: var(--bifrost-violet) !important; }
.text-blue-500 { color: var(--bifrost-violet) !important; }
.border-blue-600 { border-color: var(--bifrost-violet) !important; }
.ring-blue-500 { --tw-ring-color: var(--bifrost-violet) !important; }
.focus\:ring-blue-500:focus { --tw-ring-color: var(--bifrost-violet) !important; }

/* Dark mode blue overrides */
.dark .bg-blue-600 { background-color: var(--bifrost-violet) !important; }
.dark .text-blue-400 { color: var(--bifrost-violet-light) !important; }
.dark .text-blue-500 { color: var(--bifrost-violet-light) !important; }
```

**IMPORTANT:** These are global overrides for the admin app. They will NOT affect the employee portal (separate app, separate CSS). But test each major admin page after applying to ensure nothing breaks.

---

## Execution Checklist

1. [ ] 7A: Add Google Fonts to root `index.html`
2. [ ] 7B: Add Bifröst tokens to `src/index.css`
3. [ ] 7C: Modify `MainLayout.tsx` (logo, shimmer bar, nav active state, avatar, content offset)
4. [ ] 7D: Modify `DashboardPage.tsx` (stat cards, chart colors, widgets, typography)
5. [ ] 7E: Add shimmer toggle to `SettingsPage.tsx`
6. [ ] 7F: Add global blue → violet CSS overrides
7. [ ] Test: Run `npm run build` (root), verify dark mode default works
8. [ ] Test: Toggle to light mode, verify it works
9. [ ] Test: Toggle shimmer animated vs static in Settings
10. [ ] Test: Navigate all major pages — Employees, Payroll, FMLA, Performance, Reports

---

## Files to Modify

```
index.html                              — Add font imports
src/index.css                           — Add Bifröst tokens + overrides
src/layouts/MainLayout.tsx              — Logo, shimmer, nav, avatar
src/pages/DashboardPage.tsx             — Stat styling, charts, widgets
src/pages/SettingsPage.tsx              — Shimmer toggle
```

## Files to Create

```
src/components/BifrostAdminLogo.tsx     — Bridge logo + wordmark component
```
