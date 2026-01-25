# Onboarding, Compatibility, and Networks

This doc describes how onboarding feeds into **network proximity / overlap** (compatibility), where we need to collect **networks**, and where **Dice** and **compatibility scoring** fit in. It also outlines **overlapping signals** and **higher-order network overlap** (e.g. Google–Meta, indirect ties) for future work.

---

## 1. Onboarding and Compatibility

### What Compatibility (Overlap) Needs

The **Network Proximity** overlap equation used for intros and graph distance is:

```
Overlap = 0.55×NetworkScore + 0.30×MutualScore + 0.15×InterestScore
InterestScore = 0.35×embedding + 0.65×Dice
```

- **NetworkScore**: shared networks (school, company, city, etc.) from `user_profile_extras`
- **MutualScore**: degree-normalized mutual friends from `user_connections`
- **InterestScore**: DNA v2 `composite_vector` cosine (embedding) + **Dice on `profiles.interests`**

Without **networks**, we cannot compute a meaningful overlap (we fall back to `0.15×InterestScore` only and `hasSocialProximity = false`). Without **interests**, Dice is 0. Without **DNA v2**, the embedding term is 0.

### Where This Runs in Onboarding (Wrapped)

In `src/app/profile-setup/wrapped/page.tsx`, inside `processUserDataWithYouTubeProgress`:

1. **YouTube sync** → subscriptions + liked videos in DB.
2. **derive_interests** (via `YouTubeService.deriveInterests`) → `profiles.interests` and `hierarchical_interests`.  
   - **Dice** uses `profiles.interests`. Once derive_interests has run, Dice can be computed in `calculate-network-proximity`.
3. **compute-dna-v2** (via `/api/compute-dna-v2`) → `digital_dna_v2.composite_vector`.  
   - DNA matching (`user_matches`, `match_profiles_v2`) is handled elsewhere; we don’t need to change that for overlap.

**Gap: networks.** We do **not** currently collect `user_profile_extras` (networks, college, high_school, company, city) during onboarding. Without that, `NetworkScore` is 0 and `hasSocialProximity` is false for almost everyone.

### Comments in Code

In `wrapped/page.tsx` we added:

- **Before Step 2 (derive_interests):**  
  - We need to collect **networks** (user_profile_extras) before we can compute overlap.  
  - **Dice** depends on `profiles.interests`; derive_interests populates that. To “score Dice” at signup we only need interests. Optionally, a post-signup job could precompute Dice/overlap vs. candidates.
- **After DNA v2 is ready:**  
  - **Compatibility/overlap** would run here once we have: (1) networks, (2) interests, (3) DNA v2. Today overlap is computed on-demand in `calculate-network-proximity` and stored in `user_overlap_scores`. A batch or cron could backfill for new users.

---

## 2. Collecting Networks

### What to Collect

Store in `user_profile_extras`:

- `networks` (TEXT[]): e.g. "TheNetwork", "YC W24", "Perkins Coie Fellows"
- `college`, `high_school`, `company` (TEXT)
- Optionally: city (or a `city` in `networks`)

### Where to Put It in the Flow

- **Option A:** New slide(s) in the wrapped flow (e.g. after interests/archetypes, before “Ready to meet…”).
- **Option B:** A separate step after wrapped (e.g. “Tell us where you’re from”) before the main app.
- **Option C:** Edit Profile only; no onboarding step. Overlap stays network-sparse until the user fills it.

Recommendation: at least **college** and **company** (and optionally **city**) in onboarding, so overlap and “you both work at X” / “you both went to Y” can work early.

---

## 3. Dice and “Scoring” at Signup

**Dice** in `calculate-network-proximity`:

```
Dice = 2 × |A ∩ B| / (|A| + |B|)
```

on `profiles.interests` (normalized, with fuzzy matching). It does **not** require a separate “Dice score” table; it’s computed when we run `calculate-network-proximity` for a pair.

At signup we need:

1. **`profiles.interests`** – populated by **derive_interests** after YouTube sync. That’s already in place.
2. **When to run overlap (and thus Dice):**  
   - **On-demand:** when we need an intro or graph distance (e.g. `generate-suggestion-reason`, `loadAriaSuggestions` using `user_overlap_scores`).  
   - **At signup (optional):** a job that, after derive_interests + compute-dna-v2 (+ networks if we have them), calls `calculate-network-proximity` for the new user vs. some candidate set and writes into `user_overlap_scores`. That would “score” Dice (and the whole overlap) for those pairs at signup.

A practical “score the Dice” at signup:

