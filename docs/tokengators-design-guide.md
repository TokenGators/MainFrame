# TokenGators — Web Design Standards & Brand Guide
## Version 3.0 · March 2026
### Source-verified from tokengators.com HTML/CSS + visual screenshots

---

## 1. Brand Identity

TokenGators is a collection of 4,000 cartoon gators on Ethereum and ApeChain, created by PaperD of SuperPaperThings (DreamWorks Animation). The brand blends high-quality cartoon illustration with retro gaming aesthetics and adventure storytelling.

**Brand personality:** Playful, nostalgic, irreverent, richly illustrated, retro-tech.

**Site sections:**
- **Home Office** (`/`) — Main landing/bridge page with illustrated desk scene
- **Gator Explorer** (`/explorer`) — NFT collection browser with filters
- **Gator Bridge** — Cross-chain bridge (accessible via nav overlay, renders in the Home Office scene)
- **Gator Memes** (`/memes`) — Community meme page
- **Terms** (`/terms`)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js** (App Router, React Server Components) |
| Styling | **Tailwind CSS** with custom config (`bg-secondary`, `text-primary`, etc.) |
| Font | **WumpusMono** (custom monospace font, Discord-derived) — `font-WumpusMono` |
| Wallet | **RainbowKit** (`data-rk` wrapper, custom theme overrides) |
| Blockchain | Ethereum + ApeChain (dual-chain NFT collection) |
| Build ID | `g6OTkQ3SfcFJy8xDLe5mF` |
| Bridge Rendering | Client-side only (`BAILOUT_TO_CLIENT_SIDE_RENDERING`) — heavy canvas/interactive content |

---

## 3. Color System (Verified from Source)

### Brand Colors (exact hex values from HTML)

| Token | Hex | Source | Usage |
|---|---|---|---|
| `--color-primary` / `text-primary` | `#33ff33` | Inline styles, Tailwind `text-[#33ff33]` | **THE brand color.** Logo, nav links, filter labels, active states, borders, CTAs — everything accent |
| `--color-primary-hover` | `#33ff33` at 80% opacity | `hover:text-[#33ff33]/80` | Hover state for links and nav items |
| `--color-primary-border` | `#33ff33` at 20% opacity | `border-[#33ff33]/20` | Subtle borders on panels |
| `--color-primary-bg-active` | `#33ff33` at 10% opacity | `bg-[#33ff33]/10` | Active chip/filter background |
| `--color-primary-bg-hover` | `#33ff33` at 5% opacity | `hover:bg-[#33ff33]/5`, `hover:bg-primary/5` | Hover backgrounds |
| `--color-primary-focus-ring` | `#33ff33` at 50% opacity | `peer-focus:ring-[#33ff33]/50` | Focus ring on toggle switches |
| `--color-text-body` | `#E0E0E0` | `text-[#E0E0E0]` on body wrapper | Primary body/UI text |
| `--color-bg-secondary` | *(Tailwind custom)* | `bg-secondary` class | Page background, sidebar, cards — the dark gray base |
| `--color-bg-overlay` | `rgba(0,0,0,0.8)` | `bg-black/80` | Nav overlay backdrop |
| `--color-bg-panel` | `rgba(0,0,0,0.3)` | `bg-black/30` | Nav panel backgrounds |
| `--color-border-divider` | Tailwind `gray-500` / `gray-700` | `border-gray-500`, `border-gray-700` | Sidebar dividers, section borders |
| `--color-text-placeholder` | Tailwind `gray-400` | `placeholder-gray-400` | Input placeholders |
| `--color-text-inactive` | `#33ff33` at 70% opacity | `text-[#33ff33]/70` | Inactive filter chips, secondary labels |
| `--color-eth-icon` | `#627EEA` | `text-[#627EEA]` | Ethereum diamond icon in chain filter |

### RainbowKit Wallet Theme (from `[data-rk]` CSS variables)

