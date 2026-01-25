# Social Closeness, Network Embeddings, and the Social / Interest Toggle

This spec describes the **rewritten proximity system**: a **social-closeness-only** mode and a **social + interest** mode, with a **UI toggle**, **network vector embeddings** for a "social coordinate plane," and the **backend architecture** needed to implement and test it once networks are collected in onboarding.

---

## 1. The Gate (Unchanged)

Before any equation runs:

```
IF shared_networks == 0:
    result = 0   (do not render / do not score)
ELSE:
    PROCEED to the equation
```

- **No** shared networks ⇒ the final score is **0**, regardless of mutuals or interests.
- **At least one** shared network ⇒ we compute **Social Closeness** (and optionally **Social + Interest**).
- This stays true for both modes of the toggle.

---

## 2. Two Modes and the Toggle

There is a **toggle** (e.g. at the top of the network view or the suggestions surface):

| Toggle position | Mode | Label (example) | What it uses |
|-----------------|------|------------------|--------------|
| **Left (default)** | Social only | "Who are you **socially close** to?" | Networks + mutuals only. **No interests.** |
| **Right** | Social + Interest | "Socially close **and** similar interests" | Networks + mutuals **plus** interest similarity (DNA, Dice). |

Core idea: **Interest does not mean you are socially close.** Social closeness is only: shared networks and mutual friends. The right-hand mode adds interest similarity on top of that.

---

## 3. Social Closeness (Toggle Left)

**Definition:** How close two people are in **social space** — same schools, companies, cities, communities, and mutual friends. No interest component.

### 3.1 Formula (Social Only)

```
SocialCloseness = (0.65 × NetworkScore) + (0.35 × MutualScore)
```

- **NetworkScore** = `1 − exp(−Σ w(n))` — weighted, saturated overlap of **shared** networks (same as today).
- **MutualScore** = `m / sqrt(deg(u) × deg(v))` clamped to [0, 1].

Weights (e.g. 65/35) are tunable; the important part is: **only** networks and mutuals.

### 3.2 Ordering / Distance

- **More shared networks** ⇒ closer (e.g. 5 shared > 4 shared, all else equal).
- **More mutuals** ⇒ closer (e.g. 5 networks + 20 mutuals > 5 networks + 10 mutuals).
- This ordering is what the graph and lists use when the toggle is **left**.

---

## 4. Network Vector Embeddings and the "Social Coordinate Plane"

Today we only use **exact** shared networks (same string). To support a richer **social space** and future "network overlap graph," we add **network vector embeddings**.

### 4.1 What We Store

- When a user has **networks** (from `user_profile_extras`: `networks`, `college`, `high_school`, `company`, city, etc.):
  - We **vector embed** each network string (or a combined representation of all of them) using an embedding model.
  - **Dimension: 3072** (same as `text-embedding-3-large` / DNA v2) so we can reuse pgvector and infra.
  - We store a **per-user “social position” vector** derived from their networks.

### 4.2 Where to Store

- **Option A — New table: `user_network_embeddings`**
  - `user_id` (PK)
  - `networks_vector` VECTOR(3072) — e.g. mean (or weighted sum) of embeddings of that user’s network strings.
  - `updated_at`
  - Populated/updated when `user_profile_extras` (networks, college, high_school, company, etc.) changes.

- **Option B — Column on `user_profile_extras`**
  - `networks_vector` VECTOR(3072).
  - Same semantics: one vector per user representing their networks in embedding space.

### 4.3 How We Use It

- **Social coordinate plane:** The vector defines the user’s position in **social space** (as opposed to `digital_dna_v2.composite_vector`, which is **interest space**).
- **Distance in social space:** Cosine similarity (or cosine distance) between two users’ `networks_vector` ⇒ “how close they are in social/network space” even when they don’t share an **exact** network (e.g. Google vs. Meta, or similar schools).
- **Relation to the current equation:**
  - **V1:** We can keep **SocialCloseness** as `0.65×NetworkScore + 0.35×MutualScore` (exact overlaps only) and use `networks_vector` only for:
    - graph layout (place nodes in 2D by reducing 3072-D social vectors), or
    - a **separate** “social similarity” signal for the right-hand toggle or for explanations.
  - **V2:** We can define **NetworkScore** (or an extra term) using cosine similarity of `networks_vector` in addition to (or instead of) exact-match overlap. The spec stays valid either way; the doc below assumes we have `networks_vector` available for both layout and, later, for an extended equation.

