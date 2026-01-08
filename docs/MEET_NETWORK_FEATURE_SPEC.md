# Feature Specification: Meet People in Your Network
## IRL Events & Location-Based Networking

**Version:** 1.0 (Simplified MVP)  
**Date:** January 2025  
**Status:** Specification Document  
**Owner:** Ayen / PM

---

## Executive Summary

**Meet People in Your Network** is a location-based feature that helps users discover and connect with people in their network who are in the same city/location. The feature uses shared interests to suggest activities and venues, then facilitates IRL meetups.

**Core Problem Solved:** "I'm in a city for 2 hours with nothing to do - I wish I could meet up with someone from my network who's also here."

**Core Value:** Turn shared interests into shared action (a place + time) without deep surveillance. Simple flow: **interest → activity → place search → invite**.

**v1 Philosophy:** Focus on the social magic: "same place + shared interest + one-tap invite." No Google services required.

### v1 Simplifications (What We're NOT Doing)

**Removed for v1:**
- ❌ Any Google services (Calendar, Maps, Places)
- ❌ Automatic location detection (manual anchor selection)
- ❌ Automatic availability detection (manual time selection)
- ❌ Cron jobs (everything on-demand)
- ❌ Location tracking/persistence (privacy-first, session-only)

**v1 Focus:**
- ✅ Manual location anchor (school/city/browser GPS)
- ✅ Manual time selection
- ✅ Interest → activity → place search (Yelp/Foursquare APIs)
- ✅ In-app meetup creation and invites
- ✅ Simple, privacy-first approach

---

## 1. Goals & Objectives

### Primary Goals
1. **Interest → Activity → Place**: Convert shared interests into concrete venue suggestions
2. **City-Level Matching**: Show users who in their network is in the same city
3. **One-Tap Invites**: Simple in-app invitation flow (no Calendar writes required)
4. **Spontaneous Planning**: Enable quick meetups with minimal friction

### v1 Scope (What We're NOT Doing)
- ❌ Any Google services (Calendar, Maps, Places)
- ❌ Automatic location detection (manual anchor selection)
- ❌ Automatic availability detection (manual time selection)
- ❌ Deep surveillance (city-level only, opt-in precise)

### Success Metrics
- **Event Creation Rate**: Number of events created per week
- **Event Acceptance Rate**: % of suggested events that get accepted
- **IRL Meetups Completed**: Actual meetups that happen (self-reported or verified)
- **User Engagement**: Daily/weekly active users on this tab
- **Time Saved**: Users finding things to do instead of being idle

### Anti-Goals (What We're NOT Doing)
- ❌ Full event planning platform (that's Prime agent's job)
- ❌ Dating app features
- ❌ Public event discovery (only network connections)
- ❌ Complex scheduling (keep it simple and spontaneous)

---

## 2. User Experience

### 2.1 Where It Appears

**Location:** New tab on ARI page (`/msg-aria`)

**Tab Name Options:**
- "Meet Your Network"
- "IRL Events"
- "Meet People"
- "Nearby Network"

**Visual Placement:**
- New tab alongside existing ARI content
- Tab appears only if user has completed prerequisites (see Prerequisites section)

### 2.2 Prerequisites & Gating

**Before users can access this feature, they must:**

1. **Profile Must Be Filled Out**
   - Check if profile has required fields (interests, school, etc.)
   - If incomplete → Show message: "Complete your profile to use this feature"
   - Redirect to edit profile page
   - Gate: Block access until profile is complete

2. **School Email Verification (Required for Safety)**
   - User must verify their school email (e.g., columbia.edu)
   - Verification process:
     - User enters school email address
     - System sends verification code to that email
     - User enters code to verify
     - Verification status stored in database
   - **Why:** Safety requirement - if meeting IRL, need to verify identity
   - Gate: Block access until email is verified

**Prerequisites Check Flow:**
```
User clicks "Meet Your Network" tab
  ↓
Check profile completeness (interests, school required)
  ↓ (if incomplete)
Show: "Complete your profile" → Redirect to edit profile
  ↓ (if complete)
Check school email verification
  ↓ (if not verified)
Show: "Verify your school email to use this feature"
  → Trigger email verification flow
  ↓ (if verified)
Show main feature interface
```

**Note:** No OAuth or external services required for v1. Location is determined from verified school email → city mapping.

### 2.3 Main Interface

**When prerequisites are met, user sees:**

#### Step 1: Location (Auto-Detected from Verified School Email)
- **Header**: "You're in [City]" (auto-detected)
- **How it works:**
  - System reads verified school email domain (e.g., columbia.edu)
  - Maps email domain → school → city (e.g., columbia.edu → Columbia University → NYC)
  - During school semester: Assumes user is in that city
  - Shows: "You're in New York City" (from Columbia University)