| Variable | Value | Usage |
|---|---|---|
| `--rk-colors-accentColor` | `#0E76FD` | Wallet connect accent |
| `--rk-colors-connectButtonBackground` | `#FFF` | Connect button bg |
| `--rk-colors-connectButtonText` | `#25292E` | Connect button text |
| `--rk-colors-connectionIndicator` | `#30E000` | Connected status dot |
| `--rk-colors-error` | `#FF494A` | Error states |
| `--rk-colors-standby` | `#FFD641` | Standby/pending state |
| `--rk-colors-modalBackground` | `#FFF` | Wallet modal bg |
| `--rk-radii-connectButton` | `12px` | Connect button radius |
| `--rk-radii-modal` | `24px` | Wallet modal radius |
| `--rk-radii-modalMobile` | `28px` | Mobile modal radius |
| `--rk-fonts-body` | `SFRounded, ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` | Wallet UI font stack |

### Estimating `bg-secondary` (Tailwind Custom Token)

The `bg-secondary` class is defined in the Tailwind config (not in the HTML). Based on visual analysis of screenshots, this is approximately:

**`#28272a`** — a warm dark gray/charcoal, distinctly warmer and lighter than pure black. The site never uses pure `#000000` as the main background.

---

## 4. Typography (Verified)

### Primary Font: WumpusMono

The site uses a single custom font across the entire UI:

```
font-family: 'WumpusMono'  /* Tailwind class: font-WumpusMono */
```

- **File:** `/_next/static/media/27834908180db20f-s.p.woff2` (preloaded)
- **Character:** Monospace, rounded, friendly — originally associated with Discord's branding
- **Usage:** Everything — logo, navigation, filter labels, card labels, buttons, body text

This is a critical brand decision: using a monospace font site-wide gives the entire interface a retro terminal/hacker aesthetic that reinforces the "gator's computer workstation" theme.

### Type Styles (from HTML class analysis)

| Element | Classes | Resulting Style |
|---|---|---|
| Logo text | `text-lg font-bold text-[#33ff33] sm:text-xl` | 18px (20px on sm+), bold, green |
| Nav links | `text-xl font-bold text-[#33ff33] sm:text-3xl` | 20px (30px on sm+), bold, green |
| Filter section header | `text-lg font-semibold uppercase text-[#33ff33]` | 18px, semibold, uppercase, green |
| Filter subsection label | `text-md font-semibold uppercase text-[#33ff33]` | 16px, semibold, uppercase, green |
| Filter chip text | `text-xs font-medium` | 12px, medium weight |
| Blockchain label | `text-sm font-medium` | 14px, medium weight |
| Sort dropdown text | Hidden on mobile (`hidden md:block`) | Visible on md+, regular weight |
| Marketplace section title | `text-lg font-bold text-[#33ff33] sm:text-xl` | 18px (20px sm+), bold, green |
| Card label | Approximately `text-sm` | ~14px, centered below NFT art |
| Search placeholder | `placeholder-gray-400` | "Search Gator ID", gray-400 |

### Key Typography Rules
- **Everything green:** Nearly all text labels use `text-[#33ff33]` — the only non-green text is body content at `#E0E0E0` and placeholders at `gray-400`
- **Uppercase headers:** All section headers use `uppercase` — "FILTER", "RARITY TYPE", "BLOCKCHAIN", "FROG MODE"
- **Monospace everywhere:** WumpusMono creates a consistent retro-tech feel across all UI elements
- **Responsive scaling:** Most text uses `sm:` breakpoint variants (e.g., `text-xl sm:text-3xl`)

---

## 5. Layout & Structure (Verified)

### Explorer Page

```
┌──────────────────────────────────────────────────────┐
│ HEADER (fixed top, z-30, bg-secondary, full width)   │
│ [🐊 TokenGators]        [Sort▼] [Filter] [☰ Menu]   │
│ Height: 45px content + py-2 = ~61px total            │
├────────────────┬─────────────────────────────────────┤
│ SIDEBAR        │  MAIN GRID                          │
│ fixed left     │  flex-1, lg:ml-[300px]              │
│ z-20           │                                     │
│ w-[300px]      │  grid:                              │
│ mt-[58px]      │   cols-1                            │
│                │   sm:cols-2                          │
│ FILTER         │   lg:cols-3                          │
│ Rarity Type    │   xl:cols-4                          │
│ Blockchain     │   2xl:cols-5                         │
│ Frog Mode      │                                     │
│ Search         │  gap-4 (16px)                        │
│ Trait filters  │  px-4 (16px)                         │
│ (accordion)    │                                     │
│                │                                     │
│ mb-[80px]      │                                     │
│ (bottom pad)   │                                     │
└────────────────┴─────────────────────────────────────┘
```