### 4.4 Embedding Model and Pipeline

- **Model:** e.g. `text-embedding-3-large` (3072 dim), to align with DNA and existing pgvector.
- **Input per user:**
  - Concatenate or list: `[networks]`, `college`, `high_school`, `company`, `city` (or a single text like `"Networks: A, B. College: X. Company: Y."`).
- **Output:** One vector per user. Aggregation if multiple texts: mean of embeddings, or embed the single concatenated string.
- **When to compute:** On insert/update of `user_profile_extras` (or when networks are first filled in onboarding). An Edge Function or DB trigger can call an `embed` helper and write into `user_network_embeddings` (or `user_profile_extras.networks_vector`).

---

## 5. Social + Interest (Toggle Right)

When the toggle is **right**, we still require **at least one shared network** (gate). On top of that:

- We take **SocialCloseness** (networks + mutuals only) as above.
- We add **InterestScore** (DNA v2 cosine, Dice on `profiles.interests`, or the existing blended `0.35×embedding + 0.65×Dice`).
- The **combined** score is used to order/filter: “socially close **and** similar interests.”

### 5.1 Possible Formulas

**Option A — Weighted blend (recommended for a single “score”):**
```
Combined = (0.70 × SocialCloseness) + (0.30 × InterestScore)
```
Social remains dominant; interest adds a nudge.

**Option B — Multiplicative:**
```
Combined = SocialCloseness × (0.7 + 0.3 × InterestScore)
```
Interest scales SocialCloseness slightly up or down.

**Option C — Filter then sort:**
- Filter: `SocialCloseness >= threshold` (e.g. 0.2).
- Sort by: `InterestScore` (or by `Combined` if we define it).
- Ensures we only show socially close people, then emphasize interest alignment.

The exact formula is tunable; the spec only requires: **gate (1+ shared network) + SocialCloseness + InterestScore** when the toggle is right.

---

## 6. Rewriting the Equation Into Two Functions

We need **two computable outputs** (and corresponding backend functions) that the toggle and the UI can call.

### 6.1 Function 1: `computeSocialCloseness(userAId, userBId)`

**Inputs:** `userAId`, `userBId`.

**Steps:**
1. **Gate:** Compute `shared_networks` (from `user_profile_extras`: exact overlap of networks, college, high_school, company, city, etc.).  
   - If `shared_networks.length === 0` → return `{ score: 0, hasSocialProximity: false }` (or equivalent).
2. **NetworkScore** = `1 − exp(−Σ w(n))` over shared networks only (same as today).
3. **MutualScore** = `m / sqrt(deg(u) × deg(v))` clamped to [0, 1].
4. **SocialCloseness** = `0.65 × NetworkScore + 0.35 × MutualScore` (weights configurable).

**Outputs (example):**
```ts
{
  hasSocialProximity: true,
  socialCloseness: number,     // in [0,1]
  networkScore: number,
  mutualScore: number,
  sharedNetworks: Array<{ name, type }>,
  mutualFriendsCount: number,
  // Optional, for graph layout:
  socialSimilarityFromEmbedding?: number  // cosine(networks_vector_A, networks_vector_B) if both exist
}
```

If the gate fails, `hasSocialProximity: false` and `socialCloseness: 0` (or we don’t return a score at all).

### 6.2 Function 2: `computeSocialPlusInterest(userAId, userBId)`

**Inputs:** `userAId`, `userBId`.

**Steps:**
1. Call **`computeSocialCloseness(userAId, userBId)`**.
   - If `!hasSocialProximity` → return `{ score: 0, hasSocialProximity: false }`.
