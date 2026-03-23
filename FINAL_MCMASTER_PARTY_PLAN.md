# Final McMaster Party — Implementation Plan

## Goal

Make `/final-mcmaster-party` a **single-page party experience**. User signs in with Google → they're in. Same page shows their invitation with "match drops March 28 @ 12 AM." Matching is triggered manually via edge functions.

---

## Current State

- `/final-mcmaster-party/page.tsx` — landing page with vinyl record, EVE branding, Google sign-in
- After sign-in, it redirects to `/friend-party/setup` (wrong — should stay on its own page)
- Has sub-routes (`/setup`, `/enrich`, `/dashboard`, `/profile`) that all funnel into `/friend-party`
- No dedicated party DB record, API routes, or attendance tracking

---

## New Flow

```
/final-mcmaster-party
  ├── NOT signed in → Landing page (vinyl record, EVE, "Sign in to RSVP" button)
  │     └── Google OAuth (requests YouTube scope)
  │           └── /auth/callback (validates YouTube, syncs data if granted)
  │                 └── redirects back to /final-mcmaster-party
  │
  └── SIGNED IN → Same themed page, but now shows:
        ├── "You're in" confirmation
        ├── "Your match drops March 28 @ 12 AM" invitation
        ├── YouTube status badge (connected ✓ / not connected)
        ├── RSVP attendee list
        └── Match card area (hidden until March 28 @ 12 AM, then reveals match)
```

**One page. Two states.** No `/setup`, no `/enrich`, no `/dashboard`, no `/profile`.

---

## What to Build

### 1. Database — New Party Record

Insert a new row in `parties` table:
- `slug`: `'final-mcmaster-party'`
- `title`: `'EVE — The Final McMaster Party'`
- `event_datetime`: `2026-03-28T22:00:00-04:00` (March 28, 2026 10 PM ET)
- `status`: `'published'`
- `pairing_mode`: `'day_before_batch'`

**No new tables needed** — reuse `party_rsvps`, `party_matches`, `user_matches`.

### 2. Backend — API Routes

Create `/api/final-mcmaster-party/` with 2 endpoints:

#### `GET /api/final-mcmaster-party/rsvps`
- Copy logic from `/api/friend-party/rsvps/route.ts`
- Change slug to `'final-mcmaster-party'`

#### `GET /api/final-mcmaster-party/match`
- Copy logic from `/api/friend-party/match/route.ts`
- Change slug to `'final-mcmaster-party'`
- `MATCH_REVEAL_ISO` = `'2026-03-28T00:00:00-04:00'` (March 28 @ 12 AM ET)
- Matching logic:
  - If user has DNA/YouTube data → use `user_matches` similarity scores (best match)
  - If user has NO data → random match from attendee pool

### 3. Backend — Attendance Helper

Create `src/lib/final-mcmaster-party-attendance.ts`:
- Same as `friend-party-attendance.ts` but with slug `'final-mcmaster-party'`

### 4. Backend — Edge Function (matching trigger)

Matching is NOT auto-triggered. You (the admin) invoke it manually via edge function when ready. The edge function should:
1. Get all `party_rsvps` for `final-mcmaster-party` where `status = 'going'`
2. For each user, check if they have `user_matches` data (YouTube DNA vectors)
3. Users WITH data → match to the best-scoring candidate who hasn't been matched yet
4. Users WITHOUT data → match randomly to an unmatched candidate
5. Insert `party_matches` records for each pair

### 5. Frontend — Single Page with Two States

#### `page.tsx` changes:

**Add auth state detection:**
- On mount, check `supabase.auth.getSession()`
- If signed in → auto-RSVP via attendance helper, show signed-in state
- If not signed in → show current landing page (no changes needed)

**Change post-auth redirect:**
- `POST_AUTH_REDIRECT_KEY` value → `/final-mcmaster-party` (not `/friend-party/setup`)

**Signed-in state (same EVE theme — ember gradient, vinyl textures, gold accents):**
- "You're in" confirmation header
- YouTube status: query `youtube_subscriptions` count → show badge (Connected / Not Connected)
- "Your match drops March 28 @ 12 AM" with countdown timer
- RSVP attendee list (fetch from `/api/final-mcmaster-party/rsvps`)
- Match card area:
  - Before March 28 @ 12 AM → "Match card unlocks soon"
  - After March 28 @ 12 AM → fetch from `/api/final-mcmaster-party/match` → show match card (name, avatar, compatibility note)

**Keep the EVE theme throughout** — ember gradient background, gold shimmer text, vinyl record motifs, warm orange accents. NOT the black/purple/cyan dashboard style from `/friend-party/dashboard`.

### 6. Cleanup — Remove Dead Sub-routes

These sub-routes are no longer needed:
- `src/app/final-mcmaster-party/setup/` — DELETE
- `src/app/final-mcmaster-party/enrich/` — DELETE
- `src/app/final-mcmaster-party/dashboard/` — DELETE
- `src/app/final-mcmaster-party/profile/` — DELETE

---

## YouTube — How It Works

1. Google OAuth already requests `youtube.readonly` scope
2. `/auth/callback` already syncs YouTube data (subscriptions + liked videos) if the user grants access
3. If granted → `youtube_subscriptions` / `youtube_liked_videos` tables get populated → `derive_interests` + `compute_dna_v2` run → `user_matches` similarity scores are computed
4. On the page, we just check: does this user have rows in `youtube_subscriptions`? → **Connected** (true) or **Not Connected** (false)
5. This boolean is informational only — no user action needed

**Matching implication:**
- YouTube connected → DNA vectors exist → match by similarity score (best match)
- YouTube not connected → no DNA → random match from attendee pool

---

## What We're NOT Doing

- No setup questions / profile form
- No Instagram import / enrich step
- No separate dashboard page
- No profile editing page
- No automated matching — it's manually invoked by you via edge function

---

## Summary of Files

| File | Action |
|------|--------|
| `src/app/final-mcmaster-party/page.tsx` | **REWRITE** — add signed-in state with invitation, countdown, RSVPs, match card (same EVE theme) |
| `src/app/final-mcmaster-party/setup/` | **DELETE** folder |
| `src/app/final-mcmaster-party/enrich/` | **DELETE** folder |
| `src/app/final-mcmaster-party/dashboard/` | **DELETE** folder |
| `src/app/final-mcmaster-party/profile/` | **DELETE** folder |
| `src/lib/final-mcmaster-party-attendance.ts` | **NEW** — attendance helper with slug `'final-mcmaster-party'` |
| `src/app/api/final-mcmaster-party/match/route.ts` | **NEW** — match endpoint |
| `src/app/api/final-mcmaster-party/rsvps/route.ts` | **NEW** — RSVP list endpoint |

**DB:** Insert 1 row into `parties` table with slug `'final-mcmaster-party'`
**Edge Function:** Create/adapt matching function for manual invocation

---

## Open Questions

1. **Match reveal = March 28 @ 12 AM ET** — confirmed?
2. **Edge function for matching** — should this be a new Supabase edge function, or adapt the existing match API route to be callable by you?
3. **After match reveal, should users see RSVP list too**, or just their match card?