**Key measurements:**
- Sidebar: `w-[300px]`, fixed position, slides via `translate-x-0` / `translate-x-full`
- Header: `h-[45px]` content area, `py-2` padding, fixed `top-0 z-30`
- Main grid offset: `mt-[60px]` for header clearance, `lg:ml-[300px]` for sidebar
- Grid gap: `gap-4` (16px)
- Grid padding: `px-4` (16px)
- Sidebar sections: `px-4 py-2` internal padding, `space-y-4` between sections
- Sidebar dividers: `border-b border-gray-500` between sections

### Home/Bridge Page

```
┌──────────────────────────────────────────────────────┐
│ NAV (fixed top, z-50)                                │
│                                      [☰ Menu] (ml-auto)│
│ Height: h-16 (64px)                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ MAIN (class="main-font")                             │
│ Client-side rendered interactive scene               │
│ (illustrated desk/workstation with CRT bridge UI)    │
│                                                      │
│ Full viewport, immersive illustration                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Key difference:** The home/bridge page has a minimal nav (just the hamburger menu, right-aligned) — no logo, no filter/sort controls. The entire page is an immersive illustrated scene.

### Navigation Overlay (shared across pages)

```
┌─────────────────────────────────────┐
│ (slides in from right, z-40)        │
│ bg-black/80 backdrop-blur-sm        │
│ w-full sm:w-1/3                     │
│                                     │
│         Home Office                 │
│         Gator Explorer              │
│         Gator Bridge                │
│         Gator Memes                 │
│                                     │
│    ┌─ APE Marketplaces ──────┐      │
│    │ [OpenSea icon]          │      │
│    └─────────────────────────┘      │
│    ┌─ ETH Marketplaces ──────┐      │
│    │ [OpenSea icon]          │      │
│    └─────────────────────────┘      │
│                                     │
│    [X] [Discord] [Instagram]        │
│                                     │
│            Terms                    │
└─────────────────────────────────────┘
```

- Full-screen on mobile, 1/3 width on `sm+`
- Links to OpenSea collections (separate ETH and APE)
- Social: X/Twitter, Discord, Instagram
- All text in `#33ff33`, bold

---

## 6. Component Specifications (Verified)

### 6.1 Header Bar (Explorer)

```html
<div class="fixed top-0 z-30 w-full bg-secondary">
  <div class="flex w-full justify-end px-4 py-2">
    <div class="flex h-[45px] w-full items-center justify-between gap-2 font-WumpusMono text-[#E0E0E0] sm:gap-4">
```

- **Left:** Logo image (`/logo.gif`, 34×34px) + "TokenGators" text (green, bold)
- **Right:** Sort button, Filter toggle button (green funnel icon), Hamburger menu button
- **Button style:** `h-9 w-9 sm:h-10 sm:w-10`, border, transparent bg, hover → `border-primary bg-primary/5 text-primary`
- **No border-radius on buttons** — they are square/rectangular (no rounded classes)
- **Sort dropdown:** Text hidden on mobile (`hidden md:block`), icon-only on small screens

### 6.2 Filter Sidebar

```html
<aside class="fixed left-0 top-0 z-20 mt-[58px] h-full w-[300px] bg-secondary">
```

**Rarity Type Section:**
- `grid grid-cols-2 gap-2`
- Three options: Statistical, Legacy, OpenSea (3rd wraps to next row)
- Active: `border-[#33ff33] bg-[#33ff33]/10 text-[#33ff33]`
- Inactive: `text-[#33ff33]/70 hover:border-[#33ff33] hover:bg-[#33ff33]/5`
- Radio button behavior (single select)

**Blockchain Section:**
- `grid grid-cols-3 gap-2`
- Three options: All (text), ETH (diamond SVG in `#627EEA`), APE (image icon)
- Same active/inactive styling as rarity
- Tooltips on hover (currently showing "Failed to load supply data")

**Frog Mode:**
- Toggle switch: `h-6 w-11`, `bg-gray-300` → `peer-checked:bg-green-500`
- Switch knob: `h-4 w-4`, `bg-[#28272a]`
- Label with frog icon (`Icon_Frog.png`, 16×16)

