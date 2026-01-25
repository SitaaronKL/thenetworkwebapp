# Suggested People Graph Feature

This document explains how the "Suggested People on Graph" feature works, where to find the suggestion algorithm, and how to build on top of it.

## Overview

Instead of showing suggested profiles in a side panel/pill menu, suggestions now appear as **floating nodes on the network graph**. These nodes are connected to the user with **invisible force links** - meaning:

- No visible lines between user and suggestions
- D3 force simulation applies force through these links
- When the user drags around, suggestions follow naturally
- Suggestions are positioned based on similarity score (more similar = closer, but ALWAYS farther than friends)

---

## Distance Configuration (Important!)

Suggestions are **always farther from the user than actual friends**. The distance is controlled by configurable constants at the top of `NetworkGalaxy.tsx`:

```typescript
// ============================================================================
// SUGGESTION DISTANCE CONFIGURATION
// ============================================================================

// Base distance for suggestions (MUST be greater than FRIEND_LINK_DISTANCE)
const SUGGESTION_BASE_DISTANCE = 650;        // Desktop
const SUGGESTION_BASE_DISTANCE_MOBILE = 450; // Mobile

// Additional distance range based on similarity
// Lower similarity = pushed further by this amount
const SUGGESTION_SIMILARITY_RANGE = 400;        // Desktop
const SUGGESTION_SIMILARITY_RANGE_MOBILE = 300; // Mobile

// Friend link distance (for reference)
const FRIEND_LINK_DISTANCE = 450;        // Desktop
const FRIEND_LINK_DISTANCE_MOBILE = 350; // Mobile
```

### Distance Formula

```
suggestionDistance = BASE_DISTANCE + (1 - similarity) * SIMILARITY_RANGE
```

| Similarity | Desktop Distance | Mobile Distance |
|------------|------------------|-----------------|
| 1.0 (100%) | 650px            | 450px           |
| 0.8 (80%)  | 730px            | 510px           |
| 0.5 (50%)  | 850px            | 600px           |
| 0.2 (20%)  | 970px            | 690px           |
| 0.0 (0%)   | 1050px           | 750px           |

**Friends are always at ~450px (desktop) / ~350px (mobile) - much closer than any suggestion.**

### Overlap Score (Network Proximity) — Used for Suggestion Distance

Suggestion **distance uses the Overlap score** when available. Overlap combines **networks**, **mutual friends**, and **interest embeddings** (see `thenetworkwebapp/docs/NETWORK_PROXIMITY_SYSTEM_DESIGN.md` and `supabase/functions/calculate-network-proximity/`).

**Final Overlap formula:**

```
Overlap = (0.55 × NetworkScore) + (0.30 × MutualScore) + (0.15 × InterestScore)
```

- **NetworkScore** = `1 − exp(−Σ w(n))` — shared networks (school, company, city, etc.) with type weights and saturation
- **MutualScore** = `m / sqrt(deg(u) × deg(v))` — degree-normalized mutual friends, clamped to [0,1]
- **InterestScore** = `(0.35 × embeddingSimilarity) + (0.65 × dice)` — DNA v2 `composite_vector` cosine + Dice on `profiles.interests`

**Storage:** `user_overlap_scores` (see table below). Filled by the `calculate-network-proximity` Edge Function on each compute. For suggestions, `loadAriaSuggestions` reads from this table and uses `overlap` as the value passed into `calculateSuggestionDistance` (replacing pure DNA similarity when present). Fallback: `match_profiles_v2.similarity` when no row exists.

### Exported Distance Function

You can use this function anywhere in your code:

```typescript
import { calculateSuggestionDistance } from '@/components/NetworkGalaxy';

// Calculate distance for a suggestion with 75% similarity
const distance = calculateSuggestionDistance(0.75, false); // Desktop
const mobileDistance = calculateSuggestionDistance(0.75, true); // Mobile
```

---

## Architecture

### Key Files

| File | Purpose |
|------|---------|
| `src/types/network.ts` | Type definitions for `NetworkPerson` including suggestion properties |
| `src/components/NetworkGalaxy.tsx` | D3 force-directed graph component that renders nodes and links |
| `src/app/network/page.tsx` | Main network page, loads suggestions and passes them to the graph |

