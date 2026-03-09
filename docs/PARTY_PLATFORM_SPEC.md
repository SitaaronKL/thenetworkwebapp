# Party Platform — Building a Luma/Partiful Inside The Network

## Vision

Turn The Network's party system from a manually-built, one-off invitation flow into a reusable, themeable party platform. Think Luma or Partiful, but integrated into The Network ecosystem with code-level theme customization.

Right now every party (friend-party, glowdown, st-pattys-day, etc.) is built as a completely custom page with its own canvas animations, color palettes, layout, and RSVP flow. This doesn't scale. The goal is a standardized party engine where:

1. A host creates a party and picks/edits a theme
2. The theme is code-editable (colors, animations, layout blocks, fonts, background effects)
3. RSVP, ticketing, waitlist, and check-in all come for free from the shared system
4. Every party ever hosted lives permanently in the system — nothing gets deleted

---

## Current Architecture (What Exists)

### Routes
- `/party` — Admin dashboard (password-gated), lists all parties, shows RSVPs/stats
- `/party/[slug]` — Generic public party page with animated background, RSVP flow, ticket display
- `/friend-party` — Custom-built invitation page (disco theme, music-reactive canvas, specific branding)
- `/st-pattys-day-party` — (WIP) Custom invitation page for St. Patrick's Day

### Database Tables
- `parties` — Party records (slug, title, presenter, status, allow_rsvp, barcode_mode, event_date, event_time, venue_address)
- `party_rsvps` — Authenticated user RSVPs (party_id, user_id, status, ticket_code, source)
- `waitlist` — Non-authenticated signups (name, email, party_ticket_code, campaign_code, party_id)

### Pain Points
- Each party is a separate Next.js route with 1000+ lines of custom code
- No shared theme system — colors, animations, and layout are hardcoded per party
- Past parties may not persist properly in the admin view (ordering, filtering issues)
- No way for a non-developer to create or customize a party

---

## Proposed Architecture

### 1. Party Theme Engine

Each party gets a `theme` JSON blob stored in the `parties` table (or a separate `party_themes` table):

```typescript
interface PartyTheme {
  // Identity
  name: string;                    // e.g. "St. Patrick's Day Bash"
  slug: string;                    // e.g. "st-pattys-day"

  // Colors
  colors: {
    background: string;            // e.g. "#000000"
    accent: string[];              // e.g. ["#00C853", "#FFD700", "#FFFFFF"]
    text: string;                  // e.g. "#FFFFFF"
    cardBg: string;                // e.g. "rgba(255,255,255,0.05)"
    cardBorder: string;            // e.g. "rgba(255,255,255,0.1)"
  };

  // Typography
  fonts: {
    heading: string;               // Google Font or bundled font name
    body: string;
    display?: string;              // Optional decorative font
  };

  // Background Effect
  background: {
    type: 'particles' | 'beams' | 'grid' | 'gradient' | 'canvas-custom';
    config: Record<string, any>;   // Effect-specific params
    customCode?: string;           // For advanced users: raw canvas draw function
  };

  // Layout
  layout: {
    heroStyle: 'centered' | 'split' | 'fullbleed';
    showDJ: boolean;
    showVenue: boolean;
    showCountdown: boolean;
    sections: string[];            // Ordered list: ["hero", "details", "rsvp", "lineup"]
  };

  // Assets
  assets: {
    logo?: string;                 // URL to party logo
    heroImage?: string;            // URL to hero image
    djPhoto?: string;              // URL to DJ/performer photo
    backgroundImage?: string;      // Optional static background
  };

  // Custom CSS (advanced)
  customCSS?: string;
}
```

### 2. Standardized Party Page (`/party/[slug]`)

The existing `/party/[slug]` route becomes the universal party renderer:

- Reads the party record + theme from DB
- Renders using a `<PartyRenderer theme={theme} party={party} />` component
- The renderer picks the right background effect, layout, colors, etc. from the theme
- RSVP flow, ticket generation, waitlist — all standardized
- Code-editable themes for power users (JSON editor or code sandbox in admin)

### 3. Party Admin Enhancements

Expand `/party` admin dashboard:

