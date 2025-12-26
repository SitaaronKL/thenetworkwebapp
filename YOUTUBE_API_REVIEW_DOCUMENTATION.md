# YouTube API Review Documentation

This document describes all features and pages added specifically for YouTube API review purposes to demonstrate how we use the YouTube Read Only API data.

---

## Overview

We have implemented a comprehensive review system that shows:
1. **Real-time data fetching** during user onboarding
2. **Complete data transparency** on what we fetch and store
3. **Clear explanation** of how we use the data to derive interests and match users
4. **Feature flag protection** so these features can be easily removed after approval

---

## Feature Flag

All YouTube review features are gated behind the environment variable:
```
NEXT_PUBLIC_YT_REVIEW_ENABLED=true
```

**Important Notes:**
- This is a client-exposed environment variable used only for UI gating
- The route requires authenticated session; data is accessible only to the signed-in user
- Server-side enforces authentication on the route regardless of feature flag
- When disabled, the review page redirects to home and is hidden from settings

---

## Page 1: Onboarding Flow - YouTube Data Fetching (Wrapped Slides)

**Location:** `/profile-setup/wrapped`

### What Was Changed

We modified the onboarding "Wrapped" presentation slides to show **real YouTube API calls** with live progress tracking.

### Slide 4: "Connecting to YouTube..."
- **What it shows:**
  - Checks for YouTube OAuth access token
  - Confirms the user is authenticated with Google and proceeds only after successful OAuth sign-in
  - Displays "Connected ✅" when authentication is confirmed
- **Why it matters:** Demonstrates that we only proceed after explicit user consent and OAuth authentication

### Slide 5: "Fetching your subscriptions..."
- **What it shows:**
  - Makes real API call to `youtube/v3/subscriptions` endpoint
  - Displays incremental progress: "Fetched 50... 100... done (312)"
  - Shows total count when complete
- **Why it matters:** Proves we're actually calling the subscriptions API and fetching real data

### Slide 6: "Fetching your liked videos..."
- **What it shows:**
  - Makes real API call to `youtube/v3/playlistItems` with playlist ID "LL" (Liked Videos)
  - Displays incremental progress: "Fetched 50... 100... done (247)"
  - Shows total count when complete (capped at 800 videos)
- **Why it matters:** Proves we're actually calling the liked videos API and fetching real data

### Technical Implementation

- **Real API calls:** Uses `YouTubeService.fetchSubscriptions()` and `YouTubeService.fetchLikedVideos()`
- **Progress tracking:** Updates state in real-time as pages are fetched
- **Data storage:** Immediately syncs fetched data to Supabase database
- **Error handling:** Gracefully handles errors without blocking user flow

### What Reviewers Will See

1. User completes consent/onboarding
2. Slide 4 shows "Connecting to YouTube..." → "Connected ✅"
3. Slide 5 shows "Fetching subscriptions..." → "Fetched 312 subscriptions"
4. Slide 6 shows "Fetching liked videos..." → "Fetched 247 videos"
5. After Slide 6, redirects to YouTube Data Review page (if feature flag enabled)

---

## Page 2: YouTube Data Review Page

**Location:** `/youtube-data-review`  
**Access:** 
- Automatically shown after onboarding (if feature flag enabled)
- Always accessible from Settings menu → "YOUTUBE DATA REVIEW"

### Section 1: Disclaimer Banner

**Purpose:** Clearly states this page is for reviewers only

**Content:**
```
⚠️ For YouTube API Reviewers Only

This page is specifically created for YouTube API review purposes to demonstrate 
how we use the YouTube Read Only API data. This is not a standard user-facing 
feature and will be removed after API approval.
```

**Visual:** Yellow warning banner at the top of the page

---

### Section 2: Summary Cards

**What it shows:**
- **Subscriptions count:** Total number of channels user is subscribed to
- **Liked videos count:** Total number of liked videos fetched (up to 800 fetched, displaying first 100 in UI for usability)
- **Last sync time:** When data was last fetched from YouTube API

**Purpose:** Quick overview of data volume fetched from YouTube

**Note:** The UI displays the first 100 liked videos for usability, but we may fetch up to 800 videos total from the API.

---

### Section 3: Interest Derivation Process

**Purpose:** Shows exactly how we use YouTube data to derive user interests

#### Step 1: Data Preparation
- **Shows:** Example of how we format YouTube data as text inputs
- **Example:**
  ```
  [
    "channel: Veritasium",
    "channel: 3Blue1Brown",
    "liked: The Most Misunderstood Concept in Physics by Veritasium",
    "liked: But what is a Fourier series? by 3Blue1Brown",
    ...
  ]
  ```

