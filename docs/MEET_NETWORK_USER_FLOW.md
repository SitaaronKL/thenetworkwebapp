# User Flow: Meet People in Your Network
## Complete User Journey & Retention Strategy

**Version:** 2.0 (Simplified Auto-Matching Flow)  
**Date:** January 2025  
**Focus:** Automatic meetup generation based on free time overlap

---

## 🎯 Core Retention Philosophy

**The Hook:** "Block out your free times. We'll automatically find people in your network who are free at the same time and suggest meetups."

**The Loop:** 
1. User blocks free times in in-app calendar
2. System checks network connections for overlapping free times
3. System auto-generates meetups: "Go get coffee with [Person] at [Venue] at [Time]"
4. User accepts/declines meetup
5. Meetup happens → User marks as completed
6. User blocks more free times → Loop continues

---

## 📱 Complete User Journey

### Phase 1: First-Time User (Onboarding → First Use)

#### Step 1: Initial Signup (Existing Flow)
```
User signs up via Google OAuth
  ↓
Completes profile setup (interests, DNA, etc.)
  ↓
Lands on /network (home page)
```

#### Step 2: Email Verification (Gate)
**When:** User clicks "Meet Your Network" tab

**Flow:**
```
User clicks "Meet Your Network" tab (on ARI page)
  ↓
Check: Profile complete? ✅
  ↓
Check: Email verified? ❌
  ↓
Show: Email Verification Modal/Page
  ↓
User verifies email (columbia.edu → NYC detected)
  ↓
Show: In-App Calendar
```

#### Step 3: First Experience - Block Free Times
**When:** User verifies email and enters feature

**What They See:**
```
┌─────────────────────────────────────┐
│  Meet Your Network                  │
│                                      │
│  📍 You're in New York City         │
│  (from Columbia University)         │
│                                      │
│  ────────────────────────────────   │
│                                      │
│  📅 Your Calendar                   │
│                                      │
│  [Week View]                        │
│                                      │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun  │
│                                      │
│  [Click to block free times]        │
│                                      │
│  Example:                           │
│  • Click Wednesday 2-4pm            │
│  • Drag to block time               │
│  • Save                             │
│                                      │
│  [Save Free Times]                  │
└─────────────────────────────────────┘
```

**First-Time User Actions:**
1. **Block Free Times** (required)
   - Click on calendar day/time
   - Drag to block free time slot (e.g., Wednesday 2-4pm)
   - Save to database
   - System stores: `user_id`, `start_time`, `end_time`, `city`

2. **System Auto-Matches** (background)
   - System checks network connections in same city
   - Finds overlapping free times
   - Auto-generates meetup suggestions

**Retention Hook:**
- Show preview: "Once you block free times, we'll find people who are free at the same time!"

---

### Phase 2: Core Flow (Auto-Matching)

#### Step 1: User Blocks Free Times
```
User opens "Meet Your Network" tab
  ↓
Sees in-app calendar (week view)
  ↓
User clicks on time slot (e.g., Monday 1-3pm)
  ↓
User drags to block time: Monday 1:00pm - 3:00pm
  ↓
User clicks "Save"
  ↓
System saves to database:
  - user_id
  - start_time: Monday 1:00pm
  - end_time: Monday 3:00pm
  - city: "New York City" (from verified email)
```

#### Step 2: System Auto-Matches (Background)
```
System checks:
  - User's free times (Monday 1-3pm)
  - Network connections in same city (NYC)
  - Their free times
  ↓
Finds overlap:
  - User: Free Monday 1-3pm (Hunter College)
  - Sarah: Free Monday 1-2pm (Columbia)
  - Overlap: Monday 1-2pm ✅
  ↓
System auto-generates meetup:
  - Person: Sarah (Columbia)
  - Time: Monday 1:00pm (1 hour overlap)
  - Activity: Coffee (from shared interests)
  - Venue: Search "coffee shop near Hunter College" OR "coffee shop near Columbia"
  - Result: "Go get coffee with Sarah at [Venue] at 1:00pm"
```

