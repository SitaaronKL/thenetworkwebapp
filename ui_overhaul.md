# UI Overhaul Documentation

This document outlines the current flow for a new user visiting the application, including the order of pages and their corresponding codebase locations. It has been updated to reflect the completed UI/UX overhaul based on the `UnboardingUI` Figma designs.

## 1. Initial Visit (Home Redirect)
*   **URL:** `/`
*   **Codebase:** `src/app/page.tsx`
*   **Behavior:**
    *   Checks authentication state.
    *   If not logged in, automatically redirects to `/landing`.
    *   If logged in, displays the main application (Network Graph).

## 2. Landing Page
*   **URL:** `/landing`
*   **Codebase:** `src/app/landing/page.tsx`
*   **Behavior:**
    *   **Visuals:** Scaled-up logo (5x), "Control who you are online" gradient text.
    *   **Primary Action:** "Claim my Digital DNA" button redirects to `/onboarding`.
    *   **Implementation:** Tailwind CSS, responsive scaling.

## 3. Onboarding (Value Prop & Sign In)
*   **URL:** `/onboarding`
*   **Codebase:** `src/app/onboarding/page.tsx`
*   **Behavior:**
    *   **Visuals:** Horizontal scrollable cards with complex SVG radial gradients and blur filters.
        *   Card 1: "Social media is draining" (Melting Icon, Red/Orange Gradient)
        *   Card 2: "Instagram grid is not the real you" (Grid Icon, Blue/Purple Gradient)
        *   Card 3: "No more performing" (DNA Icon, Green/Blue Gradient)
    *   **Action:** "Continue ->" button triggers Supabase OAuth sign-in (Google).
    *   **Implementation:** Custom SVG filters/gradients, Tailwind, standard `<img>` assets.

## 4. Authentication Callback & Testing Toggle
*   **URL:** `/auth/callback`
*   **Codebase:** `src/app/auth/callback/page.tsx`
*   **Behavior:**
    *   Handles the OAuth redirect from Google.
    *   Checks if the user is new or has an incomplete profile.
    *   **Testing Toggle:**
        *   To force the onboarding flow for *all* users (including existing ones), set `const FORCE_ONBOARDING = true;` on line 69.
        *   Set to `false` for production behavior (skip onboarding if profile exists).
    *   **Logic:**
        *   If `FORCE_ONBOARDING` or `!profile` or `profile.age === null` -> Redirects to `/profile-setup` (New User Flow).
        *   Otherwise -> Redirects to `/` (Home).

## 5. Profile Setup - Step 1: Basic Info
*   **URL:** `/profile-setup`
*   **Codebase:** `src/app/profile-setup/page.tsx`
*   **Visuals:** "25%" Progress bar, clean form inputs with specific styling.
*   **Behavior:** Collects Name, Age, Location, Bio.

## 6. Profile Setup - Step 2: Signals
*   **URL:** `/profile-setup/signals`
*   **Codebase:** `src/app/profile-setup/signals/page.tsx`
*   **Visuals:** "50%" Progress bar, platform connection cards (YouTube, TikTok, etc.).
*   **Behavior:** Connects external accounts.

## 7. Profile Setup - Step 3: Building (Processing)
*   **URL:** `/profile-setup/building`
*   **Codebase:** `src/app/profile-setup/building/page.tsx`
*   **Visuals:** "100%" Progress bar, spinner/animation.
*   **Behavior:** Syncs data in background, redirects to Wrapped upon completion.

## 8. Profile Setup - Step 4: Wrapped (Presentation)
*   **URL:** `/profile-setup/wrapped`
*   **Codebase:** `src/app/profile-setup/wrapped/page.tsx`
*   **Visuals:** "Spotify Wrapped" style slide deck with auto-advancing slides and animations.
*   **Action:** Final slide "Enter Your Network" redirects to `/`.

## 9. Main Application (Home / Digital DNA)
*   **URL:** `/` and `/digital-dna`
*   **Codebase:** `src/app/page.tsx`, `src/app/digital-dna/page.tsx`
*   **Visuals:**
    *   **Home:** 2D Network Graph of connections.
    *   **Digital DNA:** Interactive 3D Force Graph of user interests (Nodes & Links).
*   **Implementation:** `react-force-graph-3d`, `three.js`, `three-spritetext`.

## 10. Edit Profile
*   **URL:** `/edit-profile`
*   **Codebase:** `src/app/edit-profile/page.tsx`
*   **Visuals:** Centered "small window" UI, constrained scrolling within the modal.
*   **Fixes:** Resolved issue where profile images appeared inverted in dark mode.

---

# Completed Tasks & Fixes

### UI Overhaul
*   [x] **Landing Page:** Redesigned with new assets and scaling.
*   [x] **Onboarding:** Implemented Figma-exact card designs with complex gradients.
*   [x] **Profile Setup:** Updated styling to match "UnboardingUI" theme.
*   [x] **Digital DNA:** Integrated 3D graph visualization.

### Bug Fixes
*   [x] **Inverted Images:** Fixed global CSS that was double-inverting images in dark mode (`src/app/globals.css`, `src/components/Menu.tsx`).
*   [x] **Edit Profile Scroll:** Fixed "white box" and page scrolling issues by containing scroll within the modal window.
*   [x] **Landing Page Black Screen:** Fixed issue where logging out left the theme in an inverted state; forced reset on Landing page mount.
*   [x] **Build Errors:** Resolved missing dependency errors for UI components (`@radix-ui`, `lucide-react`, etc.) and TypeScript errors in `ForceGraph3D`.

### Dependencies Added
*   `lucide-react`
*   `recharts`
*   `embla-carousel-react`
*   `react-force-graph-3d`, `three`, `three-spritetext`
*   `@radix-ui/*` (multiple primitives)
*   `clsx`, `tailwind-merge`
