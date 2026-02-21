# The Network -- Brand Design & Color Palette Guidelines

> Structured for LLM consumption. Use this document as a system-level reference when generating UI code, component styles, copy, or design decisions for The Network web app.

---

## 1. Brand Essence

**Mood**: Premium, dark, confident, mysterious, tech-forward, editorial
**Personality**: A high-end creative studio meets fintech data visualization. Not playful -- deliberate. Not loud -- commanding. The brand whispers with authority.
**Positioning**: Where SavoirFaire's editorial elegance meets Auros's generative-data aesthetic, wrapped in Vercel Ship's bold typographic confidence.

---

## 2. Color Palette

### 2.1 Core Colors

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| **Background Primary** | Void Black | `#000000` | 0, 0, 0 | Primary background for all surfaces, the canvas everything lives on |
| **Background Secondary** | Deep Charcoal | `#0A0A0A` | 10, 10, 10 | Cards, elevated surfaces, subtle depth layering |
| **Background Tertiary** | Graphite | `#111111` | 17, 17, 17 | Modals, overlays, secondary panels |
| **Text Primary** | Pure White | `#FFFFFF` | 255, 255, 255 | Headlines, hero text, primary content |
| **Text Secondary** | Silver Mist | `#A0A0A0` | 160, 160, 160 | Body text, descriptions, secondary information |
| **Text Tertiary** | Smoke | `#666666` | 102, 102, 102 | Captions, timestamps, disabled states, metadata |

### 2.2 Accent Colors (use sparingly)

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| **Accent Glow** | Particle White | `#E8E8E8` | 232, 232, 232 | Hover states, glowing edges, particle effects, interactive highlights |
| **Warm Accent** | Burnished Leather | `#6B4C3B` | 107, 76, 59 | Warm touches on premium elements, optional accent for photography overlays |
| **Neutral Mid** | Concrete | `#808080` | 128, 128, 128 | Borders, dividers, input outlines in resting state |
| **Surface Warm** | Sandstone | `#C8BAA7` | 200, 186, 167 | Optional warm neutral for tags, badges, or soft category labels |

### 2.3 Functional / State Colors

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| **Success** | Mint Glow | `#4ADE80` | Confirmations, positive states (use at reduced opacity ~80%) |
| **Error** | Ember | `#EF4444` | Errors, destructive actions (use at reduced opacity ~80%) |
| **Warning** | Amber Dust | `#F59E0B` | Warnings, caution states (use at reduced opacity ~80%) |
| **Info / Link** | Ice Blue | `#60A5FA` | Informational states, hyperlinks (use at reduced opacity ~80%) |

> **Rule**: Functional colors should never dominate the viewport. Use them as small indicators, inline text, or thin borders -- never as full backgrounds.

### 2.4 Gradient & Glow Effects

```
/* Particle glow -- for generative/data visualization elements */
radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 70%)

/* Subtle surface elevation */
linear-gradient(180deg, #0A0A0A 0%, #000000 100%)

/* Edge glow on interactive elements */
box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);

/* Hero text glow (for large display type) */
text-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
```

---

## 3. Typography

### 3.1 Type Scale & Hierarchy

The brand uses extreme scale contrast -- massive display type against small, precise functional text. This creates editorial tension and draws the eye.

| Level | Size Range | Weight | Tracking | Usage |
|-------|-----------|--------|----------|-------|
| **Display / Hero** | 72px -- 200px+ | 300 -- 700 | -0.04em to -0.02em (tight) | Hero sections, large counters, splash screens, section anchors |
| **Heading 1** | 40px -- 56px | 600 -- 700 | -0.02em | Page titles, major section headers |
| **Heading 2** | 28px -- 36px | 500 -- 600 | -0.01em | Sub-section titles, modal headers |
| **Heading 3** | 20px -- 24px | 500 | -0.01em | Card titles, list group headers |
| **Body Large** | 16px -- 18px | 400 | 0em | Primary body copy, descriptions, introductory paragraphs |
| **Body** | 14px -- 15px | 400 | 0em | Standard body text, form labels |
| **Caption** | 11px -- 12px | 400 -- 500 | 0.02em to 0.05em (loose) | Metadata, timestamps, labels, auxiliary information |
| **Overline** | 10px -- 12px | 500 -- 600 | 0.08em to 0.12em (very loose) | Category tags, section markers, all-uppercase labels |

### 3.2 Font Stack Recommendations

**Primary (Sans-serif, for UI and body):**
`"Inter", "SF Pro Display", "Helvetica Neue", system-ui, -apple-system, sans-serif`

**Display (For hero/editorial moments -- choose one):**
- `"PP Neue Montreal"` -- geometric, confident, used in sites like Vercel Ship
- `"Syne"` -- slightly expressive, modern grotesque
- `"Space Grotesk"` -- technical, clean, pairs well with data viz
- `"Instrument Sans"` -- elegant, editorial weight range

