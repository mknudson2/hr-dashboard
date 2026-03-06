# Bifröst + Mímir Design Tokens & Brand Reference

## Color Palette

| Token Name | Hex | RGB | Usage |
|---|---|---|---|
| bifrost-violet | #6C3FA0 | 108, 63, 160 | Primary brand color, buttons, active nav, accent borders |
| bifrost-violet-light | #8B5FC4 | 139, 95, 196 | Hover states, active nav bar indicator |
| bifrost-violet-dark | #5A2E8A | 90, 46, 138 | Button hover, pressed states |
| aurora-teal | #2ABFBF | 42, 191, 191 | Secondary accent, teal stat card, Mímir status dot, active badges |
| aurora-teal-light | #4DD4D4 | 77, 212, 212 | Teal hover states |
| bridge-gold | #E8B84B | 232, 184, 75 | Tertiary accent, gold stat card, warnings |
| bridge-gold-light | #F0CC73 | 240, 204, 115 | Gold hover states |
| realm-white | #F8F7F4 | 248, 247, 244 | Main content background, input backgrounds |
| deep-night | #1A1A2E | 26, 26, 46 | Sidebar background, text primary |
| deep-night-light | #252540 | 37, 37, 64 | Sidebar hover states |
| mimir-blue | #1B3A5C | 27, 58, 92 | Mímir brand color, chat FAB, panel header |
| mimir-blue-light | #2A5580 | 42, 85, 128 | Mímir hover states |
| well-silver | #B8C4D0 | 184, 196, 208 | Sidebar text, muted elements |

## Gradients

### Bifröst Shimmer (primary gradient)
```css
background: linear-gradient(90deg, #6C3FA0, #2ABFBF, #E8B84B, #2ABFBF, #6C3FA0);
background-size: 300% 100%;
animation: shimmerSlide 6s ease infinite;
```

Used for: ShimmerBar (3px top bar), loading states, accent decorations

## Typography

| Role | Font | Weight | Usage |
|---|---|---|---|
| Display | Jost | 300-700 | Headings, logo wordmark, stat values, page titles |
| Body | DM Sans | 300-700 | Body text, nav items, labels, inputs |
| Monospace | system monospace | 400 | Code, technical values |

### Font Loading
```html
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
```

### Tailwind v4 Theme
```css
@theme {
  --font-display: 'Jost', 'Montserrat', sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
}
```

Usage: `className="font-display"` or `className="font-body"`

## Spacing System

| Context | Value | Usage |
|---|---|---|
| Page padding (desktop) | 28px (p-7) | Main content area |
| Page padding (mobile) | 16px (p-4) | Main content area |
| Card padding | 20px (p-5) | All cards |
| Card border radius | 12px (rounded-xl) | Standard cards |
| Card gap | 14-16px (gap-3.5 to gap-4) | Between cards |
| Sidebar width | 250px | Fixed desktop sidebar |
| ShimmerBar height | 3px | Top gradient bar |
| Stat card border-top | 3px | Accent color indicator |
| Benefit card border-left | 4px | Category color indicator |

## Component Specifications

### Stat Cards
- 3 cards in a row (grid-cols-3)
- White background, rounded-xl, shadow-sm
- 3px top border in accent color (violet, teal, gold)
- Icon: 36px square with accent background at 8% opacity
- Value: font-display, text-2xl, font-semibold
- Hover: shadow-md, translateY(-2px)

### Quick Link Cards
- 6 cards in a row (grid-cols-6)
- White background, rounded-lg
- Icon: 36px square with realm-white background
- Label: text-xs, font-medium
- Hover: bifrost-violet/20 border, shadow-md, translateY(-2px)

### Navigation Items (Sidebar)
- Inactive: text-well-silver, opacity 80%, rounded-lg
- Hover: bg-white/4, text-white
- Active: bg-bifrost-violet/15, text-white, font-medium
- Active indicator: 3px left border in bifrost-violet-light, rounded right corners

### Mímir FAB (Floating Action Button)
- Position: fixed, bottom-6, right-6
- Size: 50px circle
- Background: mimir-blue
- Icon: MimirLogo (concentric circles) in white
- Shadow: 0 4px 18px rgba(27, 58, 92, 0.35)
- Pulse animation: subtle teal ring expanding outward

### Mímir Chat Panel
- Position: absolute, bottom-18px, right-18px
- Size: 340px × 450px
- Border radius: 16px
- Header: mimir-blue background, MimirLogo, "Mímir" title, green status dot
- User messages: right-aligned, bg-bifrost-violet, white text, rounded with bottom-right flat
- Assistant messages: left-aligned, bg-gray-100, dark text, rounded with bottom-left flat
- Source citations: italic, smaller text, mimir-blue links
- Input: realm-white background, mimir-blue focus ring

## Mobile Specifications

### Bottom Tab Bar
- 5 tabs: Home, My HR, Requests, Resources, More
- Tab icons should use Lucide icons styled with brand colors:
  - Active tab: bifrost-violet icon + label
  - Inactive tab: well-silver icon + label
- Background: white, top border 1px gray
- Padding: 6px top, 10px bottom (safe area aware)

### Mobile Header
- Background: deep-night
- BifrostLogo (sm) + "BIFRÖST" wordmark
- Hamburger menu icon in well-silver

### Stat Cards (Mobile)
- Horizontal scroll (overflow-x-auto)
- Min-width: 150px per card
- Same accent borders as desktop

## Dark Mode Notes

The Bifröst layout does NOT use the existing dark mode toggle. The sidebar is ALWAYS dark (deep-night background). The main content area is ALWAYS realm-white. This provides a consistent, branded experience regardless of system theme preference.

The OG and Modern views continue to respect dark mode as before — this is view-specific, not global.
