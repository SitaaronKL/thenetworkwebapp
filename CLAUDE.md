# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint (eslint-config-next with core-web-vitals + typescript)
```

No test framework is configured. There are no test scripts or test files.

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · Supabase (auth, DB, storage, edge functions) · Deployed on Vercel

**What this app does:** A social networking platform ("The Network") that requires Google OAuth with YouTube read permissions, analyzes YouTube data to compute interest profiles and personality "DNA", visualizes social graphs, and features AI-powered people matching.

### Directory Layout

```
src/
  app/            # Next.js App Router — pages, layouts, API routes, server actions
  components/     # React components
    ui/           # shadcn/ui primitives (button, card, input, etc.)
    MeetNetwork/  # Meeting/availability feature components
  contexts/       # AuthContext (sole context — provides user, session, signIn/signOut)
  hooks/          # Custom hooks (useAudioParty)
  lib/            # Utilities — supabase browser client, cn(), plan-generation, yelp, email-template
  services/       # Service layer — aria.ts, referral.ts, verification.ts, youtube.ts
  types/          # TypeScript types — aria.ts, dna.ts, network.ts
  utils/supabase/ # Server + client Supabase client factories
  proxy.ts        # Supabase session-refresh middleware helper (defined but not wired as middleware.ts)
```

### Two Supabase Client Patterns

- **Browser client:** `src/lib/supabase.ts` — uses `createBrowserClient` from `@supabase/ssr`
- **Server client:** `src/utils/supabase/server.ts` — uses `createServerClient` with Next.js `cookies()`

API routes and server actions use the server client. Client components use the browser client (often via AuthContext). No ORM — all DB access is direct Supabase JS client calls (`.from()`, `.select()`, `.insert()`, `.upsert()`, `.rpc()`).

### Auth Flow

Google OAuth with mandatory YouTube read scope. Users who don't grant YouTube access are signed out. The auth callback (`src/app/auth/callback/page.tsx`) handles: token verification, profile creation/update, referral tracking, and triggers background profile enrichment (calls Supabase edge functions `derive_interests` and `compute_dna_v2`).

### User Onboarding State Machine

new → `/onboarding` → `/profile-setup/signals` → `/profile-setup/building` → `/profile-setup/wrapped` → `/network` (main app)

### Server Actions

Used in `src/app/admin900/actions.ts`, `src/app/admin900/venue/actions.ts`, and `src/app/party/actions.ts`. Admin actions use the service role key and are password-gated.

### Key Supabase Tables

`profiles`, `user_profile_extras`, `user_connections` (friend graph), `user_matches` (AI compatibility), `youtube_subscriptions`, `youtube_liked_videos`, `aria_conversations`, `parties`, `party_rsvps`, `party_matches`, `user_availability_blocks`, `user_city_anchors`, `ready_plans`, `ready_plan_responses`, `weekly_drops`, `suggestion_interactions`, `schools`, `waitlist`, `user_referral_codes`, `user_overlap_scores`

### Supabase Edge Functions (Remote)

- `derive_interests` — generates interest tags from YouTube data
- `compute_dna_v2` — computes personality archetypes + doppelgangers
- `ari-chat` — AI conversational router for people matching
- `verify-school-email` — .edu email verification

### Visualization Stack

Three.js + React Three Fiber + Drei (3D network galaxy), Sigma.js + graphology (interest graph), D3 (data viz), Spline (3D scenes). Large components: `NetworkGalaxy.tsx` (42KB), `InterestGraph.tsx` (21KB), `network/page.tsx` (92KB monolithic page).

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-accessible Supabase config
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used in admin actions
- `NEXT_PUBLIC_YT_REVIEW_ENABLED` — YouTube review feature flag
- `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` — app URLs for metadata

## Styling

**Tailwind CSS v4** — uses `@import "tailwindcss"` in `globals.css` with `@tailwindcss/postcss` (no `tailwind.config.js`). Design tokens are CSS custom properties in `:root`.

**Always dark mode.** Pure black (#000000) background. The brand is premium, dark, sharp-cornered (0–4px border-radius), and editorial. See `BRAND_GUIDELINES.md` for the full design system.

**`cn()` utility** at `src/lib/utils.ts` — combines `clsx` + `tailwind-merge` for conditional class names.

**Fonts:** Inter (body), Space Grotesk (display), JetBrains Mono (data/code), Saans (trial, from `public/`), Feature Deck Condensed (local).

### Path Aliases

`@/` maps to `src/` (configured in `tsconfig.json`).

## Migrations

SQL migration files live in `supabase_migrations/` (not managed by Supabase CLI — standalone SQL files).