**Serif (For editorial contrast in display -- optional):**
`"Instrument Serif", "Playfair Display", "EB Garamond", Georgia, serif`
Use sparingly for large display numbers or pull quotes to create the SavoirFaire-style editorial feel.

**Monospace (For data, code, technical labels):**
`"JetBrains Mono", "SF Mono", "Fira Code", "Consolas", monospace`
Use for: counters, data readouts, timestamps, technical metadata.

### 3.3 Typography Rules

- Headlines: Generally white (#FFFFFF), tight tracking, can go extremely large
- Body text: Silver Mist (#A0A0A0), comfortable line-height (1.5 -- 1.7)
- All-caps overlines: Smoke (#666666) or Silver Mist, very loose tracking (0.08em+)
- Never use more than 2 typeface families on a single screen
- Display type can bleed off-screen or be cropped -- this is intentional and adds editorial drama (ref: Vercel Ship's "SHIFT" treatment)
- Numbers in display size should use tabular/monospace figures when available

---

## 4. Layout & Spacing

### 4.1 Principles

- **Dark-canvas-first**: The black background IS the design. Negative space is a feature, not wasted space.
- **Content density**: Low. Each screen should have one clear focal point. Do not clutter.
- **Asymmetric balance**: Content doesn't need to be centered. Top-left anchored text with bottom-right graphics creates dynamic tension (ref: SavoirFaire, Yung Studio).
- **Full-bleed moments**: Hero sections, visualizations, and key interactions should span the full viewport.

### 4.2 Spacing Scale (in px, use rem in implementation)

```
4   -- micro (icon padding, inline gaps)
8   -- xs (tight element spacing)
12  -- sm (related element groups)
16  -- md (standard component padding)
24  -- lg (section internal padding)
32  -- xl (between content blocks)
48  -- 2xl (major section gaps)
64  -- 3xl (hero-level breathing room)
96  -- 4xl (dramatic section separation)
128 -- 5xl (splash/hero vertical padding)
```

### 4.3 Grid

- Max content width: `1200px` for standard content, `1440px` for wide layouts
- Margins: `24px` mobile, `48px` tablet, `64px -- 96px` desktop
- Columns: 12-column grid, but prefer organic/fluid placement over rigid grid for hero and editorial sections

---

## 5. Component Styling

### 5.1 Buttons

```
/* Primary CTA */
background: #FFFFFF;
color: #000000;
font-weight: 600;
font-size: 14px;
letter-spacing: 0.02em;
padding: 12px 24px;
border-radius: 0px;               /* Sharp edges -- ref Vercel Ship */
transition: opacity 0.2s ease;
/* Hover: opacity 0.85 */

/* Secondary / Ghost */
background: transparent;
color: #FFFFFF;
border: 1px solid #333333;
padding: 12px 24px;
border-radius: 0px;
/* Hover: border-color #FFFFFF, background rgba(255,255,255,0.05) */

/* Tertiary / Text Link */
background: none;
border: none;
color: #A0A0A0;
text-decoration: underline;
text-underline-offset: 4px;
/* Hover: color #FFFFFF */
```

### 5.2 Cards & Surfaces

```
background: #0A0A0A;
border: 1px solid rgba(255, 255, 255, 0.06);
border-radius: 2px;               /* Near-sharp, not fully rounded */
padding: 24px;
/* Hover: border-color rgba(255, 255, 255, 0.12) */
/* Elevated: box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5) */
```

### 5.3 Inputs & Form Fields

```
background: #0A0A0A;
border: 1px solid #333333;
color: #FFFFFF;
font-size: 14px;
padding: 12px 16px;
border-radius: 2px;
/* Focus: border-color #FFFFFF, outline: none */
/* Placeholder: color #666666 */
```

### 5.4 Modals & Overlays

```
/* Backdrop */
background: rgba(0, 0, 0, 0.85);
backdrop-filter: blur(8px);

/* Modal surface */
background: #111111;
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 4px;
max-width: 560px;
padding: 32px;
```

### 5.5 Navigation / Header

- Minimal, near-invisible. The nav should not compete with content.
- Background: transparent or `rgba(0,0,0,0.5)` with `backdrop-filter: blur(12px)` when scrolled
- Text: Silver Mist (#A0A0A0), active state White (#FFFFFF)
- No underlines for nav links -- use opacity/color change for active state
- Position: fixed, top, z-indexed above content

---

## 6. Visual & Motion Language

### 6.1 Imagery Style

- **Photography**: Dark, moody, high-contrast. Desaturated or near-monochrome. Rich shadows.
- **Data Visualization**: Particle systems, generative line art, organic glowing wireframes against pure black (ref: Auros). White/light particles scattered on void-black backgrounds.
- **Graphic Elements**: Fluid organic shapes (ref: Yung Studio), abstract and expressive but always white-on-black.
- **No stock photography feel**: Everything should feel curated, intentional, and slightly mysterious.

### 6.2 Animation & Motion

- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` -- smooth, slightly dramatic deceleration
- **Duration**: 200ms for micro-interactions, 400-600ms for transitions, 800ms-1200ms for reveals
- **Page transitions**: Content fades in from slight opacity (0 -> 1) with gentle upward drift (translate 12px -> 0)
- **Hover states**: Subtle -- opacity shifts, border color changes, gentle glows. Never bouncy or playful.
- **Scroll-triggered**: Elements reveal with staggered fade-in. No jarring pop-ins. Smooth parallax on hero elements.
- **Particle/data animations**: Continuous, ambient, slow-moving. They create life without distraction.

### 6.3 Iconography

- Line-style icons, 1.5px stroke weight
- White (#FFFFFF) or Silver Mist (#A0A0A0)
- Size: 20px -- 24px for UI, can scale up for feature illustrations
- No filled/solid icons unless indicating active state
- Prefer Lucide or Phosphor icon sets for consistency

---

## 7. Do's and Don'ts

### DO:
- Use extreme type scale contrast (huge headlines, small labels)
- Let the black background breathe -- negative space is premium
- Use white as the primary UI color against black backgrounds
- Keep interfaces sparse and focused on one action per viewport
- Use generative/particle visual effects for ambient texture
- Apply tight letter-spacing on large display text, loose on small overlines
- Crop display type at edges for editorial drama
- Use sharp (0px -- 4px) border-radius throughout -- this is not a rounded/bubbly brand

### DON'T:
- Use bright/saturated colors as primary backgrounds
- Fill every pixel with content -- density kills the premium feel
- Use rounded, bubbly, or "friendly" UI patterns (no pill-shaped buttons, no large border-radius cards)
- Mix more than 2-3 font families on a single screen
- Use drop shadows on light backgrounds -- this brand lives in the dark
- Make functional colors (green, red) visually dominant
- Use gradients as decorative backgrounds (gradients are for subtle glow effects only)
- Use playful, bouncy, or cartoonish animations

---

## 8. CSS Custom Properties (Implementation Reference)

```css
:root {
  /* Backgrounds */
  --bg-primary: #000000;
  --bg-secondary: #0A0A0A;
  --bg-tertiary: #111111;
  --bg-elevated: #1A1A1A;

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A0A0A0;
  --text-tertiary: #666666;
  --text-disabled: #444444;

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.12);
  --border-strong: rgba(255, 255, 255, 0.24);
  --border-focus: #FFFFFF;

  /* Accents */
  --accent-glow: #E8E8E8;
  --accent-warm: #6B4C3B;
  --accent-neutral: #808080;
  --accent-sandstone: #C8BAA7;

  /* Functional */
  --color-success: #4ADE80;
  --color-error: #EF4444;
  --color-warning: #F59E0B;
  --color-info: #60A5FA;

  /* Typography */
  --font-sans: "Inter", "SF Pro Display", "Helvetica Neue", system-ui, -apple-system, sans-serif;
  --font-display: "PP Neue Montreal", "Space Grotesk", "Syne", system-ui, sans-serif;
  --font-serif: "Instrument Serif", "Playfair Display", Georgia, serif;
  --font-mono: "JetBrains Mono", "SF Mono", "Fira Code", "Consolas", monospace;

  /* Spacing */
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --space-4xl: 96px;

  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 500ms;
  --duration-reveal: 800ms;

  /* Radius */
  --radius-none: 0px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
}
```

---

## 9. Reference Sites (the source images)

| Site | Key Takeaway |
|------|-------------|
| **SavoirFaire** | Editorial serif display type, extreme negative space, elegant minimalism, large numbers as visual anchors |
| **Yung Studio** | Organic fluid shapes as bold graphic elements, confident sans-serif body copy, black-and-white only palette |
| **Rennsport** | Warm neutral accents (leather, sandstone, charcoal), extended typeface for branding, premium automotive photography aesthetic |
| **Auros** | Generative particle/data visualizations, ambient motion, scientific-yet-beautiful, pure black canvas with luminous white data forms |
| **Vercel Ship** | Massive cropped display type, monospaced accents, sharp-cornered CTAs, confident conference-style layout, tech-forward editorial design |

---

## 10. Quick Decision Heuristic

When making any design or UI decision, ask:

1. **Is the background black?** It should be.
2. **Is there enough negative space?** Probably need more.
3. **Is the type scale dramatic enough?** Make headlines bigger, labels smaller.
4. **Does it feel premium and restrained?** If it feels "fun" or "friendly", pull back.
5. **Would it look at home next to the Auros particle visualization?** That's the north star.