- **Manual Override (Optional):**
  - User can manually change city if traveling/not at school
  - "I'm traveling" → Manual city selection

#### Step 2: Select Time Availability
- **Header**: "When are you free?"
- **Options:**
  - "Free now"
  - "Later today"
  - "This weekend"
  - Custom date/time picker
- **Selected**: Shows availability window

#### Section 3: People in Your Network (Same City)
- **Header**: "3 people near Columbia University" (or selected anchor)
- **List of connections** who are in the same city
- Shows:
  - Avatar
  - Name
  - Compatibility score
  - Shared interests (2-3 tags)
  - "Suggest Meetup" button

#### Section 4: Discovered Events (City Events)
- **Header**: "Events in [City] Today"
- **Event cards** showing:
  - Event name/title
  - Event type (concert, art show, meetup, etc.)
  - Date/time
  - Location/venue
  - Description (if available)
  - "Add to Calendar" button
  - "Invite [Person]" button (to invite network connection)
- **Source:** Web search API (runs daily at 12pm ET/PST)
- **Quantity:** 5-10 events per day per city

#### Section 5: Suggested Meetups (Simple Activities)
- **Header**: "Simple Meetups"
- **Meetup cards** showing:
  - Activity type (e.g., "Coffee", "Museum", "Concert")
  - Shared interest tags
  - **3 suggested venues** (name, address, rating, distance)
  - Proposed time (from user's availability selection)
  - Matched person (if suggesting to specific person)
  - "Create Meetup" button

#### Section 5: Discovered Events (City Events)
- **Header**: "Events in [City] Today"
- **Event cards** showing:
  - Event name/title
  - Event type (concert, art show, meetup, etc.)
  - Date/time
  - Location/venue
  - Description (if available)
  - "Add to Calendar" button
  - "Invite [Person]" button (to invite network connection)
- **Source:** Web search API (runs daily at 12pm ET/PST)
- **Quantity:** 5-10 events per day per city

#### Section 6: Your Internal Calendar
- **Header**: "Your Calendar"
- **Internal calendar view** (not Google Calendar)
- Shows:
  - Events from "Discovered Events" (added by user)
  - Meetups user created or accepted
  - Date/time
  - Location
  - Attendees
  - Status (pending, confirmed, completed)
- **Features:**
  - Add events to calendar
  - View by day/week/month
  - See availability gaps

#### Section 7: Your Upcoming Meetups
- **Header**: "Your IRL Meetups"
- **List of meetups** user has created or accepted
- Shows:
  - Activity type
  - Date/time
  - Venue name
  - Attendees
  - Status (pending, confirmed, completed)

---

## 3. Core Functionality

### 3.1 Location Detection (From Verified School Email)

**How we determine user location:**

#### Method 1: Verified School Email → City (Primary)
- User has verified school email (e.g., columbia.edu)
- System maps email domain → school → city
- **Mapping Logic:**
  - `columbia.edu` → "Columbia University" → "New York City"
  - `hunter.cuny.edu` → "Hunter College" → "New York City"
  - `nyu.edu` → "NYU" → "New York City"
  - `stanford.edu` → "Stanford University" → "Palo Alto"
- **Assumption:** During school semester, user is in that city
- **Example**: Verified columbia.edu → Auto-detected: "New York City"

#### Method 2: Manual Override (Optional)
- User can manually change city if traveling/not at school
- "I'm traveling" → Manual city selection dropdown
- Override stored in session only (not persistent)

#### Method 3: Browser GPS (Optional, Fallback)
- If no verified school email, user can use GPS
- Browser geolocation API (no OAuth needed)
- Reverse geocode lat/lng → city name
- **Privacy**: City-level only, not precise coordinates

**Location Storage:**
- Primary: Derived from verified school email (automatic)
- Override: Manual selection (session-only)
- No persistent location tracking (privacy-first)

### 3.2 Time Availability Selection (v1 Simplified)

**How we determine when user is free:**

#### Manual Selection (v1):
- User selects from options:
  - "Free now" → Current time + 2 hours
  - "Later today" → Time picker for today
  - "This weekend" → Date + time picker
  - Custom date/time picker
- No Calendar parsing required
- Simple, user-controlled

**Time Window:**
- Default: 1-2 hour window
- User can adjust start/end time
- Stored as `start_time` and `end_time` for event

### 3.3 Network Matching (Same City)

**How we find people in user's network who are in the same city:**

#### Step 1: Get User's Selected Anchor
- Use selected location anchor (school/city/GPS)

#### Step 2: Get Network Connections
- Fetch all accepted connections from `user_connections`
- Get their profiles

#### Step 3: Check Their Cities
- For each connection:
  - Check their profile: school → city (using same mapping)
  - Check their home city (from profile)
  - **City-level matching only** (privacy-first)
- Determine if they're in the same city as user's anchor

#### Step 4: Rank by Compatibility
- Calculate compatibility score (DNA similarity)
- Count shared interests
- Rank: Compatibility > Shared Interests

#### Step 5: Display Results
- Show top matches (3-5 people)
- Display compatibility, shared interests
- Show: "3 people near [Anchor]"

### 3.4 Interest → Activity → Place Search Algorithm

**Core Flow: `shared_interest_tags → activity_type → place_search`**

#### Step 1: Identify Shared Interests
- Get intersection of user's and matched person's interests
- Prioritize interests with high compatibility scores
- **Example**: Both have "entrepreneurship" and "coffee" → Use both

#### Step 2: Map Interests to Activity Templates
- Interest → Activity mapping:
  - "entrepreneurship" → coffee / coworking / founder talk
  - "art" → gallery / museum
  - "music" → live music venue / concert
  - "coffee" → coffee shop
  - "food" → restaurant
  - "books" → bookstore / library
  - "tech" → coworking space / tech meetup

#### Step 3: Build Place Search Query
- **Yelp API**: `term="coffee"` + `location="New York, NY"`
  - Simple term + city search
  - Works great for activity + city
  
- **Foursquare API** (if we have lat/lng):
  - Query: `query="coffee"` + `ll=40.7128,-74.0060`
  - More precise, requires coordinates

#### Step 4: Call POI Provider API

**Option A: Yelp Fusion API (Recommended)**
```
GET https://api.yelp.com/v3/businesses/search
  ?term=coffee
  &location=New York, NY
  &Authorization: Bearer API_KEY
```

**Option C: Foursquare Places API**
```
GET https://api.foursquare.com/v3/places/search
  ?query=coffee
  &ll=40.7128,-74.0060
  &Authorization: Bearer API_KEY
```

#### Step 5: Rank Results
- **Rating** (4+ stars preferred)
- **Distance** (closer to anchor = better)
- **Open now** (if available from API)
- **Relevance** (matches activity type)

#### Step 6: Generate Meetup Suggestion
- **Activity type**: "Coffee"
- **3 suggested venues** (name, address, rating, distance)
- **Proposed time**: From user's availability selection
- **Shared interest tags**: "entrepreneurship", "coffee"
- **"Create Meetup" button**

### 3.5 Meetup Creation Flow (v1 Simplified)

**When user clicks "Create Meetup" or "Suggest Meetup":**

#### Step 1: Select Activity
- User picks from suggested activities (from shared interests)
- Or enters custom activity

#### Step 2: Select Venue
- Pre-filled with 3 suggested venues (from POI search)
- User can pick one of the 3
- Or search for other venues (using same POI API)
- Or enter custom location

#### Step 3: Select Time
- Pre-filled with user's selected availability
- User can adjust time
- Simple time picker

#### Step 4: Invite People
- Pre-selected: The matched person (if suggesting to specific person)
- User can add more people from network (who are in same city)
- Shows list of people in same city

#### Step 5: Create Meetup
- Store in `irl_events` table
- Create `irl_event_attendees` entries
- Send in-app notification to invited people
- **All in-app, no external services**

### 3.6 Email Verification System

**Purpose:** Verify users actually attend the school they claim (safety requirement for IRL meetups)

**Flow:**
1. User enters school email address (e.g., `user@columbia.edu`)
2. System validates email format (must match school domain)
3. System sends 6-digit verification code to that email
4. User enters code from email
5. System verifies code matches
6. Mark email as verified in database
7. Extract school from email domain (columbia.edu → Columbia University)

**Email Domain → School Mapping:**
- Use LLM or hardcoded mapping to extract school name from domain
- Examples:
  - `columbia.edu` → "Columbia University"
  - `hunter.cuny.edu` → "Hunter College"
  - `nyu.edu` → "NYU"
  - `stanford.edu` → "Stanford University"

**Verification Status:**
- Stored in `user_school_verifications` table
- Required before accessing "Meet Your Network" feature
- Shows verification badge in profile

### 3.7 School → City Mapping

**Purpose:** Automatically determine user's city from verified school email

**Mapping Logic:**
- **Method 1: Hardcoded Mapping (Primary)**
  - `columbia.edu` → "Columbia University" → "New York City"
  - `hunter.cuny.edu` → "Hunter College" → "New York City" (Manhattan)
  - `nyu.edu` → "NYU" → "New York City"
  - `stanford.edu` → "Stanford University" → "Palo Alto"
  - Store in `school_city_mapping` table

- **Method 2: LLM Extraction (Fallback)**
  - If school not in mapping table, use LLM to extract city
  - Prompt: "What city is [School Name] located in?"
  - Cache result in mapping table for future use

**Assumption:**
- During school semester, user is in that city
- User can manually override if traveling

### 3.8 Event Discovery via Web Search

**Purpose:** Discover real events happening in the city (concerts, art shows, meetups, etc.)

**Daily Cron Job (12pm ET/PST):**
1. Get all cities with verified users
2. For each city:
   - Build search query: "events in [City] today" or "concerts [City] this week"
   - Call web search API (e.g., SerpAPI, Bing Search API, or similar)
   - Parse results to extract:
     - Event name/title
     - Date/time
     - Location/venue
     - Description
     - Event type
   - Filter and rank events
   - Store top 5-10 events in `city_events` table

**Search Query Examples:**
- "events New York City today"
- "concerts Manhattan this week"
- "art shows NYC"
- "tech meetups San Francisco"

**Event Types to Discover:**
- Concerts/live music
- Art shows/galleries
- Tech meetups
- Networking events
- Food events
- Sports events
- Cultural events

**Storage:**
- Store in `city_events` table
- One row per event per day
- Link to city
- Expire after event date passes

### 3.9 Internal Calendar System

**Purpose:** Internal calendar within the app (not Google Calendar)

**Features:**
- **Add Events:**
  - From "Discovered Events" → Click "Add to Calendar"
  - From meetup creation → Automatically added
  - Manual event creation

- **View Modes:**
  - Day view
  - Week view
  - Month view

- **Event Types:**
  - Discovered events (from web search)
  - Meetups (created/accepted)
  - Manual events (user-created)

- **Availability Detection:**
  - Show gaps between events
  - Highlight free time windows
  - Suggest meetup times based on gaps

**Storage:**
- `user_calendar_events` table
- Links to `city_events` (if from discovery)
- Links to `irl_events` (if meetup)
- Standalone events (manual)

### 3.10 Event Management

**Event States:**
- **Pending**: Created, waiting for acceptance
- **Confirmed**: All invitees accepted
- **Completed**: Event happened (user marks as done)
- **Cancelled**: User cancels event

**Event Actions:**
- **Accept**: Invitee accepts invitation
- **Decline**: Invitee declines
- **Reschedule**: Change time/location
- **Add People**: Invite more network connections
- **Cancel**: Cancel event
- **Add to Calendar**: Add discovered event to internal calendar

---

## 4. Data Model

### 4.1 New Tables

#### `irl_events`
```sql
CREATE TABLE public.irl_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Event details
    event_name TEXT NOT NULL,
    activity_type TEXT,  -- 'coffee', 'museum', 'concert', 'custom'
    description TEXT,
    
    -- Location
    location_name TEXT NOT NULL,  -- Venue name
    location_address TEXT,
    city TEXT NOT NULL,
    latitude FLOAT,
    longitude FLOAT,
    
    -- Time
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,  -- Calculated
    
    -- Metadata
    shared_interests TEXT[],  -- Array of interest tags
    suggested_by_system BOOLEAN DEFAULT false,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',    -- Waiting for acceptance
        'confirmed',  -- All invitees accepted
        'completed',  -- Event happened
        'cancelled'   -- Cancelled
    )),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `irl_event_attendees`
```sql
CREATE TABLE public.irl_event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.irl_events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Invitation
    invited_by UUID REFERENCES public.profiles(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Response
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',   -- Invitation sent, no response
        'accepted',  -- User accepted
        'declined',  -- User declined
        'maybe'      -- User marked as maybe
    )),
    responded_at TIMESTAMPTZ,
    
    -- Attendance
    attended BOOLEAN,  -- Did user actually attend?
    attended_at TIMESTAMPTZ,
    
    UNIQUE(event_id, user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_school_verifications`
```sql
CREATE TABLE public.user_school_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Email
    school_email TEXT NOT NULL,  -- e.g., "user@columbia.edu"
    email_domain TEXT NOT NULL,  -- e.g., "columbia.edu"
    
    -- School info
    school_name TEXT,  -- Extracted from domain (e.g., "Columbia University")
    city TEXT,  -- Auto-mapped from school (e.g., "New York City")
    
    -- Verification
    verification_code TEXT,  -- 6-digit code
    verification_code_expires_at TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    
    -- Metadata
    verification_attempts INTEGER DEFAULT 0,
    
    UNIQUE(user_id),  -- One verified email per user
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_school_verifications_user ON public.user_school_verifications(user_id);
CREATE INDEX idx_school_verifications_domain ON public.user_school_verifications(email_domain);
```

#### `school_city_mapping`
```sql
CREATE TABLE public.school_city_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_domain TEXT UNIQUE NOT NULL,  -- e.g., "columbia.edu"
    school_name TEXT NOT NULL,  -- e.g., "Columbia University"
    city TEXT NOT NULL,  -- e.g., "New York City"
    state TEXT,  -- e.g., "NY"
    country TEXT DEFAULT 'USA',
    
    -- Metadata
    verified BOOLEAN DEFAULT true,  -- Manually verified mapping
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO public.school_city_mapping (email_domain, school_name, city, state) VALUES
  ('columbia.edu', 'Columbia University', 'New York City', 'NY'),
  ('hunter.cuny.edu', 'Hunter College', 'New York City', 'NY'),
  ('nyu.edu', 'NYU', 'New York City', 'NY'),
  ('stanford.edu', 'Stanford University', 'Palo Alto', 'CA'),
  ('berkeley.edu', 'UC Berkeley', 'Berkeley', 'CA')
  -- Add more as needed
;

CREATE INDEX idx_school_city_domain ON public.school_city_mapping(email_domain);
```

#### `city_events` (Discovered Events from Web Search)
```sql
CREATE TABLE public.city_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event details
    event_name TEXT NOT NULL,
    event_type TEXT,  -- 'concert', 'art_show', 'meetup', 'sports', etc.
    description TEXT,
    
    -- Location
    city TEXT NOT NULL,
    venue_name TEXT,
    venue_address TEXT,
    latitude FLOAT,
    longitude FLOAT,
    
    -- Time
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    event_date DATE NOT NULL,  -- For easy querying
    
    -- Source
    source_url TEXT,  -- URL where event was found
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    search_query TEXT,  -- Original search query used
    relevance_score FLOAT,  -- How relevant to city/interests
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_city_events_city_date ON public.city_events(city, event_date);
CREATE INDEX idx_city_events_date ON public.city_events(event_date);
```

#### `user_calendar_events` (Internal Calendar)
```sql
CREATE TABLE public.user_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Event reference
    city_event_id UUID REFERENCES public.city_events(id) ON DELETE SET NULL,  -- If from discovered events
    irl_event_id UUID REFERENCES public.irl_events(id) ON DELETE SET NULL,  -- If from meetup
    is_manual BOOLEAN DEFAULT false,  -- If user-created manually
    
    -- Event details (if manual or for display)
    event_name TEXT NOT NULL,
    event_type TEXT,
    description TEXT,
    
    -- Location
    location_name TEXT,
    location_address TEXT,
    city TEXT,
    
    -- Time
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT false,
    
    -- Metadata
    color TEXT,  -- For calendar display
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_user_time ON public.user_calendar_events(user_id, start_time);
CREATE INDEX idx_calendar_user_date ON public.user_calendar_events(user_id, (start_time::date));
```

### 4.2 Existing Tables Used

- `profiles` - User profiles, interests, DNA
- `user_connections` - Network connections
- `digital_dna_v2` - Compatibility matching
- `agent_handles` - User handles

### 4.3 API Keys & Permissions Required (v1)

**Yelp Fusion API (or Foursquare):**
- API key (server-side only)
- No OAuth required
- Used for venue search

**Browser Geolocation:**
- Location permission (optional, for "Use my location")
- No OAuth required
- Browser native API

**No external OAuth or Google services needed for v1!**

---

## 5. Technical Architecture (v1 Simplified)

### 5.1 Location Detection Flow (From Verified School Email)

```
User opens "Meet Your Network" tab
  ↓
Check prerequisites (profile + verified school email)
  ↓
Get verified school email domain (e.g., columbia.edu)
  ↓
Lookup school → city mapping:
  - columbia.edu → Columbia University → New York City
  ↓
Auto-detect city: "New York City"
  ↓
Use for matching and venue search
  ↓
(Optional: User can manually override if traveling)
```

### 5.2 Time Selection Flow

```
User selects availability:
  - "Free now" → Current time + 2 hours
  - "Later today" → Time picker
  - "This weekend" → Date + time picker
  ↓
Store time window in state
  ↓
Use for meetup creation
```

### 5.3 Network Matching Flow (v1)

```
Get user's selected anchor (city)
  ↓
Get all network connections (from user_connections)
  ↓
For each connection:
  - Check profile: school → city (using mapping)
  - Check profile: home city
  ↓
Filter: same city as user's anchor
  ↓
Calculate compatibility (DNA similarity)
  ↓
Count shared interests
  ↓
Rank by: compatibility > shared interests
  ↓
Return top 3-5 matches
```

### 5.4 Interest → Activity → Place Search Flow

```
Get user + matched person's interests
  ↓
Find shared interests
  ↓
Map interests to activity templates:
  - "entrepreneurship" → coffee / coworking
  - "art" → gallery / museum
  - etc.
  ↓
Build search query:
  - Yelp: term="coffee" + location="New York, NY"
  - OR Foursquare: query="coffee" + ll=lat,lng
  ↓
Call POI API (Yelp / Foursquare):
  - Query with anchor location
  - Filter by rating (4+)
  - Limit to 10 results
  ↓
Rank results:
  - Rating (descending)
  - Distance from anchor (ascending)
  - Open now (if available)
  ↓
Return top 3 venues
  ↓
Generate meetup suggestion card
```

### 5.5 Event Discovery Flow

```
Daily Cron Job (12pm ET/PST)
  ↓
Get all unique cities (from verified users' school emails)
  ↓
For each city:
  - Build search queries: "events in [City] today", "concerts [City] this week"
  - Call web search API (SerpAPI/Bing)
  - Parse results (use LLM if needed to structure)
  - Extract: event name, date, location, description
  - Rank and filter events
  - Store top 5-10 in city_events table
  ↓
Clean up old events (past event_date)
```

### 5.6 Background Jobs (v1)

**Required Cron Job:**

#### Job 1: Daily Event Discovery (12pm ET/PST)
**Purpose:** Discover events happening in cities via web search API

**Process:**
1. Get all unique cities from verified users (from `user_school_verifications`)
2. For each city:
   - Build search queries:
     - "events in [City] today"
     - "concerts [City] this week"
     - "art shows [City]"
     - "tech meetups [City]"
   - Call web search API (SerpAPI, Bing Search API, or similar)
   - Parse results to extract event details
   - Filter and rank events
   - Store top 5-10 events in `city_events` table
3. Clean up old events (past event_date)

**Implementation:**
- Supabase Edge Function (cron trigger)
- Or external cron service (Vercel Cron, GitHub Actions)
- Runs daily at 12pm ET/PST

**On-Demand Processing:**
- Location detection: From verified school email (automatic)
- Time availability: User selects manually
- Network matching: Calculated when user opens tab
- Venue search: Triggered when user clicks "Suggest Meetup"

---

## 6. APIs Integration (v1 - No Google Services)

### 6.0 Web Search API (For Event Discovery)

**Purpose:** Discover real events happening in cities

**Options:**

#### Option A: SerpAPI
```
GET https://serpapi.com/search
  ?engine=google
  &q=events+New+York+City+today
  &api_key=API_KEY
```

#### Option B: Bing Search API
```
GET https://api.bing.microsoft.com/v7.0/search
  ?q=events+New+York+City+today
  &count=10
  &Authorization: Bearer API_KEY
```

#### Option C: Google Custom Search API (if allowed)
- Requires API key (not OAuth)
- Similar to SerpAPI but official Google API

**Query Building:**
- "events in [City] today"
- "concerts [City] this week"
- "art shows [City]"
- "tech meetups [City]"

**Result Parsing:**
- Extract event name, date, location, description
- Use LLM to structure unstructured search results
- Or use structured data if available

**Rate Limits:**
- SerpAPI: 100 searches/month (free), more on paid
- Bing: 3,000 queries/month (free tier)
- Cache results aggressively

---

## 6.1 POI APIs Integration (For Venue Search)

### 6.1 Yelp Fusion API (Recommended)

**Why:** Strong consumer venue data + reviews, no Google dependency

**Endpoint:**
```
GET https://api.yelp.com/v3/businesses/search
  ?term=coffee
  &location=New York, NY
  &limit=10
  &Authorization: Bearer API_KEY
```

**Query Building:**
- `term`: Activity type (coffee, museum, coworking, etc.)
- `location`: City name or "City, State" (from anchor)
- `limit`: Number of results (default 20, max 50)

**Response Fields:**
- `name` - Venue name
- `location.address1` - Address
- `location.city` - City
- `rating` - Rating (1-5)
- `review_count` - Number of reviews
- `coordinates.latitude` / `coordinates.longitude` - Lat/lng
- `price` - Price level ($, $$, $$$, $$$$)

**Rate Limits:**
- Free tier: 5,000 requests/day
- Paid: Higher limits available
- **Recommendation:** Cache results aggressively

**Authentication:**
- Bearer token (API key)
- Server-side only (never expose in client)
- Use Supabase Edge Function to proxy requests

### 6.2 Alternative: Foursquare Places API

**Why:** Comprehensive venue database, good for all venue types

**Endpoint:**
```
GET https://api.foursquare.com/v3/places/search
  ?query=coffee
  &ll=40.7128,-74.0060
  &radius=5000
  &Authorization: Bearer API_KEY
```

**Query Building:**
- `query`: Activity type or venue name
- `ll`: Latitude,longitude (if we have GPS coordinates)
- `near`: City name (alternative to ll)
- `radius`: Search radius in meters

**Pros:**
- Comprehensive venue database
- Good for all venue types
- Includes categories/tags

**Cons:**
- Requires coordinates or city name
- Less consumer-focused than Yelp

### 6.3 Geocoding (For Browser GPS - No Google)

**Option A: OpenStreetMap Nominatim (Free)**
```
GET https://nominatim.openstreetmap.org/reverse
  ?lat=40.7128
  &lon=-74.0060
  &format=json
```
- Reverse geocode: lat/lng → city name
- Use when user clicks "Use my location"
- **Rate limit:** 1 request/second (must cache)
- **Must cache:** Results don't change frequently

**Option B: Mapbox Geocoding**
- Similar functionality
- Paid service
- Better rate limits than Nominatim

**Option C: Skip Geocoding**
- If user selects "Use my location", just use coordinates directly
- Pass coordinates to Foursquare (which accepts lat/lng)
- For Yelp, use city name from profile or manual selection

### 6.4 Implementation Recommendation

**v1 Approach:**
1. **Primary:** Yelp Fusion API
   - Great for restaurants, cafes, venues
   - Strong review data
   - Simple city-based search
   
2. **Fallback:** Foursquare (if Yelp fails or for specific use cases)

3. **Geocoding:** OpenStreetMap Nominatim (free, with caching)
   - Or skip geocoding and use city from profile/manual selection

**API Key Management:**
- Store in Supabase Edge Function environment variables
- Never expose in client code
- Proxy all API calls through Edge Function

**Caching Strategy:**
- Cache venue search results (same query = same results)
- Cache for 24 hours
- Store in database table or Redis
- Cache geocoding results (coordinates → city doesn't change)

---

## 7. Implementation Phases (v1 Simplified)

### Phase 1: Prerequisites & Basic UI (Week 1)
- [ ] Profile completeness check (interests required)
- [ ] Prerequisites UI/gating logic
- [ ] Basic tab structure on ARI page
- [ ] Location anchor selection UI (school dropdown, "Use my location", manual city)
- [ ] Time availability selection UI ("Free now", "Later today", time picker)

### Phase 2: School → City Mapping (Week 1-2)
- [ ] Create `school_city_mapping` table
- [ ] Seed data (major schools → cities)
- [ ] Email domain → school → city mapping logic
- [ ] Auto-detect city from verified school email
- [ ] Manual city override option

### Phase 3: Network Matching (Week 2)
- [ ] Same-city matching algorithm (from verified school emails)
- [ ] Filter: Only show connections with verified emails
- [ ] Compatibility calculation (DNA similarity)
- [ ] Ranking by compatibility + shared interests
- [ ] Display matched people UI
- [ ] "Suggest Meetup" button

### Phase 4: Interest → Activity Mapping (Week 2-3)
- [ ] Interest → activity template mapping
- [ ] Activity type definitions
- [ ] Shared interest detection
- [ ] Activity suggestion logic

### Phase 5: POI API Integration (Week 3)
- [ ] Yelp Fusion API setup (API key, Edge Function proxy)
- [ ] Business Search implementation (term + location)
- [ ] Response parsing (venue name, address, rating, distance)
- [ ] Caching strategy (24-hour cache)
- [ ] Fallback to Foursquare (if needed)

### Phase 6: Venue Search & Ranking (Week 3-4)
- [ ] Build search queries from activity types
- [ ] Call POI API with anchor location
- [ ] Rank results (rating, distance, open now)
- [ ] Return top 3 venues
- [ ] Display venue cards

### Phase 7: Meetup Creation (Week 4)
- [ ] `irl_events` and `irl_event_attendees` tables
- [ ] Meetup creation flow (activity, venue, time, people)
- [ ] In-app invitation system
- [ ] Event status management (pending, confirmed, completed)
- [ ] Notification system

### Phase 8: Browser Geolocation (Week 4, Optional)
- [ ] "Use my location" button
- [ ] Browser geolocation API integration
- [ ] Reverse geocoding (lat/lng → city) using OpenStreetMap Nominatim
- [ ] Privacy handling (city-level only)
- [ ] Caching geocoding results

### Phase 9: UI/UX Polish (Week 5)
- [ ] Meetup suggestion cards design
- [ ] Venue selection UI
- [ ] Empty states
- [ ] Loading states
- [ ] Error handling

**No cron jobs needed for v1!** Everything is on-demand.

---

## 8. Open Questions & Decisions Needed

### 8.1 Technical Decisions
- [ ] Which web search API? (SerpAPI, Bing, or Google Custom Search)
- [ ] How to parse unstructured search results? (LLM extraction or manual parsing)
- [ ] Which POI provider? (Yelp recommended, Foursquare as fallback)
- [ ] How to cache venue search results? (Database table, Redis, or in-memory?)
- [ ] Cache TTL? (24 hours recommended)
- [ ] How to handle API rate limits? (Request queuing, caching, fallback providers)
- [ ] Email verification: Use Supabase email service or external (SendGrid, etc.)?
- [ ] School name extraction: LLM or hardcoded mapping?

### 8.2 Product Decisions
- [ ] Default meetup duration? (1 hour? 2 hours?)
- [ ] Maximum distance for "same city"? (city-level only, or allow nearby cities?)
- [ ] Should meetups be repeatable? (weekly coffee, etc.) - v2 feature
- [ ] Can users create meetups with non-network people? (v1: network only)
- [ ] How to verify meetups actually happened? (self-report? check-in?) - v2 feature

### 8.3 Design Decisions
- [ ] Tab name: "Meet Your Network" vs "IRL Events" vs "Nearby"?
- [ ] Should we show a map view? (v1: list view only, map in v2)
- [ ] How many venue suggestions? (3 recommended)
- [ ] Meetup card design?
- [ ] Notification design?

### 8.4 Privacy & Safety
- [ ] How much location data to share? (v1: city-level only, opt-in precise)
- [ ] Can users opt out? (Yes, don't select location anchor)
- [ ] Safety features for IRL meetups? (v2: reporting, blocking)
- [ ] Data retention? (Don't persist location data, only selected anchor in session)

---

## 9. Risks & Mitigations

### 9.1 Risk: Privacy Concerns
**Impact:** Users uncomfortable sharing location  
**Mitigation:**
- Clear privacy policy
- Opt-in only
- Granular controls (share city only, not exact location)
- Easy opt-out

### 9.2 Risk: Low Match Rate
**Impact:** Users rarely find people in same city  
**Mitigation:**
- Start with major cities (NYC, SF, LA, etc.)
- Use profile data (school location) as primary source
- Show "no matches" gracefully with suggestions
- Allow manual city selection to expand options

### 9.3 Risk: API Rate Limits
**Impact:** Yelp/Foursquare APIs have rate limits  
**Mitigation:**
- Cache results aggressively (24-hour cache)
- Batch API calls where possible
- Use fallback provider if primary hits limits
- Monitor usage closely
- OpenStreetMap Nominatim: Strict 1 req/sec limit, must cache

### 9.4 Risk: Stale Location Data
**Impact:** Show users in wrong city  
**Mitigation:**
- No persistent location tracking (session-only)
- User manually selects location each time
- Allow manual override
- Use profile data (school) as default, user can change

### 9.5 Risk: No-Show Events
**Impact:** Events created but people don't show up  
**Mitigation:**
- Reminder notifications
- Easy cancellation
- Track completion rate
- Learn from patterns

---

## 10. Success Criteria

### MVP Success (v1)
- [ ] Users can select location anchor (school/city/GPS)
- [ ] Users can see people in their network who are in same city
- [ ] Users can get venue suggestions based on shared interests
- [ ] Users can create meetups with venue + time + people
- [ ] Meetups can be accepted/declined in-app
- [ ] POI search works (Yelp Fusion API)

### Future Enhancements (Post-MVP)
- [ ] Map view of venues/meetups (using non-Google map provider)
- [ ] Repeatable meetups (weekly coffee, etc.)
- [ ] Group meetups (3+ people)
- [ ] Meetup recommendations based on past meetups
- [ ] Integration with Prime agent for event planning
- [ ] Check-in feature (verify attendance)
- [ ] Meetup photos/memories

---

## 11. Appendix

### 11.1 Example User Flow

**Scenario:** User is in NYC for 2 hours before a meeting

1. User opens app, clicks "Meet Your Network" tab
2. System checks prerequisites → profile complete
3. User selects location anchor: "Columbia University" → NYC
4. User selects time: "Free now" → 2pm-4pm
5. System shows:
   - "You're in NYC, free for 2 hours"
   - "3 people in your network are also in NYC"
   - "Suggested meetups: Coffee, Museum visit, etc."
6. User clicks "Suggest Meetup" on a matched person
7. System maps shared interests → "Coffee" activity
8. System calls Yelp API: "coffee in New York, NY"
9. System suggests 3 venues (Blue Bottle, etc.)
10. User picks venue, confirms time (2:30pm)
11. Meetup created, invitation sent in-app
12. Matched person accepts in-app
13. Meetup confirmed
14. Users meet up IRL

### 11.2 Location Anchor Examples

**School → City Mapping:**
- "Columbia University" → "New York City"
- "Stanford University" → "Palo Alto"
- "UC Berkeley" → "Berkeley"

**Manual City Selection:**
- User selects "New York, NY" from dropdown
- User selects "San Francisco, CA"

**Browser GPS (Optional):**
- Coordinates (40.7128, -74.0060) → Reverse geocode → "New York, NY"
- Use OpenStreetMap Nominatim for free geocoding

### 11.3 Interest → Activity Mapping

```
Interests → Activities:
- "Coffee" → Coffee shops, cafes
- "Art" → Museums, galleries, art walks
- "Music" → Concerts, live music, record stores
- "Food" → Restaurants, food tours, markets
- "Books" → Bookstores, libraries, reading groups
- "Tech" → Tech meetups, coworking spaces, hackathons
- "Fitness" → Gyms, running trails, yoga studios
- "Nature" → Parks, hiking, outdoor activities
```

---

## Document Status

**Version:** 1.0  
**Last Updated:** January 2025  
**Next Review:** After initial implementation  
**Status:** Ready for Review

---

**End of Specification**