#### Step 3: User Sees Auto-Generated Meetup
```
User sees notification or opens tab
  ↓
Sees auto-generated meetup card:
  ┌─────────────────────────────────────┐
  │  ☕ Suggested Meetup                 │
  │                                      │
  │  Go get coffee with Sarah           │
  │  at Blue Bottle Coffee              │
  │  Monday 1:00pm                      │
  │                                      │
  │  [Accept] [Decline] [Reschedule]    │
  └─────────────────────────────────────┘
  ↓
User accepts
  ↓
Meetup confirmed, added to both calendars
```

#### Step 4: Venue Search (Automatic)
```
When system generates meetup:
  ↓
System determines:
  - User's school: Hunter College
  - Sarah's school: Columbia
  - Both in NYC (Manhattan)
  ↓
System searches:
  - Query: "coffee shop near Hunter College"
  - OR: "coffee shop near Columbia"
  - OR: "coffee shop Manhattan" (if both in same area)
  ↓
Web Search API returns:
  - Venue name: "Blue Bottle Coffee"
  - Address: "123 Main St, Manhattan"
  - Rating: 4.5 stars
  ↓
System creates meetup with venue info
```

### Phase 3: Returning User (Daily/Weekly Engagement)

#### Daily Return Flow
```
User opens app
  ↓
Sees notification badge on "Meet Your Network" tab
  ↓
Opens tab
  ↓
Sees:
  - Auto-generated meetup suggestions (from free time overlap)
  - Pending meetup invitations (from others)
  - Upcoming meetups (confirmed)
  - Calendar with blocked free times
```

#### Weekly Return Flow
```
Monday morning
  ↓
User opens app
  ↓
User blocks free times for the week
  ↓
System auto-matches throughout the week
  ↓
User sees:
  - "3 meetup suggestions based on your free times"
  - "You have 2 confirmed meetups this week"
```

---

## 🔄 Retention Loops

### Loop 1: Block Free Times → Auto-Match → Accept → Complete

**Flow:**
```
1. User blocks free times in calendar (Monday 1-3pm)
   ↓
2. System checks network connections in same city
   ↓
3. System finds overlap (Sarah free Monday 1-2pm)
   ↓
4. System searches venue: "coffee shop near Hunter College"
   ↓
5. System auto-generates: "Go get coffee with Sarah at [Venue] at 1:00pm"
   ↓
6. User receives notification: "New meetup suggestion!"
   ↓
7. User accepts meetup
   ↓
8. Meetup confirmed, added to both calendars
   ↓
9. Reminder sent (1 hour before)
   ↓
10. Meetup happens
   ↓
11. User marks as "completed"
   ↓
12. System suggests: "Block more free times to find more meetups!"
```

**Retention Hooks:**
- **Automatic:** No effort required - system does the work
- **Notifications:** "New meetup suggestion based on your free times!"
- **Success:** "You completed 3 meetups this week! Block more times?"

### Loop 2: Weekly Calendar Blocking → Continuous Matching

**Flow:**
```
1. User blocks free times for entire week
   ↓
2. System continuously checks for overlaps
   ↓
3. System generates meetups as overlaps are found
   ↓
4. User sees multiple suggestions throughout week
   ↓
5. User accepts/declines each suggestion
   ↓
6. Confirmed meetups appear in calendar
   ↓
7. User sees value: "I have 5 meetups this week!"
   ↓
8. User blocks more times next week
   ↓
9. Loop continues
```

**Retention Hooks:**
- **Habit:** "Block your free times every Monday"
- **Value:** "You have 5 meetups scheduled this week"
- **FOMO:** "3 people are free at the same time as you!"

### Loop 3: City-Based Matching (No Cross-City)

**Flow:**
```
1. User in NYC (Hunter College)
   ↓
2. System only matches with:
   - People in NYC (Columbia, NYU, Hunter, etc.)
   - NOT people in Toronto, SF, etc.
   ↓
3. System searches venues:
   - "coffee shop near Hunter College"
   - "coffee shop near Columbia"
   - "coffee shop Manhattan" (if both in same area)
   ↓
4. All meetups are local and convenient
```

**Retention Hooks:**
- **Relevance:** "All meetups are in your city"
- **Convenience:** "Venues are near your school"
- **Realistic:** "No long-distance meetups"

---

## 🎨 UI/UX Flow Details

### Tab Access (On ARI Page)

**Location:** `/msg-aria` (ARI page)