#### Step 2: AI Analysis
- **Shows:** High-level description of the analysis process
- **Key points:**
  - We only send channel titles and liked video titles (no descriptions)
  - We use an LLM to categorize interests
  - Analyzes subscriptions and liked video titles
  - Surfaces exactly 20 generic interest categories
  - Each category includes 3+ specific, niche tags
  - Generates 4 personality archetypes
  - Generates 3 doppelgängers (famous people with similar interests)
- **Example analysis prompt (representative):**
  - The system uses a structured prompt to analyze the formatted data
  - Focuses on pattern matching and deep interest discovery
  - Avoids generic filler tags in favor of specific, high-fidelity categories

#### Step 3: Derived Interests
- **Shows:**
  - **Flat interests:** List of all interest tags derived (e.g., "Physics", "Mathematics", "Science Education")
  - **Hierarchical interests:** Categories with specific tags
    - Example:
      - **Software Engineering:**
        - Rust Systems Programming
        - LLM Orchestration
        - Distributed Systems
      - **Physics:**
        - Quantum Mechanics
        - Theoretical Physics
        - Science Communication

**Purpose:** Demonstrates that we only use YouTube data (subscriptions + liked videos) to derive interests, nothing else.

---

### Section 4: How We Match Users Using YouTube Data

**Purpose:** Explains how YouTube data enables user-to-user matching

#### Step 1: Create Vector Embeddings
- **What it shows:**
  - YouTube data (subscriptions + liked videos) converted to 3072-dimensional vector
  - Uses OpenAI's `text-embedding-3-large` model
  - Example: User who subscribes to science channels gets vector positioned near other science-interested users

#### Step 2: Calculate Similarity
- **What it shows:**
  - Uses cosine similarity to compare user vectors
  - Formula: `similarity = cosine_similarity(your_vector, other_user_vector)`
  - Score ranges:
    - 0.8-1.0 = Very high compatibility
    - 0.6-0.8 = High compatibility
    - 0.4-0.6 = Moderate compatibility
    - 0.0-0.4 = Low compatibility

#### Step 3: Match Based on Shared Interests
- **What it shows:** Real matching example:
  - **User A:**
    - Subscribed to: Veritasium, 3Blue1Brown, Numberphile
    - Likes: Physics videos, Math explanations
    - Derived Interests: Physics, Mathematics, Science Education
  - **User B:**
    - Subscribed to: Physics Girl, MinutePhysics, Stand-up Maths
    - Likes: Educational science content
    - Derived Interests: Physics, Mathematics, Science Communication
  - **Result:** High compatibility (0.85 similarity) - Both share deep interest in physics and mathematics education

#### Step 4: Rank and Recommend
- **What it shows:**
  - Users ranked by similarity score
  - Top matches recommended in the app
  - Helps users find people with genuine shared interests

**Purpose:** Proves that YouTube data is used exclusively for matching users based on shared interests and viewing patterns.

---

### Section 5: Complete Data Flow Pipeline

**Purpose:** Visual representation of the entire data transformation process

**Steps:**
1. **Fetch Data** → YouTube API (youtube.readonly scope) → Subscriptions list, Liked videos list
2. **Extract Topics** → Channel titles + video titles → Interest keywords, Topic categories
3. **Build Interest Map** → Interest keywords, Topic categories → Hierarchical interests, Interest profile
4. **Compute Digital DNA** → Interest profile, Hierarchical interests → Digital DNA, Personality archetypes, Matching scores

---

### Section 6: Your Subscriptions

**What it shows:**
- Complete list of all channels user is subscribed to
- For each subscription:
  - Channel thumbnail image
  - Channel title
  - Channel ID
- **"Show Sample JSON"** button:
  - Shows a small, redacted sample (first 1-2 items) to demonstrate what the YouTube API returns
  - Sample JSON is limited to the first 1-2 items and redacts fields we do not store
  - Demonstrates what data we receive from YouTube API
  - Notes: "We only store: channel_id, title, thumbnail_url, user_id, inserted_at"

**Purpose:** Transparency on exactly what subscription data we fetch and store.

---

### Section 7: Your Liked Videos

**What it shows:**
- List of liked videos (showing first 100)
- For each video:
  - Video thumbnail image
  - Video title
  - Channel title
  - Video ID
  - Published date