2. Compute **InterestScore** (same as today in `calculate-network-proximity`):
   - `InterestScore = 0.35 × cosine(dna_v2_A, dna_v2_B) + 0.65 × Dice(interests_A, interests_B)` (or your current blend).
3. **Combined** = `0.70 × SocialCloseness + 0.30 × InterestScore` (or chosen formula from 5.1).

**Outputs (example):**
```ts
{
  hasSocialProximity: true,
  socialCloseness: number,
  interestScore: number,
  combined: number,            // in [0,1]
  networkScore: number,
  mutualScore: number,
  sharedNetworks: Array<{ name, type }>,
  mutualFriendsCount: number,
}
```

Again, if the gate fails, we return a zeroed or “no proximity” result.

---

## 7. Backend Architecture for Implementation and Testing

### 7.1 Data

| What | Where | When |
|------|-------|------|
| Networks (raw) | `user_profile_extras` (networks, college, high_school, company, city) | Onboarding (once built) + Edit Profile |
| Network embeddings | `user_network_embeddings` (or `user_profile_extras.networks_vector`) VECTOR(3072) | On insert/update of networks; Edge Function or trigger |
| Mutuals, degrees | `user_connections` | On read |
| DNA v2 | `digital_dna_v2.composite_vector` | Existing (compute-dna-v2) |
| Interests | `profiles.interests` | Existing (derive_interests) |

### 7.2 Backend Functions (to Implement)

1. **`computeSocialCloseness(userAId, userBId)`**  
   - Pure social: gate → NetworkScore + MutualScore → SocialCloseness.  
   - Can live inside `calculate-network-proximity` or in a new Edge Function / shared module.  
   - **Must be callable and unit-testable** (e.g. by passing in mock `getUserNetworks`, `getMutualCount`).

2. **`computeSocialPlusInterest(userAId, userBId)`**  
   - Gate → SocialCloseness (via 1) → InterestScore → Combined.  
   - Same: extractable and testable with mocks.

3. **`embedUserNetworks(userId)`** (or batch)  
   - Reads `user_profile_extras` for that user.  
   - Calls OpenAI (or your embed API) to get 3072-dim vector.  
   - Writes to `user_network_embeddings` (or `user_profile_extras.networks_vector`).  
   - Trigger: on `user_profile_extras` insert/update when `networks`/college/high_school/company (and optionally city) are present.  
   - **Must be unit-testable** with a mock embed client and mock DB.

4. **`cosineSocialSimilarity(userAId, userBId)`** (optional for V1)  
   - Reads `user_network_embeddings` for both.  
   - Returns cosine similarity.  
   - Used for social graph layout or for a future extended NetworkScore.

### 7.3 Edge Function / API Shape

- **Option A — One function, mode flag:**  
  - `calculate-network-proximity` (or rename) accepts `{ userAId, userBId, mode: 'social_only' | 'social_plus_interest' }`.  
  - `social_only` → `computeSocialCloseness` and return `socialCloseness` (and components).  
  - `social_plus_interest` → `computeSocialPlusInterest` and return `combined` (and components).

- **Option B — Two functions:**  
  - `compute-social-closeness` → `computeSocialCloseness`.  
  - `compute-social-plus-interest` → `computeSocialPlusInterest`.  
  - Frontend calls one or the other based on the toggle.

Either way, the **internals** (`computeSocialCloseness`, `computeSocialPlusInterest`) should be in **pure, dependency-injectable** modules so we can unit test them without Supabase or OpenAI.

### 7.4 Tables / Views for Stored Scores (Optional)

- **`user_overlap_scores`** (or new `user_social_closeness`):  
  - `(user_id, other_user_id, social_closeness, combined, mode, ...)`.  
  - Lets the app cache and sort without recomputing every time.  
- **`user_network_embeddings`** (or column):  
  - As in 4.2, for the social coordinate plane and future similarity.

### 7.5 Unit Tests (What to Cover)