**Tab Structure:**
```
┌─────────────────────────────────────┐
│  [ARI Chat] [Meet Your Network]    │
│         ↑                           │
│    Active tab                       │
└─────────────────────────────────────┘
```

**Badge/Notification:**
- Show badge with count: "Meet Your Network (3)"
  - Count = auto-generated meetup suggestions + pending invitations
- If no notifications, no badge

### Main Interface (Simplified Flow)

#### 1. In-App Calendar (Primary View)
```
┌─────────────────────────────────────┐
│  Meet Your Network                  │
│                                      │
│  📍 You're in New York City         │
│  (from Hunter College)              │
│                                      │
│  ────────────────────────────────   │
│                                      │
│  📅 Your Calendar                   │
│                                      │
│  [Week View] [Month View]           │
│                                      │
│  Mon    Tue    Wed    Thu    Fri    │
│  1pm   2pm    1pm    3pm    2pm    │
│  2pm   3pm    2pm    4pm    3pm    │
│  [Block] [Block] [Block] [Block]   │
│                                      │
│  Click and drag to block free times │
│  [Save Free Times]                  │
└─────────────────────────────────────┘
```

**Calendar Features:**
- **Week View (Default):** Shows Monday-Sunday
- **Click to Block:** Click on time slot (e.g., Monday 1pm)
- **Drag to Block:** Drag to create time block (e.g., 1pm-3pm)
- **Visual:** Blocked times show as colored blocks
- **Save:** Saves all blocked times to database

#### 2. Auto-Generated Meetup Suggestions
```
┌─────────────────────────────────────┐
│  ☕ Suggested Meetups               │
│  (Based on your free times)         │
│                                      │
│  [Meetup Card 1]                    │
│  Go get coffee with Sarah           │
│  at Blue Bottle Coffee              │
│  Monday 1:00pm                      │
│  (You're both free 1-2pm)           │
│  [Accept] [Decline] [Reschedule]   │
│                                      │
│  [Meetup Card 2]                    │
│  Go get lunch with Alex             │
│  at Joe's Pizza                     │
│  Wednesday 1:00pm                   │
│  (You're both free 1-2pm)           │
│  [Accept] [Decline] [Reschedule]   │
└─────────────────────────────────────┘
```

**Priority:** Highest (action needed)
**Retention:** Automatic, no effort required

#### 3. Pending Invitations (From Others)
```
┌─────────────────────────────────────┐
│  📬 Pending Invitations             │
│                                      │
│  [Invitation Card]                 │
│  Sarah invited you to coffee        │
│  at Blue Bottle Coffee              │
│  Monday 1:00pm                      │
│  [Accept] [Decline] [Maybe]        │
└─────────────────────────────────────┘
```

**Priority:** High (action needed)
**Retention:** Social obligation

#### 4. Confirmed Meetups (In Calendar)
```
┌─────────────────────────────────────┐
│  📅 Confirmed Meetups               │
│                                      │
│  [Meetup Card]                      │
│  • Coffee with Sarah                │
│  • Monday 1:00pm @ Blue Bottle      │
│  [View Details] [Reschedule]        │
└─────────────────────────────────────┘
```

**Priority:** Medium (reminder)
**Retention:** Shows value (you have plans!)

---

## 🔔 Notification Strategy (Retention)

### Notification Types

#### 1. Auto-Generated Meetup Suggestion
**When:** System finds free time overlap
**Message:** "Go get coffee with Sarah at Blue Bottle Coffee at 1:00pm ☕"
**Action:** Opens meetup suggestion card

#### 2. Pending Invitation
**When:** Someone accepts auto-generated meetup
**Message:** "Sarah accepted! Coffee confirmed for Monday 1pm 🎉"
**Action:** Opens meetup details

#### 3. Meetup Reminder
**When:** 1 hour before meetup
**Message:** "Coffee with Sarah at Blue Bottle Coffee in 1 hour ☕"
**Action:** Opens meetup details with venue info

#### 4. New Free Time Overlap
**When:** System finds new overlap after user blocks times
**Message:** "3 new meetup suggestions based on your free times!"
**Action:** Opens "Meet Your Network" tab

#### 5. Weekly Reminder
**When:** Monday morning
**Message:** "Block your free times this week to find meetups! 📅"
**Action:** Opens calendar