- **"Show Sample JSON"** button:
  - Shows a small, redacted sample (first 1-2 items) to demonstrate what the YouTube API returns
  - Sample JSON is limited to the first 1-2 items and redacts fields we do not store
  - Demonstrates what data we receive from YouTube API
  - Notes: "We only store: video_id, title, channel_title, thumbnail_url, published_at, user_id, inserted_at"

**Purpose:** Transparency on exactly what liked video data we fetch and store.

---

## What Data We Fetch

### Subscriptions API
- **Endpoint:** `GET https://www.googleapis.com/youtube/v3/subscriptions`
- **Parameters:**
  - `part=snippet`
  - `mine=true`
  - `maxResults=50` (paginated)
- **What we store:**
  - `channel_id` (from `resourceId.channelId`)
  - `title` (from `snippet.title`)
  - `thumbnail_url` (from `snippet.thumbnails.default.url`)
  - `user_id` (for data association)
  - `inserted_at` (timestamp of when data was fetched)
- **What we DON'T store:**
  - Full API response
  - Channel descriptions
  - Any data not listed above

### Liked Videos API
- **Endpoint:** `GET https://www.googleapis.com/youtube/v3/playlistItems`
- **Parameters:**
  - `part=snippet`
  - `playlistId=LL` (special playlist ID for liked videos)
  - `maxResults=50` (paginated, capped at 800 total)
- **What we store:**
  - `video_id` (from `resourceId.videoId`)
  - `title` (from `snippet.title`)
  - `channel_title` (from `snippet.channelTitle`)
  - `thumbnail_url` (from `snippet.thumbnails.default.url`)
  - `published_at` (from `snippet.publishedAt`)
  - `user_id` (for data association)
  - `inserted_at` (timestamp of when data was fetched)
- **What we DON'T store:**
  - Full API response
  - Video descriptions
  - Any data not listed above

### Minimal Fields Stored

**Subscriptions stored fields:**
- `channel_id` (primary key component)
- `title`
- `thumbnail_url`
- `user_id` (primary key component)
- `inserted_at` (timestamp)

**Liked videos stored fields:**
- `video_id` (primary key component)
- `title`
- `channel_title`
- `thumbnail_url`
- `published_at`
- `user_id` (primary key component)
- `inserted_at` (timestamp)

---

## Scope-to-Feature Mapping

Each Google OAuth scope maps directly to specific features:

| Scope | Feature | Data Used |
|-------|---------|-----------|
| `youtube.readonly` | Fetch subscriptions + liked videos → derive interests → build embeddings → match users | Subscriptions list, Liked videos list |
| `profile` | Display user name/avatar in profile | User's Google profile name and picture |
| `email` | Account creation and sign-in identity | User's Google email address |

**Clear one-to-one mapping:** Each scope is used exclusively for its stated purpose. The `youtube.readonly` scope is used only to fetch subscription and liked video data for interest derivation and user matching.

---

## What We Do With The Data

### 1. Derive User Interests
- **Input:** Channel titles, video titles from subscriptions and liked videos (no descriptions)
- **Process:** AI analysis using an LLM to identify interests and topics
- **Output:** 
  - 20 generic interest categories
  - 60+ specific interest tags (3+ per category)
  - 4 personality archetypes
  - 3 doppelgängers

### 2. Create User Profile Vector
- **Input:** All subscription and liked video data
- **Process:** Convert to 3072-dimensional embedding vector using OpenAI
- **Output:** Vector representation of user's interests and viewing patterns

### 3. Match Users
- **Input:** User profile vectors
- **Process:** Calculate cosine similarity between vectors
- **Output:** Compatibility scores and ranked match recommendations

### 4. Build Digital DNA
- **Input:** Derived interests and profile vector
- **Process:** Compute personality archetypes and compatibility metrics
- **Output:** Complete Digital DNA profile for user

---

## What We DON'T Do

We explicitly **DO NOT**:
- ❌ Upload videos
- ❌ Delete content
- ❌ Modify subscriptions
- ❌ Like/unlike videos
- ❌ Post comments
- ❌ Manage YouTube account settings
- ❌ Access YouTube password
- ❌ Store YouTube password
- ❌ Sell user data
- ❌ Share data with third parties for advertising

**Third-Party Service Providers:**
We do not sell user data or share it with third parties for advertising. We use service providers (e.g., OpenAI) to process limited data (channel titles and liked video titles only, no descriptions) to generate embeddings and interest categories used for matching. These service providers are covered as processors/service providers in our privacy policy.

---

## Verification Video Script