**Search Input:**
- `border border-gray-500`, `bg-secondary`
- `hover:border-[#33ff33] focus:border-[#33ff33]`
- Search icon (magnifying glass) in green, left-positioned
- `placeholder="Search Gator ID"`, `inputMode="numeric"`

**Trait Filter Accordions:**
- Listed from source: Theme, Special, Trait Count, Skin, Eyes, Mouth, Outfit, Hat, Background
- Each has an emoji icon and right chevron
- Collapsible (expand/collapse on click)
- All labels in green

### 6.3 NFT Card Grid

```html
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
```

From visual analysis of screenshots:
- **Card structure:** NFT art image (full width, colored background) + label below
- **Chain badge:** Top-left corner — "ETH" or "APE" in small dark pill
- **Index badge:** Top-right corner — numbered, colored circle
- **Label:** "TokenGator #XXXX" centered below image, `text-[#E0E0E0]`
- **No visible card border** in default state — art backgrounds provide separation
- **Cards load dynamically** (the HTML shows an empty grid — NFTs are client-side hydrated)

### 6.4 Hamburger Menu Button

```html
<button class="z-50 flex h-9 w-9 items-center justify-center border bg-transparent px-2 
  transition-all duration-300 hover:border-primary hover:bg-primary/5 hover:text-primary 
  focus:border-primary focus:outline-none sm:h-10 sm:w-10 sm:px-3">
```

- Standard three-line hamburger SVG (448×512 viewBox)
- 20×20px icon size
- Square button, no border-radius

---

## 7. Animation & Transitions (Verified)

| Pattern | Duration | Easing | Usage |
|---|---|---|---|
| Color/state changes | `duration-300` (300ms) | Default ease | Buttons, borders, backgrounds |
| Layout transitions | `duration-300` | Default ease | Sidebar slide, nav overlay |
| Nav overlay | `duration-300` | Default ease | `translate-x-full` → `translate-x-0` |
| Backdrop blur | N/A | N/A | `backdrop-blur-sm` on overlays |
| Hover transforms | N/A | N/A | `hover:scale-105` on social/marketplace icons |
| Opacity transitions | `transition-opacity` | Default | Tooltip show/hide |
| Toggle switch | `after:transition-all` | Default | Frog mode toggle knob |

**Global transition class on body wrapper:** `transition-all duration-300`

---

## 8. Responsive Breakpoints (Tailwind Defaults)

| Prefix | Min Width | Explorer Grid Cols | Key Changes |
|---|---|---|---|
| (base) | 0px | 1 | Single column, sidebar hidden, menu icons only |
| `sm:` | 640px | 2 | Nav overlay → 1/3 width, buttons scale to 40px |
| `md:` | 768px | 2 | Sort text visible in header |
| `lg:` | 1024px | 3 | Sidebar visible (`lg:ml-[300px]` offset), sidebar close button appears |
| `xl:` | 1280px | 4 | Wider grid |
| `2xl:` | 1536px | 5 | Maximum grid density (matches screenshot) |

---

## 9. Illustration & Art Direction

### NFT Art Style
- High-quality cartoon illustration by PaperD (DreamWorks Animation)
- Each gator: full character, reclining/lying pose, unique outfit + accessories
- Solid colored backgrounds (wide palette — see Section 3)
- Themes: wizards, pirates, cyborgs, celestial, military, mech, punk, etc.

### Bridge Scene (Home Page)
- Full-viewport illustrated scene — a gator's retro workstation
- CRT monitor displays bridge UI in retro terminal frame (green border)
- Pixel art elements within the CRT (landscape, mini NFT grid, chain labels)
- Environmental storytelling: posters, corkboard, gator figurines, VHS player, dart board
- Secondary CRT monitor shows pixel gator animation
- "GATOR XING" road sign, gator plush toys, orange mug
- The entire scene is client-side rendered (canvas/WebGL likely)

### Pixel Art Sub-Style (Bridge only)
- 8-bit/16-bit pixel aesthetic for in-CRT elements
- Pixel fonts for "BRIDGE", "ETH", "APE" labels
- Checkerboard NFT grid within the monitor
- Pixel landscape: grass → sand → water transition

---

## 10. External Links & Social