- **Minimum:** ensure `derive_interests` has run so `profiles.interests` exists. (Done.)
- **Optional:** add a post-onboarding job/cron that backfills `user_overlap_scores` for the new user. That job would live after DNA v2 (and ideally after a network-collection step) in the onboarding pipeline or in a cron.

---

## 4. Overlapping Signals and “4-Dimensional” Networks

### Direct vs. Indirect Overlap

Today we only treat **exact shared networks** (same school, same company, same city). In practice:

- **Google vs. Meta:** no direct shared network, but same “industry/cohort” (big tech, similar bar, similar professional layer).  
- **Google vs. Perkins Coie Fellow:** no direct overlap, but “you both had to get into selective systems” or “you move in adjacent professional/elite circles.”

That’s what we’re calling **overlapping signals** or **higher-order / 4-dimensional network overlap**: not just “same node,” but “same kind of edge” or “same meta-network.”

### Why It Matters

- Richer intros: e.g. “You’re both in big tech” or “You both went through similarly selective paths.”
- Better cold matches when exact network overlap is missing.
- Closer to how people actually reason: “person at Meta” and “person at Google” often feel closer than “person at Google” and “person at Random Startup” if we only look at company name.

### Possible Approaches

#### A. Meta-Network / Cluster Labels

- Define **meta-networks**: e.g. `big_tech`, `top_schools`, `elite_fellowships`, `nyc_tech`, `finance`.
- For each `user_profile_extras` entry (company, school, etc.), classify into one or more meta-networks (rules, LLM, or curated mapping).
- **Overlap:** same meta-network counts as a weaker tie than exact match, e.g. add a `MetaOverlap` term with a lower weight.

#### B. Embeddings of Network Names

- Embed company/school/network names (or “company + industry” text).
- **Similarity:** cosine between user A’s “network footprint” and user B’s.  
- High similarity → “adjacent” even if no exact match. Needs a clear notion of “network footprint” (e.g. one vector per user from all their network strings).

#### C. Graph / Bipartite Overlap

- **Bipartite:** users ↔ networks.  
- **Overlap:** not just “do they share a network?” but “do they share neighbors in the user–network graph?” (e.g. Jaccard on network neighbors, or random-walk scores).
- Captures “you’re one hop from the same worlds” even without a direct common node.

#### D. LLM-Based “Why You’re Adjacent”

- Input: both users’ networks (and optionally interests).  
- Ask the model: “Do these two move in overlapping professional/social worlds? If so, in one sentence, why?”  
- Use that as an extra **text** signal for the intro (not necessarily a numeric score). Can be combined with A–C.

### Infrastructure

- **Data:**  
  - `user_profile_extras` (and any new “meta-network” or “network embedding” tables).  
  - Optionally: a **user–network** graph (e.g. in Postgres, or in a graph DB if we scale).
- **Compute:**  
  - **Synchronous:** too heavy for all pairs; use only for the pairs we’re about to show (e.g. in `generate-suggestion-reason` or when building a suggestion).  
  - **Async:** batch or cron that precomputes “meta-overlap” or “network-embedding similarity” and stores in something like `user_overlap_scores` or a new `user_meta_overlap` table.  
- **APIs:**  
  - `calculate-network-proximity` (or a variant) could take an optional flag to include “meta-overlap” or “4D overlap” when we implement it.  
  - New helpers: e.g. `classify_meta_network(company|school|...)`, `compute_network_embedding(user_id)`.

### Practical Next Steps

1. **Short term:**  
   - Add **network collection** in onboarding.  
   - Keep overlap as today (exact networks + mutuals + InterestScore).  
   - Use that for network-first intros.

2. **Next:**  
   - Introduce **meta-networks** (e.g. big_tech, top_schools) with a manual or rule-based mapping.  
   - Add a **MetaOverlap** (or similar) term with a small weight into the overlap equation, and document it in `NETWORK_PROXIMITY_SYSTEM_DESIGN.md`.

3. **Later:**  
   - Try **network embeddings** or **graph overlap** for a “4D” overlap term.  
   - Consider **LLM “adjacency”** as a copy signal for intros, not as a primary score.

---

## 5. References

- **Overlap equation and table:** `thenetworkwebapp/docs/NETWORK_PROXIMITY_SYSTEM_DESIGN.md`  
- **proximity implementation:** `supabase/functions/calculate-network-proximity/`  
- **Sophia-style intros:** `companalysis.md`  
- **Dice in code:** `calculate-network-proximity` → `getInterestScore` → `calculateDiceCoefficient`  
- **Suggestions and overlap:** `thenetworkwebapp/suggestedpeoplegraph.md`