---

## How Suggestions Flow

```
1. User logs in → loadAriaSuggestions() called
                         ↓
2. Suggestion algorithm: match_profiles_v2 (or match_profiles) → candidate IDs
                         ↓
3. Fetch user_overlap_scores (user_id, candidate IDs) for overlap
                         ↓
4. For each candidate: similarity for distance = overlap ?? match.similarity
                         ↓
5. Results stored in `suggestions` state (reason, similarity/overlap)
                         ↓
6. `suggestionPeople` useMemo converts to NetworkPerson[] (similarity used for distance)
                         ↓
7. Passed to NetworkGalaxy as `suggestionPeople` prop
                         ↓
8. NetworkGalaxy adds nodes + invisible links; distance = calculateSuggestionDistance(similarity)
```

---

## Suggestion Algorithm Location

### Where to find it: `src/app/network/page.tsx`

Look for the `loadAriaSuggestions` function (around line 920). Here's the flow:

```typescript
const loadAriaSuggestions = useCallback(async () => {
  // 1. Count user's connections, check suggestion_interactions
  // 2. Get user's profile and DNA v2 (or v1) vector
  // 3. match_profiles_v2 (or match_profiles) → candidate IDs + match.similarity
  // 4. Filter out users already in network
  // 5. Fetch user_overlap_scores (user_id, candidate IDs) for overlap
  // 6. For each candidate: similarity = overlap ?? match.similarity (for graph distance)
  // 7. Generate compelling reasons via generate-suggestion-reason
  // 8. Return formatted suggestions with similarity (overlap when available)
}, [user]);
```

### Key Database Tables

| Table | Purpose |
|-------|---------|
| `user_overlap_scores` | **Overlap (0–1) from the Network Proximity equation**; used for suggestion graph distance. Populated by `calculate-network-proximity`. |
| `user_matches` | Pre-computed DNA similarity; used when `user_overlap_scores` has no row |
| `profiles` | User profile data (name, avatar, bio) |
| `digital_dna_v2` | User interest vectors (composite_vector) for InterestScore |
| `user_compatibility_descriptions` | Cached "why you'd connect" descriptions |
| `suggestion_interactions` | Tracks which suggestions user has seen/interacted with |

### `user_overlap_scores` table

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Viewer (PK) |
| `other_user_id` | UUID | Other user (PK) |
| `overlap` | FLOAT | 0–1, final score. `0.55×NetworkScore + 0.30×MutualScore + 0.15×InterestScore` |
| `has_social_proximity` | BOOLEAN | True when at least one shared network |
| `proximity_level` | TEXT | `very_close` \| `close` \| `nearby` \| `distant` \| `far` |
| `components` | JSONB | `{ networkScore, mutualScore, interestScore }` (optional) |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Migration:** `supabase/migrations/20260124_create_user_overlap_scores.sql`. The `calculate-network-proximity` Edge Function upserts both `(user_id, other_user_id)` and `(other_user_id, user_id)` on each run.

### Suggestion Format

Each suggestion object has this structure:

```typescript
{
  id: string;           // User ID
  name: string;         // First name
  reason: string;       // "Why you'd connect" text
  avatar: string;       // Profile picture URL
  similarity: number;   // 0-1, used for graph distance. From user_overlap_scores.overlap when present, else match_profiles_v2.similarity
}
```

---

## NetworkPerson Type for Suggestions

When converted for the graph, suggestions become `NetworkPerson` objects with these properties:

```typescript
interface NetworkPerson {
  // ... standard properties ...
  
  // Suggestion-specific properties
  isSuggestionNode?: boolean;    // true for suggestions
  similarity?: number;           // 0-1, determines link distance
  suggestionReason?: string;     // Why this person is suggested
}
```

---

## How Graph Rendering Works

### In `NetworkGalaxy.tsx`

#### 1. Adding Suggestion Nodes (in `graphData` useMemo)