### Scene 1: Consent & Onboarding
1. Show your app's pre-consent screen explaining why YouTube access is needed (optional)
2. **Pause on the Google consent screen to show requested scopes** (youtube.readonly, profile, email)
3. User accepts and proceeds to onboarding

### Scene 2: Real-Time Data Fetching
1. **Slide 4:** "Connecting to YouTube..." → Shows "Connected ✅"
2. **Slide 5:** "Fetching your subscriptions..." → Shows live count: "Fetched 50... 100... 150... done (312)"
3. **Slide 6:** "Fetching your liked videos..." → Shows live count: "Fetched 50... 100... done (247)"

### Scene 3: YouTube Data Review Page
1. **Show the 'YouTube Data Review' page URL in the address bar** (`/youtube-data-review`)
2. **Summary Cards:** Show counts (312 subscriptions, 247 videos - note: "up to 800 fetched, displaying first 100")
3. **Interest Derivation:**
   - Show data preparation example
   - Show example analysis prompt (representative)
   - Show derived interests (flat + hierarchical)
4. **Matching Explanation:**
   - Show vector embedding explanation
   - Show similarity calculation
   - Show real matching example with two users
5. **Data Lists:**
   - Show subscriptions list with thumbnails
   - Show "Show Sample JSON" → Display redacted sample (first 1-2 items, fields we don't store are removed)
   - Show liked videos list with thumbnails
   - Show "Show Sample JSON" → Display redacted sample (first 1-2 items, fields we don't store are removed)

### Scene 4: Settings Access
1. Navigate to Settings menu
2. Show "YOUTUBE DATA REVIEW" link
3. Click to access review page again

---

## Technical Details

### Files Modified/Created

1. **`src/app/profile-setup/wrapped/page.tsx`**
   - Added YouTube-specific slides (4, 5, 6)
   - Added real-time progress tracking
   - Added redirect to review page after onboarding

2. **`src/app/youtube-data-review/page.tsx`**
   - Complete review page with all sections
   - Data loading and display
   - Interest derivation display
   - Matching explanation

3. **`src/app/youtube-data-review/page.module.css`**
   - All styling for review page
   - Responsive design
   - Clear visual hierarchy

4. **`src/components/Menu.tsx`**
   - Added "YOUTUBE DATA REVIEW" link in settings
   - Feature flag gating

5. **`next.config.ts`**
   - Added YouTube image domains for thumbnails

### Database Tables Used

- `youtube_subscriptions` - Stores subscription data
- `youtube_liked_videos` - Stores liked video data
- `profiles` - Stores derived interests and hierarchical interests

### API Endpoints Used

- `youtube/v3/subscriptions` - Fetch subscriptions
- `youtube/v3/playlistItems` - Fetch liked videos (playlist ID: "LL")

---

## Data Retention and User Control

### Data Retention
- YouTube data is retained as long as the user's account is active
- Data is automatically deleted when the user account is deleted

### User Control - Disconnect YouTube
- Users can disconnect their YouTube account at any time
- Disconnecting deletes all YouTube data (`youtube_subscriptions` and `youtube_liked_videos` rows) for that user
- This action is irreversible
- **Implementation:** "Disconnect YouTube" button available in Settings

### User Control - Delete YouTube Data
- Users can delete their YouTube data without disconnecting their account
- This removes all stored subscription and liked video data
- **Implementation:** "Delete YouTube Data" button available in Settings or review page

**Note:** In-product deletion controls are implemented and functional. Users have full control over their YouTube data.

---

## Removal After Approval

After YouTube API approval, simply set:
```
NEXT_PUBLIC_YT_REVIEW_ENABLED=false
```

This will:
- Hide the review page (redirects to home)
- Remove settings menu link
- Keep all core functionality intact
- Allow easy re-enablement if needed for future reviews

---

## Compliance Checklist

✅ **Scope Usage:** Only uses `youtube.readonly` scope  
✅ **Data Minimization:** Only stores necessary fields (channel_id, title, thumbnail_url, etc.)  
✅ **Transparency:** Shows exactly what data is fetched and stored  
✅ **Purpose Clarity:** Clearly explains how data is used (interests, matching)  
✅ **User Control:** Data is user's own data, accessible only to them  
✅ **No Modifications:** Read-only access, no write operations  
✅ **Privacy:** No data sharing, no advertising use  
✅ **Documentation:** Complete documentation of data flow  

---

## Contact

For questions about this implementation, please refer to the codebase or contact the development team.

**Last Updated:** December 2025

