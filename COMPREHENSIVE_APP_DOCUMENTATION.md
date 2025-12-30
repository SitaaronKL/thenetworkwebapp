# TheNetwork WebApp - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Complete User Flow](#complete-user-flow)
4. [Key Features](#key-features)
5. [Data Models & Database Structure](#data-models--database-structure)
6. [Authentication & Authorization](#authentication--authorization)
7. [Components Breakdown](#components-breakdown)
8. [Services & API Integration](#services--api-integration)
9. [Edge Functions](#edge-functions)
10. [State Management](#state-management)
11. [Styling & Theming](#styling--theming)
12. [File Structure](#file-structure)
13. [Key Algorithms & Logic](#key-algorithms--logic)
14. [Environment Variables](#environment-variables)
15. [Deployment & Build](#deployment--build)

---

## Overview

**TheNetwork** is a social networking platform that connects users based on their digital interests and personality traits. Unlike traditional social media, TheNetwork uses AI to analyze users' YouTube data (subscriptions and liked videos) to create a "Digital DNA" profile that represents their true interests and personality.

### Core Concept
- **Digital DNA**: A vector-based representation of a user's interests, personality archetypes, and behavioral patterns derived from their YouTube activity
- **Interest-Based Matching**: Users are connected based on similarity scores calculated from their Digital DNA vectors
- **Network Visualization**: Interactive graph visualization showing user connections
- **AI-Powered Suggestions**: "Ari's Suggestions" feature recommends potential connections using embedding similarity

### Key Differentiators
- Privacy-first: Users control what they connect
- Interest-based matching (not follower-based)
- Visual network representation
- AI-generated compatibility descriptions
- Dark/light theme toggle

---

## Architecture & Tech Stack

### Frontend Framework
- **Next.js 16.0.10** (App Router)
- **React 19.2.1**
- **TypeScript 5**

### UI Libraries & Components
- **Radix UI**: Comprehensive component library (@radix-ui/react-*)
- **Tailwind CSS 4**: Utility-first styling
- **CSS Modules**: Component-scoped styling
- **Lucide React**: Icon library

### Data Visualization
- **D3.js 7.9.0**: Network graph visualization (force-directed layout)
- **Sigma.js 3.0.2**: Graph rendering engine
- **Graphology 0.26.0**: Graph data structure
- **React-Sigma**: React bindings for Sigma
- **Recharts 3.6.0**: Chart library (for future analytics)

### Backend & Database
- **Supabase**: Backend-as-a-Service
  - PostgreSQL database
  - Authentication (Google OAuth)
  - Storage (profile images)
  - Edge Functions (serverless functions)
  - Real-time subscriptions

### External APIs
- **YouTube Data API v3**: Fetch subscriptions and liked videos
- **Google OAuth 2.0**: Authentication

### State Management
- **React Context API**: AuthContext for authentication state
- **React Hooks**: useState, useEffect, useCallback, useMemo
- **Local Storage**: Theme preferences, consent tracking

### Build Tools
- **ESLint**: Code linting
- **PostCSS**: CSS processing
- **TypeScript**: Type checking

---

## Complete User Flow

### 1. Landing Page (`/landing`)
**Purpose**: First impression and entry point

**Flow**:
- User sees TheNetwork logo and tagline "Control who you are online"
- "Learn more" button opens modal explaining:
  - Platform purpose
  - YouTube data usage (read-only)
  - Privacy information
- "Claim my Digital DNA" button → redirects to `/consent`

**Key Features**:
- Responsive design
- Info modal with privacy details
- Footer with legal links

---

### 2. Consent Page (`/consent`)
**Purpose**: Legal compliance - collect user agreements

**Flow**:
- User must check three boxes:
  1. Privacy Policy agreement
  2. Terms of Service agreement
  3. Terms of Use agreement
- All three must be checked to continue
- Consent stored in `localStorage` (`consent_agreed`)
- "Continue to Onboarding" → `/onboarding`

**Data Stored**:
- `localStorage.consent_agreed = 'true'`
- `localStorage.consent_timestamp = ISO string`

---

### 3. Onboarding Page (`/onboarding`)
**Purpose**: Educate users about the platform value proposition

**Flow**:
- Three-card carousel explaining:
  1. "Social media is draining" - Problem statement
  2. "Instagram grid is not the real you" - Value proposition
  3. "No more performing" - Solution introduction
- "Continue with Google" button → triggers Google OAuth
- OAuth redirects to `/auth/callback`

**Authentication**:
- Uses `AuthContext.signInWithGoogle()`
- OAuth scopes: `email profile https://www.googleapis.com/auth/youtube.readonly`
- Redirect URL: `${origin}/auth/callback`

---

### 4. Auth Callback (`/auth/callback`)
**Purpose**: Handle OAuth callback and determine user state

**Flow**:

**Step 1: Session Establishment**
- Waits for Supabase session (up to 10s timeout)
- Handles `SIGNED_IN` event from auth state change

**Step 2: Profile Creation/Update**
- Checks if profile exists in `profiles` table
- If new user:
  - Creates profile with Google metadata (name, picture)
  - Sets default `star_color: '#8E5BFF'`
  - Initializes empty `interests` and `hierarchical_interests`
- If existing user:
  - Updates profile with latest Google data if changed

**Step 3: YouTube Data Sync (Background)**
- Calls `YouTubeService.syncYouTubeData(userId)` (non-blocking)
- Fetches all subscriptions and liked videos
- Stores in `youtube_subscriptions` and `youtube_liked_videos` tables

**Step 4: Route Decision**
Checks user completion status:
- **New User** (`!hasInterests`):
  - Route: `/profile-setup/wrapped`
- **Partial User** (`hasInterests && (!hasArchetypes || !hasDoppelgangers)`):
  - Route: `/profile-setup/building`
- **Complete User** (`hasInterests && hasArchetypes && hasDoppelgangers`):
  - Route: `/profile-setup/building` (then auto-redirects to wrapped)

**Note**: `FORCE_ONBOARDING = true` flag forces all users through wrapped flow

---

### 5. Profile Setup - Wrapped (`/profile-setup/wrapped`)
**Purpose**: "Spotify Wrapped" style onboarding experience

**Flow**:

**Slide Sequence** (9 slides total):

1. **Slide 1**: "You already have a digital life" (Manual)
2. **Slide 2**: "What if all of that added up to something?" (Manual)
3. **Slide 3**: "Introducing: Digital DNA Wrapped" (Manual)
4. **Slide 4**: "Connecting to YouTube..." (Auto-advance, 2s)
   - Checks for YouTube access token
   - Shows "Connected ✅" when ready
5. **Slide 5**: "Fetching your subscriptions..." (Auto-advance, 3s)
   - Progress tracking: `subscriptionsCount / subscriptionsTotal`
   - Fetches with pagination (50 per page)
6. **Slide 6**: "Fetching your liked videos..." (Auto-advance, 3s)
   - Progress tracking: `likedVideosCount / likedVideosTotal`
   - Fetches up to 800 videos
7. **Slide 7**: "You don't fit in one box. So we gave you four." (Manual)
   - Displays personality archetypes (4 with percentages)
   - Colors: Gold, Periwinkle, Green, Red
8. **Slide 8**: "Your Digital Doppelgängers" (Manual)
   - Shows similar users (fictional or real)
   - Displays percentage similarity
9. **Slide 9**: "Ready to meet more people like you?" (Manual)
   - "Continue →" button
   - Routes to `/youtube-data-review` (if enabled) or `/`

**Processing Logic** (for new users):
Triggered when reaching Slide 4:

1. **YouTube Connection Check**
   - Gets access token from session
   - Checks for existing YouTube data in database
   - If no data: Fetches all subscriptions and liked videos with progress tracking
   - Syncs to database

2. **Interest Derivation**
   - Calls `YouTubeService.deriveInterests(userId)`
   - Invokes `derive_interests` edge function
   - Polls profile for `interests` and `hierarchical_interests` (max 30s)

3. **DNA v2 Computation**
   - Triggers `compute-dna-v2` edge function
   - Polls `digital_dna_v2` table for completion (max 30s)

4. **Archetypes & Doppelgangers**
   - Fetched from profile after processing
   - Displayed in slides 7 and 8

**Auto-Advance Logic**:
- Slides 4-6: Dynamic timing based on processing status
- If processing complete: Fast advance (1.5-2s)
- If still processing: Wait longer (3-5s)

---

### 6. Profile Setup - Building (`/profile-setup/building`)
**Purpose**: Processing screen for existing users or fallback

**Flow**:
- Shows loading spinner
- Checks if user has complete profile
- If incomplete:
  - Syncs YouTube data
  - Derives interests
  - Triggers DNA v2 computation
- Auto-redirects to `/profile-setup/wrapped` when complete

**Note**: This page is mostly a transition screen

---

### 7. Profile Setup - Basic Info (`/profile-setup`)
**Purpose**: Collect basic user information (currently bypassed in flow)

**Flow**:
- Form fields:
  - Name (pre-filled from Google)
  - Age (required, 13-120)
  - School (optional)
  - Profile Photo (optional, uploads to Supabase Storage)
  - One-liner/Bio (optional)
- Progress bar: 25%
- "Continue →" → `/profile-setup/signals`

**Storage**:
- Profile image: `profile-images` bucket
- Profile data: `profiles` table

---

### 8. Profile Setup - Signals (`/profile-setup/signals`)
**Purpose**: Platform connection selection (currently YouTube only)

**Flow**:
- Shows platform cards:
  - YouTube (available, connected via Google OAuth)
  - TikTok (coming soon)
  - Spotify (coming soon)
- YouTube shows "Connected via Google!" tooltip
- Progress bar: 50%
- "Continue →" → `/profile-setup/building`

---

### 9. Home Page (`/`)
**Purpose**: Main application interface - network visualization and suggestions

**Flow**:

**Initialization**:
1. Checks authentication (redirects to `/landing` if not logged in)
2. Loads network data:
   - Fetches accepted connections from `user_connections` table
   - Falls back to `friend_requests` table if needed
   - Builds network graph with current user at center
   - Positions friends in spiral pattern
3. Loads Ari's Suggestions:
   - Only shows if user has ≤4 connections
   - Filters out already-interacted suggestions
   - Uses DNA v2 (or DNA v1 fallback) for matching
   - Generates compatibility reasons via edge function

**Components**:

1. **Menu** (top-left):
   - Hamburger menu
   - Navigation: THENETWORK, DIGITAL DNA, ARI
   - Settings submenu: EDIT PROFILE, YOUTUBE DATA REVIEW, LOGOUT
   - Theme toggle (dark/light)

2. **NetworkGalaxy** (background):
   - D3.js force-directed graph
   - Current user at center (larger node)
   - Friends positioned in spiral
   - Clickable nodes (opens ProfileModal)
   - Draggable nodes
   - Theme-aware (inverts colors)

3. **Ari's Suggestions Panel** (right side):
   - Header: "Ari's Suggestions"
   - Action icons:
     - Add User icon → Friend Requests Modal
     - Search icon → Search User Modal
   - Suggestion cards:
     - Avatar
     - Name
     - Compatibility reason (truncated if >120 chars)
     - "Read more" button → SuggestionDetailModal
   - If all suggestions interacted: Shows AriaMessage component

4. **Modals**:
   - **ProfileModal**: User profile details, compatibility, shared interests
   - **FriendRequestsModal**: Incoming friend requests
   - **SearchUserModal**: Search users by name/username
   - **SuggestionDetailModal**: Full suggestion details, send request

**Network Data Loading**:
```typescript
1. Fetch user_connections where status='accepted'
2. Get unique friend IDs
3. Fetch friend profiles
4. Position in spiral: angle = index * 2.4, radius = 120 + (index * 30)
5. Build NetworkPerson objects with connections array
```

**Ari's Suggestions Algorithm**:
```typescript
1. Check connection count (must be ≤4)
2. Get user's DNA v2 (composite_vector) or DNA v1 (interest_vector)
3. Call match_profiles_v2 RPC (or match_profiles for v1)
   - match_threshold: 0.3 (30% similarity minimum)
   - match_count: 20
4. Filter out users already in network
5. Get top 3 matches
6. For each match:
   - Check cache (user_compatibility_descriptions)
   - If not cached: Call generate-suggestion-reason edge function
   - Store in cache
7. Filter out already-interacted suggestions
8. Display top 3
```

**Suggestion Interaction Tracking**:
- When user sends request or dismisses:
  - Immediately removes from UI
  - Tracks in `suggestion_interactions` table
  - Prevents re-showing same suggestion

---

### 10. Digital DNA Page (`/digital-dna`)
**Purpose**: Visualize user's interests as an interactive graph

**Flow**:
1. Fetches user profile:
   - `interests` array
   - `hierarchical_interests` array
   - `full_name`
2. Retries up to 10 times if interests not ready (2s intervals)
3. Renders InterestGraph component:
   - Sigma.js graph visualization
   - Each interest = cluster center with particles
   - Force-directed layout (ForceAtlas2)
   - Clickable interest nodes → InterestExplanationModal

**InterestGraph Features**:
- Collision-aware random placement
- Color-coded clusters (8-color palette)
- Label toggle (Θ/λ button)
- Click handler for cluster centers
- Particle system (100 particles per interest)

**InterestExplanationModal**:
- Shows interest name
- Calls `generate-interest-explanation` edge function
- Displays AI-generated explanation
- Loading and error states

---

### 11. ARI Page (`/msg-aria`)
**Purpose**: Information page about ARI (AI recommendation system)

**Content**:
- Memo explaining the vision
- Thesis about interest-based connections
- Future plans for ARI chat feature

**Note**: Currently static content, chat functionality not yet implemented

---

### 12. Edit Profile Page (`/edit-profile`)
**Purpose**: User settings and profile management

**Flow**:
1. Loads current profile data:
   - Name, school, bio (from `agent_handles.handle`)
   - Avatar URL
   - YouTube connection status
2. Editable fields:
   - Name
   - School
   - Bio (max 50 chars, stored in `agent_handles`)
   - Profile picture (upload to Supabase Storage)
3. Connections section:
   - YouTube status (Connected/Not Connected)
   - TikTok, LinkedIn, Spotify (coming soon)
4. Save Changes:
   - Updates `profiles` table
   - Upserts `agent_handles` table
5. Delete Account:
   - Double confirmation
   - Calls `delete-account` edge function
   - Signs out and redirects to landing

---

### 13. YouTube Data Review (`/youtube-data-review`)
**Purpose**: Review and manage imported YouTube data (feature flag controlled)

**Flow**:
- Only accessible if `NEXT_PUBLIC_YT_REVIEW_ENABLED === 'true'`
- Shows imported subscriptions and liked videos
- Allows deletion of YouTube data
- Privacy controls

---

## Key Features

### 1. Digital DNA System
**Purpose**: Create a vector representation of user's interests and personality

**Components**:
- **DNA v1**: Interest-based vector (`interest_vector` in `digital_dna_v1`)
- **DNA v2**: Composite vector including interests, archetypes, behavior (`composite_vector` in `digital_dna_v2`)

**Generation Process**:
1. YouTube data collection (subscriptions + liked videos)
2. Edge function `derive_interests` analyzes content
3. Creates interest embeddings
4. Edge function `compute-dna-v2` generates composite vector
5. Stores in database for matching

**Usage**:
- Profile matching via cosine similarity
- Compatibility scoring
- Suggestion ranking

---

### 2. Network Visualization
**Technology**: D3.js force-directed graph

**Features**:
- Current user at center (fixed position)
- Friends positioned in spiral pattern
- Force simulation:
  - Charge force: -1740 strength
  - Link force: 600 distance, 0.03 strength
  - Collision detection: node radius + 16 padding
- Draggable nodes
- Clickable nodes (opens profile modal)
- Theme-aware (inverts on dark mode)

**Layout Algorithm**:
```typescript
// Spiral positioning
const angle = (index * 2.4) + Math.random() * 0.5;
const radius = 120 + (index * 30) + Math.random() * 50;
const x = 400 + Math.cos(angle) * radius;
const y = 500 + Math.sin(angle) * radius;
```

---

### 3. Ari's Suggestions
**Purpose**: AI-powered friend recommendations

**Algorithm**:
1. **Eligibility Check**:
   - User must have ≤4 connections
   - Excludes already-interacted suggestions

2. **Matching**:
   - Uses DNA v2 `match_profiles_v2` RPC (or DNA v1 `match_profiles`)
   - Cosine similarity threshold: 0.3 (30%)
   - Returns top 20 candidates

3. **Filtering**:
   - Removes users already in network
   - Removes already-interacted users
   - Takes top 3

4. **Reason Generation**:
   - Checks cache (`user_compatibility_descriptions`)
   - If not cached: Calls `generate-suggestion-reason` edge function
   - Stores in cache for future use

5. **Display**:
   - Shows avatar, name, reason
   - "Read more" if reason >120 chars
   - Tracks interactions

---

### 4. Friend Requests System
**Tables**:
- `friend_requests`: Legacy table (still used)
- `user_connections`: Primary connection table

**Flow**:
1. **Send Request**:
   - Creates row in `friend_requests` (status: 'pending')
   - Sender: current user, Receiver: target user

2. **Accept Request**:
   - Updates `friend_requests` status to 'accepted'
   - Creates/updates `user_connections` (status: 'accepted')
   - Refreshes network graph

3. **Decline Request**:
   - Updates `friend_requests` status to 'declined'

**RLS Policies**:
- Users can only insert connections where they are the sender
- Users can only update connections where they are involved

---

### 5. Search Users
**Features**:
- Search by `full_name` or `username`
- Case-insensitive ILIKE query
- Debounced (300ms)
- Shows connection status:
  - "Send Request" (not connected)
  - "Request Sent" (pending)
  - "Already Friends" (accepted)

**Query**:
```sql
SELECT * FROM profiles
WHERE (full_name ILIKE '%query%' OR username ILIKE '%query%')
AND id != current_user_id
LIMIT 10
```

---

### 6. Compatibility Scoring
**Calculation**:
1. **DNA v2 Similarity** (preferred):
   - Cosine similarity between `composite_vector` arrays
   - Formula: `dot(A,B) / (||A|| * ||B||)`

2. **DNA v1 Similarity** (fallback):
   - Cosine similarity between `interest_vector` arrays

3. **Shared Interests** (fallback):
   - `sharedInterests.length / totalUniqueInterests`

**Star Rating**:
- 5 stars: ≥75% similarity
- 4 stars: ≥50% similarity
- 3 stars: ≥30% similarity
- 2 stars: ≥15% similarity
- 1 star: <15% similarity

---

### 7. Theme System
**Implementation**: CSS filter inversion

**Toggle**:
- Stored in `localStorage.theme_inverted`
- Default: `true` (dark mode)
- Applied via: `filter: invert(1) hue-rotate(180deg)`

**Classes**:
- `theme-inverted` class on `document.documentElement`
- Components check inversion state for label colors

**Reset on Logout**:
- Removes theme preference
- Resets to light mode

---

## Data Models & Database Structure

### Core Tables

#### `profiles`
**Purpose**: User profile information

**Columns**:
- `id` (UUID, PK): User ID (matches auth.users.id)
- `full_name` (TEXT): User's full name
- `avatar_url` (TEXT): Path to profile image
- `star_color` (TEXT): Hex color for network visualization
- `bio` (TEXT): User bio/one-liner
- `interests` (TEXT[]): Array of interest strings
- `hierarchical_interests` (JSONB): Structured interest hierarchy
- `personality_archetypes` (JSONB): Array of {name, percentage} objects
- `doppelgangers` (JSONB): Array of {name} objects
- `age` (INTEGER): User age
- `school` (TEXT): School name
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes**:
- Primary key on `id`
- GIN index on `interests` (for array operations)

---

#### `digital_dna_v1`
**Purpose**: First-generation DNA vectors

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles.id)
- `interest_vector` (VECTOR): Embedding vector (1536 dimensions)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Usage**: Fallback for users without DNA v2

---

#### `digital_dna_v2`
**Purpose**: Second-generation composite DNA vectors

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles.id)
- `composite_vector` (VECTOR): Combined embedding (dimensions vary)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Usage**: Primary matching vector (preferred over v1)

---

#### `user_connections`
**Purpose**: User-to-user connections (primary table)

**Columns**:
- `id` (UUID, PK)
- `sender_id` (UUID, FK → profiles.id)
- `receiver_id` (UUID, FK → profiles.id)
- `status` (TEXT): 'pending', 'accepted', 'declined'
- `created_at` (TIMESTAMP)
- `responded_at` (TIMESTAMP)

**Constraints**:
- Unique on (sender_id, receiver_id)
- RLS: Users can only insert where they are sender

---

#### `friend_requests`
**Purpose**: Legacy friend requests table (still used)

**Columns**:
- `id` (SERIAL, PK)
- `sender_id` (UUID, FK → profiles.id)
- `receiver_id` (UUID, FK → profiles.id)
- `status` (TEXT): 'pending', 'accepted', 'declined'
- `created_at` (TIMESTAMP)
- `responded_at` (TIMESTAMP)

**Note**: Being phased out in favor of `user_connections`

---

#### `youtube_subscriptions`
**Purpose**: User's YouTube channel subscriptions

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles.id)
- `channel_id` (TEXT): YouTube channel ID
- `title` (TEXT): Channel name
- `thumbnail_url` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Constraints**:
- Unique on (user_id, channel_id)

---

#### `youtube_liked_videos`
**Purpose**: User's liked YouTube videos

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles.id)
- `video_id` (TEXT): YouTube video ID
- `title` (TEXT): Video title
- `channel_title` (TEXT)
- `thumbnail_url` (TEXT)
- `published_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Constraints**:
- Unique on (user_id, video_id)

---

#### `user_compatibility_descriptions`
**Purpose**: Cache for AI-generated compatibility reasons

**Columns**:
- `id` (UUID, PK)
- `user_a_id` (UUID, FK → profiles.id)
- `user_b_id` (UUID, FK → profiles.id)
- `description` (TEXT): AI-generated reason
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Constraints**:
- Unique on (user_a_id, user_b_id) where user_a_id < user_b_id
- Normalized IDs to prevent duplicates

---

#### `suggestion_interactions`
**Purpose**: Track user interactions with suggestions

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles.id)
- `suggested_user_id` (UUID, FK → profiles.id)
- `interaction_type` (TEXT): 'connected', 'skipped'
- `created_at` (TIMESTAMP)

**Constraints**:
- Unique on (user_id, suggested_user_id)

---

#### `agent_handles`
**Purpose**: User bio/agent handle

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles.id, unique)
- `handle` (TEXT): Bio text (max 50 chars)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

---

#### `aria_conversations`
**Purpose**: Store ARI chat messages (future feature)

**Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles.id)
- `message` (TEXT)
- `is_from_user` (BOOLEAN)
- `metadata` (JSONB): Additional data (candidates, etc.)
- `created_at` (TIMESTAMP)

---

### Database Functions (RPC)

#### `match_profiles`
**Purpose**: Find similar users using DNA v1

**Parameters**:
- `query_embedding` (VECTOR): User's interest_vector
- `match_threshold` (FLOAT): Minimum similarity (0.0-1.0)
- `match_count` (INT): Max results
- `ignore_user_id` (UUID): Exclude this user

**Returns**: Array of {id, similarity}

**Implementation**: Uses pgvector cosine similarity

---

#### `match_profiles_v2`
**Purpose**: Find similar users using DNA v2

**Parameters**:
- `query_embedding` (VECTOR): User's composite_vector
- `match_threshold` (FLOAT): Minimum similarity (0.0-1.0)
- `match_count` (INT): Max results
- `ignore_user_id` (UUID): Exclude this user

**Returns**: Array of {id, similarity}

**Implementation**: Uses pgvector cosine similarity on composite_vector

---

## Authentication & Authorization

### Provider
**Supabase Auth** with Google OAuth

### Flow
1. User clicks "Continue with Google"
2. Redirects to Google OAuth consent screen
3. User grants permissions:
   - Email
   - Profile
   - YouTube read-only access
4. Google redirects to `/auth/callback` with code
5. Supabase exchanges code for tokens
6. Session established
7. Profile created/updated

### Session Management
- Stored in HTTP-only cookies (Supabase SSR)
- Auto-refreshed by Supabase client
- `provider_token`: Google access token (for YouTube API)

### RLS (Row Level Security)
**Policies**:
- Users can only read their own profile data
- Users can read public profile fields (name, avatar, bio)
- Users can only insert connections where they are sender
- Users can update connections where they are involved

---

## Components Breakdown

### Core Components

#### `Menu.tsx`
**Purpose**: Navigation and settings

**Features**:
- Hamburger menu toggle
- Navigation links (THENETWORK, DIGITAL DNA, ARI)
- Settings submenu
- Theme toggle
- Logout functionality

**State**:
- `isOpen`: Menu panel visibility
- `isSettingsOpen`: Settings submenu visibility
- `isInverted`: Theme state

---

#### `NetworkGalaxy.tsx`
**Purpose**: Interactive network graph visualization

**Technology**: D3.js force simulation

**Props**:
- `people`: NetworkPerson[] array
- `currentUserId`: Current user ID
- `onPersonClick`: Click handler

**Features**:
- Force-directed layout
- Draggable nodes
- Clickable nodes
- Theme-aware colors
- Responsive viewBox

**Implementation Details**:
- Uses D3 force simulation
- Recycles node positions on updates
- Custom `__update` method for data updates
- SVG-based rendering

---

#### `ProfileModal.tsx`
**Purpose**: Display user profile and compatibility

**Features**:
- Avatar display
- Name and bio
- Star rating (calculated from DNA similarity)
- Shared interests list
- Compatibility description (AI-generated)
- Connection count
- Message button (placeholder)

**Data Loading**:
1. Fetches both user profiles
2. Calculates shared interests
3. Computes DNA similarity (v2 → v1 → shared interests fallback)
4. Gets compatibility description (cache or generate)
5. Calculates star rating

---

#### `FriendRequestsModal.tsx`
**Purpose**: Manage incoming friend requests

**Features**:
- List of pending requests
- Sender profile display
- Accept/Decline buttons
- Real-time updates

**Flow**:
1. Fetches pending requests where user is receiver
2. Fetches sender profiles
3. On accept: Updates `friend_requests` and creates `user_connections`
4. Refreshes network graph

---

#### `SearchUserModal.tsx`
**Purpose**: Search and connect with users

**Features**:
- Debounced search input
- Results list with avatars
- Connection status indicators
- Send request functionality

**Search Logic**:
- Searches `full_name` and `username` fields
- Case-insensitive ILIKE
- Limits to 10 results
- Excludes current user

---

#### `SuggestionDetailModal.tsx`
**Purpose**: Full view of Ari's suggestion

**Features**:
- Full compatibility reason
- Avatar and name
- Send request button
- Dismiss button
- Connection status check

---

#### `InterestGraph.tsx`
**Purpose**: Visualize user interests as graph

**Technology**: Sigma.js + Graphology

**Features**:
- Cluster-based layout (one per interest)
- Particle system (100 particles per cluster)
- Force-directed layout (ForceAtlas2)
- Label toggle
- Clickable cluster centers

**Implementation**:
- Collision-aware random placement
- Color-coded clusters
- Fixed cluster centers
- Animated particles

---

#### `AriaMessage.tsx`
**Purpose**: Display message when no suggestions available

**Content**: Static message explaining why suggestions aren't shown

---

#### `HelpIcon.tsx` & `HelpModal.tsx`
**Purpose**: Help and information

**Features**:
- Help icon button
- Modal with information
- Usage instructions

---

### Page Components

All page components follow similar patterns:
- Auth check (redirect if not logged in)
- Menu component
- Page-specific content
- Loading states
- Error handling

---

## Services & API Integration

### YouTubeService (`services/youtube.ts`)

#### `getAccessToken()`
**Purpose**: Get Google OAuth token from Supabase session

**Flow**:
1. Gets current session
2. Checks `provider_token`
3. If missing: Refreshes session
4. Returns token or null

---

#### `fetchSubscriptions(accessToken, maxResults, pageToken)`
**Purpose**: Fetch single page of YouTube subscriptions

**API**: `GET /youtube/v3/subscriptions`
**Parameters**:
- `part=snippet`
- `mine=true`
- `maxResults=50`
- `order=relevance`

**Returns**: `{items: YouTubeSubscription[], nextPageToken?: string}`

---

#### `fetchAllSubscriptions(accessToken, pageSize)`
**Purpose**: Fetch all subscriptions with pagination

**Flow**:
- Loops through pages until no `nextPageToken`
- Accumulates all items
- Returns complete array

---

#### `fetchLikedVideos(accessToken, maxResults, pageToken)`
**Purpose**: Fetch single page of liked videos

**API**: `GET /youtube/v3/playlistItems`
**Parameters**:
- `part=snippet`
- `playlistId=LL` (Liked Videos playlist)
- `maxResults=50`

**Returns**: `{items: YouTubeLikedVideo[], nextPageToken?: string}`

---

#### `fetchAllLikedVideos(accessToken, pageSize, maxItems)`
**Purpose**: Fetch all liked videos (capped at 800)

**Flow**:
- Paginates through all pages
- Stops at `maxItems` (800)
- Returns complete array

---

#### `syncSubscriptionsToSupabase(userId, subscriptions)`
**Purpose**: Store subscriptions in database

**Flow**:
1. Maps subscriptions to database rows
2. Upserts to `youtube_subscriptions` table
3. Returns count of synced items

---

#### `syncLikedVideosToSupabase(userId, likedVideos)`
**Purpose**: Store liked videos in database

**Flow**:
1. Maps videos to database rows
2. Upserts to `youtube_liked_videos` table
3. Returns count of synced items

---

#### `syncYouTubeData(userId)`
**Purpose**: Full sync of YouTube data

**Flow**:
1. Gets access token
2. Fetches all subscriptions
3. Fetches all liked videos (max 800)
4. Syncs both to database
5. Returns counts

---

#### `deriveInterests(userId)`
**Purpose**: Trigger interest derivation

**Flow**:
1. Calls `derive_interests` edge function
2. Passes `user_id` and `max_interests: 15`
3. Returns interest array
4. Falls back to direct fetch if Supabase client fails

---

### AriaService (`services/aria.ts`)

#### `sendMessage(message, history)`
**Purpose**: Send message to ARI chat (future feature)

**Flow**:
1. Calls `aria-chat` edge function
2. Processes response and candidates
3. Hydrates candidate data with profiles
4. Returns `AriaResponse`

---

#### `storeMessage(userId, content, isFromUser)`
**Purpose**: Store message in database

**Table**: `aria_conversations`

---

#### `getHistory(userId, limit)`
**Purpose**: Fetch conversation history

**Flow**:
1. Fetches messages from `aria_conversations`
2. Hydrates candidate data
3. Checks connection status
4. Returns formatted history

---

## Edge Functions

### `derive_interests`
**Purpose**: Analyze YouTube data and generate interests

**Input**:
```json
{
  "user_id": "uuid",
  "max_interests": 15
}
```

**Process**:
1. Fetches user's YouTube subscriptions and liked videos
2. Analyzes content (titles, channels, topics)
3. Generates interest embeddings
4. Clusters interests
5. Updates `profiles.interests` and `profiles.hierarchical_interests`

**Output**:
```json
{
  "interests": ["interest1", "interest2", ...],
  "success": true
}
```

---

### `compute-dna-v2`
**Purpose**: Generate composite DNA vector

**Input**:
```json
{
  "user_id": "uuid",
  "trigger_source": "NEW_USER_SIGNUP" | "MANUAL" | ...
}
```

**Process**:
1. Fetches user's interests, archetypes, behavior data
2. Combines into composite embedding
3. Stores in `digital_dna_v2.composite_vector`

**Output**:
```json
{
  "success": true,
  "vector_dimensions": 1536
}
```

---

### `generate-suggestion-reason`
**Purpose**: Generate AI compatibility description

**Input**:
```json
{
  "userAId": "uuid",
  "userBId": "uuid",
  "userProfile": {
    "interests": ["..."],
    "bio": "..."
  },
  "candidateProfile": {
    "interests": ["..."],
    "bio": "..."
  },
  "similarity": 0.75
}
```

**Process**:
1. Uses AI to analyze profiles
2. Generates compelling reason for connection
3. Stores in `user_compatibility_descriptions` cache
4. Returns description

**Output**:
```json
{
  "reason": "You both share a passion for...",
  "success": true
}
```

---

### `generate-interest-explanation`
**Purpose**: Explain why an interest appears in user's DNA

**Input**:
```json
{
  "interest": "Machine Learning",
  "tags": ["AI", "Data Science", ...]
}
```

**Process**:
1. Analyzes interest and related tags
2. Generates explanation based on YouTube data
3. Returns explanation

**Output**:
```json
{
  "explanation": "You watch many videos about...",
  "success": true
}
```

---

### `delete-account`
**Purpose**: Delete user account and all associated data

**Process**:
1. Deletes all user data:
   - Profile
   - Connections
   - YouTube data
   - DNA vectors
   - Messages
   - etc.
2. Signs out user
3. Returns success

**Security**: Requires authentication, double confirmation on frontend

---

### `aria-chat`
**Purpose**: ARI conversational interface (future)

**Input**:
```json
{
  "message": "Find me people interested in AI",
  "conversation_history": [...]
}
```

**Process**:
1. Analyzes user intent
2. Searches for matching users
3. Generates response
4. Returns candidates and message

**Output**:
```json
{
  "response": "I found 3 people...",
  "intent": "search",
  "candidates": [...]
}
```

---

## State Management

### AuthContext (`contexts/AuthContext.tsx`)
**Purpose**: Global authentication state

**State**:
- `user`: Supabase User object
- `session`: Supabase Session object
- `loading`: Initial load state

**Methods**:
- `signInWithGoogle()`: Initiate OAuth flow
- `signOut()`: Sign out user

**Provider**: Wraps entire app in `layout.tsx`

---

### Local State
Most components use React hooks for local state:
- `useState`: Component state
- `useEffect`: Side effects, data fetching
- `useCallback`: Memoized functions
- `useMemo`: Memoized values
- `useRef`: Mutable references

---

### Local Storage
**Keys**:
- `consent_agreed`: User consent status
- `consent_timestamp`: Consent timestamp
- `theme_inverted`: Theme preference

---

## Styling & Theming

### CSS Architecture
- **Tailwind CSS**: Utility classes
- **CSS Modules**: Component-scoped styles (`.module.css`)
- **Global CSS**: `globals.css` for base styles

### Theme System
**Implementation**: CSS filter inversion

**Light Mode** (default):
- Background: White
- Text: Black
- No filter applied

**Dark Mode**:
- Background: Black (via inversion)
- Text: White (via inversion)
- Filter: `invert(1) hue-rotate(180deg)`

**Toggle**:
- Stored in `localStorage.theme_inverted`
- Applied to `document.documentElement`
- Class: `theme-inverted`

**Components**:
- Check inversion state for label colors
- Network graph inverts automatically
- Images may need `invert-media` class

---

## File Structure

```
thenetworkwebapp/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout with AuthProvider
│   │   ├── page.tsx           # Home page (network graph)
│   │   ├── globals.css        # Global styles
│   │   ├── landing/           # Landing page
│   │   ├── consent/           # Consent page
│   │   ├── onboarding/        # Onboarding carousel
│   │   ├── auth/
│   │   │   └── callback/      # OAuth callback handler
│   │   ├── profile-setup/     # Profile setup flow
│   │   │   ├── page.tsx       # Basic info
│   │   │   ├── signals/       # Platform connections
│   │   │   ├── wrapped/       # Wrapped experience
│   │   │   └── building/     # Processing screen
│   │   ├── digital-dna/       # Interest graph visualization
│   │   ├── msg-aria/          # ARI information page
│   │   ├── edit-profile/      # Settings page
│   │   ├── youtube-data-review/ # YouTube data management
│   │   ├── privacy-policy/     # Legal pages
│   │   ├── terms-of-service/
│   │   └── terms-of-use/
│   ├── components/            # React components
│   │   ├── Menu.tsx           # Navigation menu
│   │   ├── NetworkGalaxy.tsx  # Network graph
│   │   ├── ProfileModal.tsx   # User profile modal
│   │   ├── FriendRequestsModal.tsx
│   │   ├── SearchUserModal.tsx
│   │   ├── SuggestionDetailModal.tsx
│   │   ├── InterestGraph.tsx  # Interest visualization
│   │   ├── AriaMessage.tsx
│   │   ├── HelpIcon.tsx
│   │   ├── HelpModal.tsx
│   │   └── icons/            # Icon components
│   ├── contexts/             # React contexts
│   │   └── AuthContext.tsx   # Authentication context
│   ├── services/              # API services
│   │   ├── youtube.ts         # YouTube API integration
│   │   └── aria.ts           # ARI service (future)
│   ├── types/                # TypeScript types
│   │   ├── network.ts         # Network types
│   │   ├── aria.ts           # ARI types
│   │   └── dna.ts            # DNA types
│   ├── lib/                  # Library utilities
│   │   └── supabase.ts       # Supabase client factory
│   └── utils/                # Utility functions
│       └── supabase/         # Supabase utilities
│           ├── client.ts     # Browser client
│           └── server.ts    # Server client
├── public/                   # Static assets
│   └── assets/
│       └── onboarding/      # Onboarding images
├── package.json
├── next.config.ts           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind configuration
└── README.md
```

---

## Key Algorithms & Logic

### 1. DNA Similarity Calculation
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const normASqrt = Math.sqrt(normA);
  const normBSqrt = Math.sqrt(normB);
  
  if (normASqrt === 0 || normBSqrt === 0) return 0;
  
  return dotProduct / (normASqrt * normBSqrt);
}
```

**Usage**:
- Compares DNA v2 vectors
- Falls back to DNA v1
- Falls back to shared interests ratio

---

### 2. Star Rating Calculation
```typescript
function calculateStars(similarity: number): number {
  const percent = Math.round(similarity * 100);
  if (percent >= 75) return 5;
  if (percent >= 50) return 4;
  if (percent >= 30) return 3;
  if (percent >= 15) return 2;
  return 1;
}
```

---

### 3. Spiral Positioning Algorithm
```typescript
// Position friends in spiral around center
let index = 1;
for (const profile of profiles) {
  const angle = (index * 2.4) + Math.random() * 0.5;
  const radius = 120 + (index * 30) + Math.random() * 50;
  const x = 400 + Math.cos(angle) * radius;
  const y = 500 + Math.sin(angle) * radius;
  index++;
}
```

**Parameters**:
- Base angle: `2.4` radians per friend
- Base radius: `120px`
- Radius increment: `30px` per friend
- Random variation: `±0.5` radians, `±50px` radius

---

### 4. Interest Graph Collision Detection
```typescript
const MIN_DIST = 550; // Minimum distance between centers
const CLOUD_RADIUS = 2000; // Maximum placement radius

// Try up to 200 random positions
while (!valid && attempts < 200) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * CLOUD_RADIUS;
  const candidateX = r * Math.cos(angle);
  const candidateY = r * Math.sin(angle);
  
  // Check collision with existing centers
  let collision = false;
  for (const other of placedCenters) {
    const dx = candidateX - other.x;
    const dy = candidateY - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MIN_DIST) {
      collision = true;
      break;
    }
  }
  
  if (!collision) {
    valid = true;
  }
  attempts++;
}
```

---

### 5. Suggestion Filtering Logic
```typescript
// 1. Get matches from RPC
const matches = await supabase.rpc('match_profiles_v2', {
  query_embedding: userDna.composite_vector,
  match_threshold: 0.3,
  match_count: 20,
  ignore_user_id: user.id
});

// 2. Filter out users in network
const notInNetwork = matches.filter(m => 
  !connectedUserIds.has(m.id)
);

// 3. Filter out already-interacted
const notInteracted = notInNetwork.filter(m =>
  !interactedIds.has(m.id)
);

// 4. Take top 3
const top3 = notInteracted.slice(0, 3);
```

---

## Environment Variables

### Required
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional
```bash
NEXT_PUBLIC_YT_REVIEW_ENABLED=true  # Enable YouTube data review page
```

### Supabase Edge Functions
Edge functions require:
- Supabase project URL
- Service role key (for admin operations)
- OpenAI API key (for AI features)

---

## Deployment & Build

### Build Process
```bash
npm run build  # Build for production
npm run start  # Start production server
npm run dev    # Development server
```

### Build Output
- `.next/` directory contains:
  - Static pages
  - Server components
  - API routes
  - Optimized assets

### Deployment Considerations

1. **Environment Variables**:
   - Set in deployment platform (Vercel, etc.)
   - Never commit to git

2. **Supabase Configuration**:
   - Ensure RLS policies are set
   - Edge functions deployed
   - Storage buckets configured

3. **YouTube API**:
   - OAuth credentials configured
   - Quota limits considered
   - Error handling for rate limits

4. **Performance**:
   - Image optimization (Next.js Image component)
   - Code splitting (dynamic imports)
   - Lazy loading for heavy components

5. **Security**:
   - RLS policies on all tables
   - API keys in environment variables
   - HTTPS only
   - CORS configured

---

## Additional Notes

### Future Features (Not Yet Implemented)
- ARI chat interface (UI exists, backend in progress)
- TikTok integration
- Spotify integration
- Real-time messaging
- Notifications
- Profile analytics

### Known Limitations
- YouTube data sync is one-time (no automatic refresh)
- Suggestion limit: 3 at a time
- Connection limit for suggestions: ≤4 connections
- DNA v2 computation can take time (polling required)

### Performance Optimizations
- Memoized components (React.memo)
- Debounced search (300ms)
- Lazy loading for modals
- Pagination for YouTube data
- Caching for compatibility descriptions

---

## Conclusion

TheNetwork is a sophisticated social networking platform that uses AI and data analysis to create meaningful connections based on digital interests. The architecture is scalable, the codebase is well-organized, and the user experience is carefully designed to guide users through onboarding to active network participation.

The system leverages:
- **Supabase** for backend infrastructure
- **Next.js** for performant React rendering
- **D3.js/Sigma.js** for advanced visualizations
- **AI/ML** for interest analysis and matching
- **YouTube API** for data collection

The modular architecture allows for easy extension and maintenance, with clear separation of concerns between components, services, and data layers.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: TheNetwork Team