```typescript
// Around line 195
if (suggestionPeople.length > 0) {
  suggestionPeople.forEach((sp, index) => {
    // Use the configurable distance function
    const similarity = sp.similarity || 0.5;
    const distance = calculateSuggestionDistance(similarity, isMobileRef.current);

    // Spread in arc on one side of the graph
    const arcSpread = Math.PI * 0.6; // 108 degrees
    const startAngle = -Math.PI * 0.3; // Top-right area
    
    nodes.push({
      id: sp.id,
      name: sp.name,
      r: 32,
      isSuggestionNode: true,
      similarity: sp.similarity,
      // ... other properties
    });
  });
}
```

#### 2. Adding Invisible Links with Similarity

```typescript
// Around line 350
if (suggestionPeople.length > 0) {
  suggestionPeople.forEach(sp => {
    links.push({
      source: currentUserId,
      target: sp.id,
      isBranchLink: false,
      isSuggestionLink: true,  // Marks as invisible
      similarity: sp.similarity || 0.5  // Used for dynamic distance
    });
  });
}
```

#### 3. Dynamic Link Distance in Force Simulation

```typescript
// Around line 430
simulation.force('link', d3.forceLink()
  .distance((d) => {
    if (d.isSuggestionLink) {
      // Dynamic distance based on similarity
      return calculateSuggestionDistance(d.similarity, isMobile);
    }
    return FRIEND_LINK_DISTANCE; // Friends use fixed distance
  })
  .strength((d) => {
    // Stronger force for suggestions so they follow during drag
    if (d.isSuggestionLink) return 0.08;
    return 0.05;
  })
);
```

#### 4. Rendering Invisible Links

```typescript
// Around line 650
link.join(
  (enter) => enter.append('line')
    .attr('stroke-opacity', (d) => d.isSuggestionLink ? 0 : 0.85)
    .attr('stroke-width', (d) => d.isSuggestionLink ? 0 : 1)
)
```

#### 5. Click Handler for Suggestions

```typescript
// Around line 695
if (d.isSuggestionNode) {
  // Opens profile modal when clicked
  if (person && currentOnPersonClick) {
    currentOnPersonClick(person);
  }
}
```

---

## How to Update the Suggestion Algorithm

### Option 1: Change Distance Parameters

Edit the constants at the top of `NetworkGalaxy.tsx`:

```typescript
// Make suggestions even farther away
const SUGGESTION_BASE_DISTANCE = 800;  // Was 650
const SUGGESTION_SIMILARITY_RANGE = 500;  // Was 400
```

### Option 2: Modify the Similarity Query

In `loadAriaSuggestions()` (around line 920 in `network/page.tsx`):

```typescript
// Change the similarity query
const { data: matches } = await supabase
  .from('user_matches')
  .select('matched_user_id, similarity')
  .eq('user_id', user.id)
  .gt('similarity', 0.3)  // Only show > 30% similar
  .order('similarity', { ascending: false })
  .limit(5);  // Show more suggestions
```

### Option 3: Add New Scoring Factors

```typescript
// Weight by multiple factors
const scoredMatches = matches.map(m => ({
  ...m,
  adjustedSimilarity: 
    m.similarity * 0.6 +          // Base similarity
    sharedInterestBonus * 0.2 +   // Common interests
    mutualFriendsBonus * 0.2      // Mutual connections
}));
```

### Option 4: Change the Visual Position Arc

```typescript
// In NetworkGalaxy.tsx, around line 205
const arcSpread = Math.PI * 0.8;  // Wider arc (was 0.6)
const startAngle = Math.PI * 0.5; // Different starting position
```

---

## How to Customize the Visual Appearance

### Node Size

In `NetworkGalaxy.tsx`, around line 210:
```typescript
r: 32, // Change radius for suggestion nodes
```

### Arc Spread (Where Suggestions Appear)

```typescript
const arcSpread = Math.PI * 0.6;  // Width of arc (radians)
const startAngle = -Math.PI * 0.3; // Starting position (top-right)
```

### Node Styling

To add visual distinction, modify the circle styling in the node enter/update functions (around line 510).

---

## Drag Behavior

When the user drags any node:

1. **All other nodes are unfrozen** (fx/fy set to null)
2. The D3 simulation restarts with `alpha(0.3)` and `alphaTarget(0.3)`
3. The invisible suggestion links apply force
4. All connected nodes follow at their respective distances
5. More similar suggestions stay closer (but still far from friends)

### Key Implementation Details