- **Gate:**
  - `shared_networks.length === 0` → `socialCloseness = 0`, `hasSocialProximity = false` for both functions.
  - `shared_networks.length >= 1` → proceed.
- **`computeSocialCloseness`:**
  - With mock shared networks and weights: `NetworkScore` = `1 − exp(−Σ w(n))`.
  - With mock mutuals and degrees: `MutualScore` = `m / sqrt(deg(u)*deg(v))` clamped.
  - `SocialCloseness` = `0.65×NetworkScore + 0.35×MutualScore`.
  - Ordering: 5 shared + 20 mutuals > 4 shared + 20 mutuals; 5 shared + 20 mutuals > 5 shared + 10 mutuals.
- **`computeSocialPlusInterest`:**
  - When gate fails, `combined = 0` (or no score).
  - When gate passes: `InterestScore` in [0,1], `combined` = `0.70×SocialCloseness + 0.30×InterestScore`.
- **`embedUserNetworks`:**
  - With mock “Google”, “Columbia” → one 3072-dim vector; stored in the right table/column.
  - Idempotence / overwrite on re-run.

---

## 8. UI Toggle

- **Placement:** Top of the network graph or the suggestions panel (e.g. above the list or the graph).
- **Labels:**
  - Left: **“Who are you socially close to?”** (or similar).
  - Right: **“Socially close and similar interests”** (or similar).
- **Behavior:**
  - Left → backend uses `computeSocialCloseness` (or `mode: 'social_only'`). Graph and list ordered by `socialCloseness`.
  - Right → backend uses `computeSocialPlusInterest` (or `mode: 'social_plus_interest'`). Graph and list ordered by `combined`.
- The gate is the same: if `hasSocialProximity` is false, the person is not shown in either mode.

---

## 9. Network Overlap Graph (Social Coordinate Plane)

- **Idea:** Use **network vector embeddings** to place users on a 2D “social” coordinate plane (e.g. via PCA, t-SNE, or UMAP on the 3072-D `user_network_embeddings`).
- **Meaning:** Proximity in this 2D layout = proximity in **social/network space** (same industry, similar schools, similar cities, etc.), even without exact string overlap.
- **Relation to toggle:**
  - The **left** mode can use this layout directly: distance in 2D = social distance (from `socialCloseness` or from `cosine(networks_vector)`).
  - The **right** mode can use the same 2D social layout but **color or size** nodes by `interestScore`, or keep the same layout and only change ordering in a list view.

---

## 10. Summary

| Piece | Description |
|-------|-------------|
| **Gate** | 0 shared networks → 0; 1+ → proceed. Same for both modes. |
| **Toggle left** | “Who are you socially close to?” → `SocialCloseness` = 0.65×NetworkScore + 0.35×MutualScore. No interests. |
| **Toggle right** | “Socially close and similar interests” → `Combined` = 0.70×SocialCloseness + 0.30×InterestScore. |
| **Network embeddings** | Embed each user’s networks (3072 dim), store in `user_network_embeddings` (or `user_profile_extras.networks_vector`). Used for social coordinate plane and optional extended NetworkScore. |
| **Backend** | `computeSocialCloseness`, `computeSocialPlusInterest`, `embedUserNetworks`; all testable with mocks. API/Edge Functions can wrap them with a `mode` or separate endpoints. |
| **Stored scores** | Optional: `user_overlap_scores` or `user_social_closeness` with `social_closeness` and `combined` (and `mode` if needed). |

---

## 11. References

- **Current proximity:** `supabase/functions/calculate-network-proximity/`, `thenetworkwebapp/docs/NETWORK_PROXIMITY_SYSTEM_DESIGN.md`
- **DNA / embeddings:** `digital_dna_v2.composite_vector`, `text-embedding-3-large`, 3072 dim
- **Onboarding & networks:** `thenetworkwebapp/docs/ONBOARDING_COMPATIBILITY_AND_NETWORKS.md`
- **Overlap table:** `user_overlap_scores` (migration `20260124_create_user_overlap_scores.sql`)