| Platform | URL |
|---|---|
| OpenSea (ETH) | `https://opensea.io/collection/tokengators` |
| OpenSea (APE) | `https://opensea.io/collection/tokengators-ape` |
| X/Twitter | `https://x.com/tokengators` |
| Discord | `https://discord.gg/bcW9K8wRVR` |
| Instagram | `https://www.instagram.com/tokengators/` |
| OG Image | `https://tokengators.com/coin-fixed-2.gif` |
| Logo | `/logo.gif` (animated GIF, 34×34 display size) |
| Favicon | `/favicon.ico` |

---

## 11. Asset Inventory (from HTML source)

| Asset | Path | Size | Usage |
|---|---|---|---|
| Logo | `/logo.gif` | 34×34 (display), up to 96px (srcSet) | Header logo, animated |
| WumpusMono font | `/_next/static/media/27834908180db20f-s.p.woff2` | woff2 | Site-wide font |
| Frog icon | `/_next/static/media/Icon_Frog.2ce70857.png` | 16×16 | Frog mode toggle |
| ApeChain icon | `/apechain_icon.png` | 20×20 (display), up to 48px | Chain filter |
| OpenSea logo | `/opensea.png` | 32×32 (display), up to 64px | Marketplace links |
| Twitter/X logo | `/Twitter.png` | 40×40 (display), up to 96px | Social link |
| Discord logo | `discord.png` | 50×50 (display), up to 128px | Social link |
| Instagram logo | `instagram.png` | 40×40 (display), up to 96px | Social link |
| OG share image | `/coin-fixed-2.gif` | N/A | Social sharing preview |

---

## 12. Tailwind Custom Config (Inferred)

Based on the custom classes used in source, the `tailwind.config.js` includes at minimum:

```js
// tailwind.config.js (reconstructed)
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#33ff33',       // Used as text-primary, border-primary, bg-primary/*
        secondary: '#28272a',     // Used as bg-secondary (estimated)
      },
      fontFamily: {
        WumpusMono: ['WumpusMono', 'monospace'],
      },
    },
  },
}
```

**Note:** The `primary` color token in Tailwind maps to `#33ff33` (bright terminal green). This is used with opacity modifiers: `text-primary`, `border-primary`, `bg-primary/5`, `bg-primary/10`, `hover:text-primary`, etc.

---

## 13. Using This Guide in Claude Code → Figma

### Setup

1. **Install Claude Code:** `npm install -g @anthropic-ai/claude-code`
2. **Add Figma MCP:** `claude mcp add --transport http figma https://mcp.figma.com/mcp`
3. **Authenticate:** In Claude Code, type `/mcp` → select `figma` → complete OAuth
4. **Requirements:** Figma desktop app (not browser), Figma Dev or Full seat

### Prototyping Workflow

1. Feed this entire document to Claude Code as context
2. Reference specific sections: "Build the Explorer page following Section 5 layout, Section 6 components, using the exact colors from Section 3 and font from Section 4"
3. Build live prototype → view in browser
4. Type "Send this to Figma" to capture as editable layers
5. Iterate on Figma canvas → roundtrip back via MCP

### What to Prototype First

1. **Explorer page** — sidebar filters + NFT card grid (most component-heavy)
2. **NFT detail view** — trait display, pricing, buy UI (not visible in source but needed)
3. **Navigation overlay** — hamburger menu with marketplace links and socials
4. **Bridge functional UI** — the chain-to-chain transfer interface (separate from illustrated scene)

### Design Tokens for Figma Variables

Create a Figma variable collection named "TokenGators" with these modes:

**Colors:**
- `primary` → `#33ff33`
- `primary/80` → `rgba(51, 255, 51, 0.8)`
- `primary/70` → `rgba(51, 255, 51, 0.7)`
- `primary/20` → `rgba(51, 255, 51, 0.2)`
- `primary/10` → `rgba(51, 255, 51, 0.1)`
- `primary/5` → `rgba(51, 255, 51, 0.05)`
- `bg-secondary` → `#28272a`
- `text-body` → `#E0E0E0`
- `eth-icon` → `#627EEA`
- `error` → `#FF494A`
- `standby` → `#FFD641`

**Spacing:** Follow Tailwind 4px base (4, 8, 12, 16, 20, 24, 32, 48, 64)

**Radii:** Minimal — most elements have 0 radius. RainbowKit modals use 24px.

---

*This document reflects the verified source code and visual design of tokengators.com as of March 2026. All hex values, class names, measurements, and component structures are extracted directly from the site's HTML output.*