The drag handler explicitly unfreezes all nodes when dragging starts:

```typescript
function dragstarted(event, d) {
    if (!event.active) {
        // Unfreeze ALL other nodes so they respond to forces
        sim.nodes().forEach((n) => {
            if (n.id !== d.id) {
                n.fx = null;
                n.fy = null;
            }
        });
        // Set both alpha AND alphaTarget to ensure simulation has energy
        sim.alpha(0.3).alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
}
```

### Why Nodes Might Have Been Frozen

When async data loads (like suggestions), nodes are temporarily frozen during the settling period. The timeouts use `simulation.nodes()` to ensure unfreezing affects the current nodes, not stale references.

---

## Organic Layout (Random Positioning)

The graph uses **random initial positions** for a natural, organic look (like Obsidian's graph):

- **Friends**: Random angle, random distance within 300-600px range
- **Suggestions**: Random angle, distance based on similarity (±15% variation)
- **Physics**: Simulation runs for 1.5 seconds to let nodes settle naturally

This means the layout is **different each refresh**, but always looks natural rather than geometric.

### Customizing the Layout Feel

In `NetworkGalaxy.tsx`, around line 165:

```typescript
// Friend positioning
const minRadius = isMobileRef.current ? 200 : 300;  // Minimum distance
const maxRadius = isMobileRef.current ? 450 : 600;  // Maximum distance

// Suggestion positioning (around line 245)
const distanceVariation = baseDistance * 0.15;  // ±15% randomness
```

### Physics Settling Time

On first load, the simulation runs for 1.5 seconds:
```typescript
simulation.alpha(0.8).alphaDecay(0.02).restart();
// ... stops after 1500ms
```

Increase these values for more settling, decrease for faster load.

---

## Testing

1. Create a new account or use one with < 3 connections
2. Complete onboarding so you have a `digital_dna_v2` vector
3. Navigate to `/network`
4. **Nodes should appear in natural, random positions (not a cross/grid)**
5. Suggestions should be farther from you than friends
6. Drag yourself around - all nodes should follow
7. Refresh - layout should be different but still natural

---

## Troubleshooting

### Suggestions don't appear
- Check that `loadAriaSuggestions` is returning data
- Verify `user_matches` table has entries for the user
- Check browser console for errors

### Suggestions are too close/far
- Adjust `SUGGESTION_BASE_DISTANCE` and `SUGGESTION_SIMILARITY_RANGE` constants

### Nodes don't follow during drag (frozen nodes)
- The drag handler now explicitly unfreezes all nodes when dragging starts
- If nodes are still frozen, check that timeouts are using `simulation.nodes()` not stale references
- Ensure `alpha(0.3)` is set (not just `alphaTarget`) to give simulation immediate energy

### Nodes only unfreeze after clicking
- This was fixed by using `simulation.nodes()` in timeout callbacks instead of captured `nextNodes`
- The `dragstarted` handler now unfreezes all other nodes before restarting simulation

### Node freezes mid-drag
- Fixed with `isDraggingRef` - tracks when user is dragging
- All `setTimeout` callbacks check `if (!isDraggingRef.current)` before stopping simulation
- This prevents timeouts from interrupting an active drag

### Suggestions pop in after graph loads
- Fixed by waiting for both `isLoadingNetwork` AND `isLoadingSuggestions` before showing graph
- In `network/page.tsx`: `if (loading || isLoadingNetwork || isLoadingSuggestions) { return <Loading /> }`

---

## Backend: Changing Who Gets Suggested

This is the key section if you want to change the **suggestion algorithm** (who appears as suggestions).

### Where Suggestions Come From

The suggestions are determined by the `user_matches` table in Supabase. This table contains pre-computed similarity scores between users.

```sql
-- user_matches table structure
user_id         UUID    -- The user viewing the network
matched_user_id UUID    -- The suggested person
similarity      FLOAT   -- 0.0 to 1.0 (higher = more similar)
```

### How to Change the Algorithm

#### Option A: Modify the Query (Frontend)

In `src/app/network/page.tsx`, find `loadAriaSuggestions` (~line 920):

```typescript
// Current: Gets top matches ordered by similarity
const { data: matches } = await supabase
  .from('user_matches')
  .select('matched_user_id, similarity')
  .eq('user_id', user.id)
  .order('similarity', { ascending: false })
  .limit(3);

// YOUR CHANGES:
// - Add minimum similarity threshold: .gt('similarity', 0.4)
// - Change limit: .limit(5)
// - Filter by other criteria
```

#### Option B: Change How Similarity is Calculated (Backend)

The `user_matches` table is populated by a background job or function that:
1. Gets each user's `digital_dna_v2` vector (interest embeddings)
2. Computes cosine similarity between users
3. Stores results in `user_matches`

To change the algorithm:
1. Find where `user_matches` is populated (likely a Supabase Edge Function or cron job)
2. Modify the similarity calculation
3. Re-run to update the table

#### Option C: Add New Scoring Factors

Combine multiple signals:

```typescript
// In loadAriaSuggestions, after fetching matches:
const enhancedMatches = matches.map(m => {
  let score = m.similarity;
  
  // Boost for mutual friends
  if (hasMutualFriends(user.id, m.matched_user_id)) {
    score += 0.1;
  }
  
  // Boost for same school/company
  if (sameSchool(user.id, m.matched_user_id)) {
    score += 0.15;
  }
  
  return { ...m, adjustedSimilarity: Math.min(1, score) };
});

// Sort by adjusted score
enhancedMatches.sort((a, b) => b.adjustedSimilarity - a.adjustedSimilarity);
```

### Key Database Tables to Know

| Table | What It Does | How to Modify |
|-------|--------------|---------------|
| `user_overlap_scores` | Overlap (0–1) from Network Proximity equation; used for suggestion distance | Populated by `calculate-network-proximity`; migration: `20260124_create_user_overlap_scores.sql` |
| `user_matches` | Pre-computed DNA similarity | Update the job that populates this |
| `digital_dna_v2` | User interest vectors (embeddings) | Generated during onboarding |
| `profiles` | User profile data | Standard profile updates |
| `suggestion_interactions` | Tracks seen/skipped suggestions | Used to filter already-seen |
| `user_compatibility_descriptions` | Cached "why you'd connect" text | Generated by edge function |

### The Similarity Score's Effect

The `similarity` value (0-1) directly affects:
1. **Who appears** - Higher similarity = more likely to be shown
2. **Distance on graph** - Higher similarity = closer to user (but still far)

```
similarity 0.9 → distance ~700px (closest suggestion)
similarity 0.5 → distance ~850px
similarity 0.1 → distance ~1000px (furthest)
```

### Edge Function: generate-suggestion-reason

This function creates the "why you'd connect" text for each suggestion:

```typescript
// Called for each suggestion
const { data } = await supabase.functions.invoke('generate-suggestion-reason', {
  body: { userAId: currentUser.id, userBId: suggestion.id }
});
// Returns: { reason: "You both love hiking and indie music..." }
```

To change the reason generation, modify the edge function in `supabase/functions/generate-suggestion-reason/`.

---

## Summary for Backend Developer

**To change WHO gets suggested:**
1. Modify `user_matches` population logic (similarity calculation)
2. OR modify the query in `loadAriaSuggestions()` (~line 920 in `network/page.tsx`)

**To change WHY text:**
1. Modify `generate-suggestion-reason` edge function

**To change visual distance:**
1. Modify constants at top of `NetworkGalaxy.tsx`

---

## Key Files Quick Reference

| What You Want to Change | File to Edit |
|------------------------|--------------|
| Who gets suggested | `src/app/network/page.tsx` → `loadAriaSuggestions()` |
| Overlap / proximity equation | `supabase/functions/calculate-network-proximity/`; design: `docs/NETWORK_PROXIMITY_SYSTEM_DESIGN.md` |
| `user_overlap_scores` table | `supabase/migrations/20260124_create_user_overlap_scores.sql` |
| "Why you'd connect" text | `supabase/functions/generate-suggestion-reason/` |
| Visual distance from user | `src/components/NetworkGalaxy.tsx` → top constants |
| Node appearance/styling | `src/components/NetworkGalaxy.tsx` → node rendering |
| Graph physics/behavior | `src/components/NetworkGalaxy.tsx` → simulation setup |