- **Create Party** — Form to create a new party with theme picker
- **Theme Editor** — Visual editor for colors/layout + code editor for advanced customization
- **Party Archive** — ALL parties persist forever, sorted by date, with status badges (upcoming/live/past)
- **Analytics** — RSVP trends, check-in rates, waitlist conversion

### 4. Party History (Fix the Deletion Problem)

Currently parties may appear to "disappear" because:
- The admin query orders by `created_at DESC` with no pagination — older parties fall off
- There's no status filtering (past events mixed with upcoming)
- No archive/history view

**Fix:**
- Add `event_date` to all party records (currently nullable)
- Admin dashboard gets tabs: "Upcoming", "Past", "All"
- Past parties are never deleted, just marked with status `completed`
- Public party pages for past events show a "This event has ended" state with recap/photos

---

## How This Applies to St. Patrick's Day Party

The St. Patty's Day party (`/st-pattys-day-party`) is the first candidate for the new system. Instead of building another 1000+ line custom page, we:

1. **Create a party record** in the `parties` table with slug `st-pattys-day`
2. **Define the theme:**
   - Colors: Green (#00C853), Gold (#FFD700), White (#FFFFFF) on black
   - Background effect: Shamrock particles or green beam lights
   - Layout: Centered hero with countdown, venue details, RSVP
   - Assets: St. Patrick's themed logo, any DJ/performer photos
3. **Use `/party/st-pattys-day`** as the public URL (served by the universal renderer)
4. The custom code in `/st-pattys-day-party` can serve as the prototype/reference for extracting the theme system

### Migration Path
1. Build the theme engine and universal renderer
2. Extract the friend-party disco theme into a theme JSON
3. Build the St. Patty's theme as a second theme JSON
4. Verify both render correctly through `/party/[slug]`
5. Deprecate the standalone route directories (`/friend-party`, `/st-pattys-day-party`)

---

## Future Parties

Once the theme engine exists, spinning up a new party looks like:

1. Admin creates party in dashboard
2. Pick a base theme (disco, neon, minimal, seasonal) or start from scratch
3. Customize colors, fonts, background effect, layout
4. Optionally drop into code editor for custom canvas animations or CSS
5. Set event details (date, time, venue, capacity)
6. Publish — the `/party/[slug]` URL is live immediately

Examples of future themed parties:
- Summer rooftop (sunset gradient, warm tones)
- Halloween (dark purple/orange, spooky particles)
- NYE (gold/silver, countdown-focused, confetti effect)
- Album release / listening party (artist branding, music-reactive visuals)

---

## Database Changes Needed

```sql
-- Add theme column to parties table
ALTER TABLE parties ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{}';

-- Add event metadata
ALTER TABLE parties ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS venue_name text;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Ensure event_date is populated for all parties
-- (backfill existing records)

-- Optional: separate themes table for reusable theme presets
CREATE TABLE IF NOT EXISTS party_theme_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  theme jsonb NOT NULL,
  created_by uuid REFERENCES profiles(id),
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## Component Breakdown

```
src/
  components/
    party/
      PartyRenderer.tsx          -- Universal party page renderer
      PartyBackground.tsx        -- Switchable background effects
      PartyHero.tsx              -- Hero section (title, countdown, branding)
      PartyDetails.tsx           -- Event info (date, time, venue, map)
      PartyRSVP.tsx              -- RSVP form + ticket display
      PartyLineup.tsx            -- DJ/performer lineup section
      themes/
        disco.ts                 -- Disco theme preset (extracted from friend-party)
        stpattys.ts              -- St. Patrick's Day theme preset
        neon.ts                  -- Neon/glow theme preset
        minimal.ts               -- Clean minimal theme preset
```

---

## Implementation Priority

1. **Phase 1:** Fix party persistence — ensure all parties show in admin, add status tabs
2. **Phase 2:** Define `PartyTheme` interface and add theme column to DB
3. **Phase 3:** Build `PartyRenderer` + background effect system
4. **Phase 4:** Extract friend-party theme, build St. Patty's theme
5. **Phase 5:** Admin theme editor (visual + code)
6. **Phase 6:** Public party creation (if opening to users beyond admin)