#### 6. Success Summary
**When:** After meetup completion
**Message:** "You completed 3 meetups this week! Block more times? 🎉"
**Action:** Opens calendar

---

## 🎯 User Actions & Flows

### Action 1: Block Free Times (Core Action)

**Flow:**
```
User opens "Meet Your Network" tab
  ↓
Sees in-app calendar (week view)
  ↓
User clicks on time slot (e.g., Monday 1pm)
  ↓
User drags to create block (Monday 1pm - 3pm)
  ↓
Visual feedback: Block appears as colored rectangle
  ↓
User can:
  - Adjust block (drag edges)
  - Delete block (click X)
  - Add more blocks (click other times)
  ↓
User clicks "Save Free Times"
  ↓
System saves to database:
  - user_id
  - start_time: Monday 1:00pm
  - end_time: Monday 3:00pm
  - city: "New York City"
  ↓
System triggers auto-matching (background)
```

**Retention:** Creates habit, enables automatic matching

### Action 2: Accept Auto-Generated Meetup

**Flow:**
```
System finds overlap:
  - User: Free Monday 1-3pm (Hunter College)
  - Sarah: Free Monday 1-2pm (Columbia)
  - Overlap: Monday 1-2pm
  ↓
System searches venue:
  - Query: "coffee shop near Hunter College"
  - OR: "coffee shop near Columbia"
  - Returns: "Blue Bottle Coffee, 123 Main St"
  ↓
System generates meetup:
  - "Go get coffee with Sarah at Blue Bottle Coffee at 1:00pm"
  ↓
User receives notification: "New meetup suggestion!"
  ↓
User opens tab, sees meetup card
  ↓
User clicks "Accept"
  ↓
Meetup confirmed:
  - Added to both calendars
  - Reminder scheduled (1 hour before)
  - Confirmation sent to Sarah
```

**Retention:** Zero effort, automatic value

### Action 3: Decline/Reschedule Meetup

**Flow:**
```
User sees auto-generated meetup
  ↓
User clicks "Decline"
  ↓
System removes meetup suggestion
  ↓
OR User clicks "Reschedule"
  ↓
User selects new time (from their free times)
  ↓
System checks if Sarah is free at new time
  ↓
If yes: Meetup rescheduled
  ↓
If no: "Sarah is not free at that time"
```

**Retention:** User control, flexibility

### Action 4: Venue Search (Automatic)

**Flow:**
```
When system generates meetup:
  ↓
System determines:
  - User's school: Hunter College (NYC)
  - Sarah's school: Columbia (NYC)
  - Both in Manhattan
  ↓
System builds search query:
  - Option 1: "coffee shop near Hunter College"
  - Option 2: "coffee shop near Columbia"
  - Option 3: "coffee shop Manhattan" (if both in same area)
  ↓
System calls Web Search API:
  - SerpAPI or Bing Search API
  - Query: "coffee shop near Hunter College"
  ↓
API returns results:
  - Venue 1: "Blue Bottle Coffee" (4.5 stars, 0.5 miles)
  - Venue 2: "Starbucks" (4.0 stars, 0.3 miles)
  - Venue 3: "Joe Coffee" (4.2 stars, 0.7 miles)
  ↓
System selects best venue:
  - Highest rating + closest distance
  - Result: "Blue Bottle Coffee"
  ↓
System creates meetup with venue:
  - Name: "Blue Bottle Coffee"
  - Address: "123 Main St, Manhattan"
  - Time: Monday 1:00pm
```

**Retention:** Automatic, no user effort

---

## 📊 Retention Metrics to Track

### Engagement Metrics
- **Daily Active Users (DAU)** on "Meet Your Network" tab
- **Weekly Active Users (WAU)** on "Meet Your Network" tab
- **Time spent** in feature per session
- **Actions per session** (add event, create meetup, etc.)

### Conversion Metrics
- **Email verification rate** (how many complete verification)
- **First meetup creation rate** (within 7 days of verification)
- **Event addition rate** (events added to calendar)
- **Invitation acceptance rate** (invitations accepted)

### Retention Metrics
- **Day 1 retention** (return next day)
- **Day 7 retention** (return within 7 days)
- **Day 30 retention** (return within 30 days)
- **Meetup completion rate** (meetups that actually happen)

### Quality Metrics
- **Meetup success rate** (marked as completed)
- **Repeat meetup rate** (same people meet again)
- **Event attendance rate** (events marked as attended)

---

## 🚀 Growth Hooks

### Hook 1: Automatic Value
**Show:** "3 meetup suggestions based on your free times!"
**Effect:** Zero effort, automatic value - creates habit

### Hook 2: Free Time Overlap
**Show:** "Sarah is also free Monday 1-2pm - perfect match!"
**Effect:** Shows system is working, creates excitement

### Hook 3: Success Stories
**Show:** "You've completed 3 meetups this week! 🎉"
**Effect:** Positive reinforcement, gamification

### Hook 4: Convenience
**Show:** "All meetups are near your school"
**Effect:** Shows system is smart, reduces friction

### Hook 5: Network Growth
**Show:** "Jordan (Columbia) just joined - they're in NYC!"
**Effect:** Shows network is growing, more opportunities

---

## 🎓 Onboarding Best Practices

### Progressive Disclosure
1. **First visit:** Show calendar, explain blocking free times
2. **After blocking:** Show first auto-generated meetup suggestion
3. **After accepting:** Show value: "You have a meetup scheduled!"

### Empty States
- **No free times blocked:** "Block your free times to find meetups!"
- **No overlaps found:** "No overlaps yet. Block more times or invite friends!"
- **No meetups:** "Block your free times to get started!"

### Tooltips/Guides
- **First time:** Show tooltip: "Click and drag to block free times"
- **After blocking:** Show: "We're finding people who are free at the same time!"
- **First meetup:** Show: "Accept to confirm, or reschedule if needed"

---

## 🔧 Technical Implementation Notes

### State Management
- **Location:** Derived from verified email (automatic)
- **Availability:** User selects manually (session state)
- **Calendar:** Stored in database (persistent)
- **Events:** Fetched daily, cached in database

### Performance
- **Lazy load:** Load events/people on scroll
- **Cache:** Cache venue search results (24 hours)
- **Optimistic updates:** Update UI immediately, sync in background

### Error Handling
- **No events:** Show empty state with helpful message
- **No people:** Show empty state with growth suggestion
- **API failures:** Show retry button, graceful degradation

---

## 🎯 Success Criteria

### User Success
- User verifies email within 24 hours of signup
- User blocks free times within 7 days
- User accepts first auto-generated meetup within 7 days
- User returns weekly to block new free times
- User completes at least 1 meetup per month

### Product Success
- 50%+ email verification rate
- 40%+ free time blocking rate (within 7 days)
- 30%+ first meetup acceptance rate (within 7 days)
- 40%+ Day 7 retention
- 25%+ Day 30 retention
- 60%+ meetup completion rate
- 2+ meetups per active user per month

---

## 📝 Next Steps for Implementation

1. **Phase 1:** Email verification + in-app calendar UI
2. **Phase 2:** Free time blocking (click/drag, save to database)
3. **Phase 3:** Auto-matching algorithm (overlap detection)
4. **Phase 4:** Venue search integration (Web Search API)
5. **Phase 5:** Auto-generated meetup creation
6. **Phase 6:** Notifications + reminders
7. **Phase 7:** Analytics + optimization

## 🔑 Key Technical Details

### Free Time Storage
```sql
CREATE TABLE public.user_free_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    city TEXT NOT NULL,  -- From verified email
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Auto-Matching Algorithm
```
1. Get user's free times (e.g., Monday 1-3pm)
2. Get network connections in same city (NYC)
3. Get their free times
4. Find overlaps:
   - User: Monday 1-3pm
   - Sarah: Monday 1-2pm
   - Overlap: Monday 1-2pm ✅
5. Generate meetup with overlap time
```

### Venue Search Query
```
Query options:
- "coffee shop near Hunter College"
- "coffee shop near Columbia"
- "coffee shop Manhattan" (if both in same area)

Use Web Search API (SerpAPI/Bing):
- Returns: Venue name, address, rating
- Select: Highest rating + closest distance
```

### Auto-Generated Meetup Format
```
"Go get coffee with Sarah at Blue Bottle Coffee at 1:00pm"

Components:
- Activity: From shared interests (coffee, lunch, etc.)
- Person: Network connection name
- Venue: From search API
- Time: Overlap time window
```

---

**End of User Flow Document**
