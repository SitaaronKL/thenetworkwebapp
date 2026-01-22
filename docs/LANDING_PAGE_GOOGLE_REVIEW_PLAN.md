# Landing Page Google Review Requirements - Planning Document

## 🎯 Quick Summary

**Status:** Plan ready with reviewer-safe wording  
**Delete/Disconnect:** ✅ IMPLEMENTED AND WORKING (confirmed by user)  
**Final Content:** Ready to paste (see "✅ FINAL CONTENT" section)  
**Key Changes:** Added "who it's for", fixed terminology, uses Settings controls wording since delete/disconnect is implemented

---

## Current State Analysis

### What We Have:
- ✅ Landing page exists at `/landing`
- ✅ Shows content before sign-in (doesn't auto-redirect)
- ✅ Privacy Policy link exists (`/privacy-policy`)
- ✅ Terms of Service link exists (`/terms-of-service`)
- ✅ Terms of Use link exists (`/terms-of-use`)
- ✅ Contact information available:
  - privacy@thenetwork.life
  - support@thenetwork.life
  - legal@thenetwork.life
- ✅ Footer already has privacy/terms links

### What's Missing:
- ❌ No explicit "purpose" section explaining what the app does
- ❌ No explanation of who it's for
- ❌ No explanation of why YouTube access is needed
- ❌ No clear statement about read-only access / what we don't do
- ❌ No "Learn how we use YouTube data" link
- ✅ Contact (will be added to landing page)
- ❌ Current copy is marketing-focused, not reviewer-focused

---

## Required Content (Google's Checklist)

### 1. What does the app do?
**Current:** "Control who you are online" (too vague)
**Needed:** Clear statement about matching people based on shared interests

### 2. Who is it for?
**Current:** Not stated
**Needed:** Explicit target audience

### 3. Why do you need Google/YouTube access?
**Current:** Not explained
**Needed:** Clear explanation of youtube.readonly scope usage

### 4. What you do / don't do with the data
**Current:** Not stated
**Needed:** Read-only, no posting, no edits statement

### 5. Links Required
- ✅ Privacy Policy (exists)
- ❌ Contact (needs to be added to landing page)
- ✅ Terms (exists)
- ❌ "Learn how we use YouTube data" (needs to be added)

---

## Proposed Content Structure

**Use the ✅ FINAL CONTENT section below for the exact text to implement.**

### Section 1: Purpose Statement (Above the fold, before CTA)

**Location:** Between headline and CTA button

**Design Notes:**
- Keep it concise (6-10 lines as Google suggests)
- Use readable font size (not too small)
- Make it scannable
- Ensure it's visible before sign-in

### Section 2: Action Buttons/Links

**Location:** Below CTA button or integrated into footer

**Links Needed:**
1. "Sign in with Google" (add as sublabel under existing CTA button)
2. "Learn how we use YouTube data" → Link to `/youtube-data-review` (if feature flag enabled AND user signed in) OR `/privacy-policy#youtube` (always accessible, no auth)
3. "Privacy Policy" → `/privacy-policy` (already in footer)
4. "Contact" → `mailto:privacy@thenetwork.life` (add to landing page)

---

## Layout Options

### Option A: Add Purpose Section Above CTA
```
[Logo]
[Headline: "Control who you are online"]
[Purpose Section - NEW]
[CTA Button: "Claim my Digital DNA"]
[Additional Links Section - NEW]
[Footer with existing links]
```

### Option B: Add Purpose Section Below CTA
```
[Logo]
[Headline: "Control who you are online"]
[CTA Button: "Claim my Digital DNA"]
[Purpose Section - NEW]
[Additional Links Section - NEW]
[Footer with existing links]
```

### Option C: Replace/Enhance Headline with Purpose
```
[Logo]
[Purpose Section (includes headline) - NEW]
[CTA Button: "Sign in with Google"]
[Additional Links Section - NEW]
[Footer with existing links]
```

**Recommendation:** Option A - Keep headline, add purpose section above CTA so it's immediately visible

---

## Content Refinement

### ✅ FINAL VERSION (Reviewer-Safe, Ready to Use)

**Status Check:** ✅ Disconnect/Delete functionality IS IMPLEMENTED AND WORKING (confirmed by user)

**⚠️ CRITICAL:** The link must work for signed-out reviewers (no auth wall)

**✅ FINAL CONTENT (Best Version - Ready to Paste):**
```
TheNetwork helps you discover people you'll actually get along with — based on shared interests.
Built for people who want to meet friends and communities around what they genuinely like.

Connect your Google account to create your profile. If you choose to connect YouTube (read-only), we use your subscriptions and liked videos to infer interest topics and recommend people with similar interests inside the app.

YouTube access is read-only: we do not upload videos, post comments, modify subscriptions, or change anything in your YouTube account.

You can manage your YouTube connection and delete imported YouTube data in Settings.
```

**Note:** Since delete/disconnect is implemented, we can use the stronger wording that mentions Settings controls. This is actually better for reviewers as it shows you have proper user controls.

**Note on "Liked Videos playlist":**
- You can use "Liked Videos playlist" if you prefer (more precise)
- But "liked videos" is simpler and equally acceptable
- Reviewers don't need playlist mechanics explained

### Key Changes from Original:
1. ✅ Added "Who it's for" line: "Built for people who want to meet friends and communities around what they genuinely like."
2. ✅ Simplified to "liked videos" (can use "Liked Videos playlist" if preferred, but simpler is safer)
3. ✅ Added explicit output: "recommend people with similar interests inside the app" (makes purpose undeniable)
4. ✅ Updated user control wording to reflect in-app Settings controls (manage connection + delete imported YouTube data)
5. ✅ Link strategy ensures no auth wall for signed-out reviewers
6. ✅ Added "inside the app" to clarify the output/matching happens in the app

---

## Link Strategy

### "Learn how we use YouTube data" Link

**✅ FINAL STRATEGY (Reviewer-Proof, No Auth Wall):**

**⚠️ CRITICAL REQUIREMENT:** Link must work for signed-out reviewers (no authentication required)

**Implementation:**
- Check if `NEXT_PUBLIC_YT_REVIEW_ENABLED === 'true'` AND user is authenticated
- If both true: Link to `/youtube-data-review`
- Otherwise: Link to `/privacy-policy#youtube` (ALWAYS accessible, no auth required)
- Ensure privacy policy has a YouTube section with anchor `#youtube`

**Code Logic:**
```typescript
const { user } = useAuth();
const reviewEnabled = process.env.NEXT_PUBLIC_YT_REVIEW_ENABLED === 'true';
const youtubeReviewUrl = (reviewEnabled && user) 
  ? '/youtube-data-review' 
  : '/privacy-policy#youtube';
```

**Why this works:**
- Never returns 404 (always has fallback)
- Never hits auth wall (privacy policy is public)
- Signed-out reviewers can always access privacy policy
- Signed-in users with feature flag get review page
- Both paths are valid and informative

**Privacy Policy Anchor:**
- Need to ensure privacy policy has a section with `id="youtube"` or similar
- Section should explain YouTube data usage clearly
- Privacy policy must be publicly accessible (no auth required)

### Contact Link

**Options:**
1. Direct mailto link: `mailto:privacy@thenetwork.life`
2. Contact page: `/contact` (would need to be created)
3. Link to Terms of Use page (which has contact section)

**Recommendation:** mailto link is simplest and meets requirement

---

## Implementation Plan

### Step 1: Add Purpose Section
- Location: Between headline and CTA button
- Content: Use Draft 1 (cleaner version)
- Styling: Match existing design system
- Responsive: Ensure readable on mobile

### Step 2: Add Links Section
- Location: Below CTA button or in footer area
- Links:
  1. "Learn how we use YouTube data" (conditional on feature flag)
  2. "Contact" (mailto link)
  3. Keep existing Privacy/Terms links in footer

### Step 3: Update CTA Button Text
- Current: "Claim my Digital DNA"
- **Action:** Keep current text but add small sublabel underneath
- **Sublabel:** "Sign in with Google"
- **Why:** Removes ambiguity for reviewers about authentication method
- **Design:** Smaller font, lighter color, positioned directly below button

### Step 4: Ensure Visibility
- Verify content is visible before sign-in
- Test that authenticated users still see it (or redirect happens after)
- Check mobile responsiveness

---

## Design Considerations

### Typography
- Use existing font-display family
- Match text sizes to existing landing page
- Ensure good contrast for readability

### Spacing
- Add appropriate padding/margins
- Don't crowd the existing design
- Maintain visual hierarchy

### Colors
- Match existing color scheme (black/gray gradient)
- Keep links styled consistently
- Ensure accessibility (contrast ratios)

---

## Implementation Status Check

### ✅ Verified:
- Privacy Policy exists and has YouTube section (Section 7: "Revoking YouTube Access, Deleting Data, and Data Retention")
- Contact information exists: privacy@thenetwork.life, support@thenetwork.life, legal@thenetwork.life
- Terms pages exist and are linked

### ✅ Verified as Implemented:
- **Delete/Disconnect YouTube functionality** - User confirmed it's implemented and working
- **Settings controls** - YouTube connection management exists in Settings

### ❌ Still Need:
- **Privacy Policy anchor** - Need to add `id="youtube"` to YouTube section

### ⚠️ Action Items Before Submission:
1. **✅ Settings Controls Verified:**
   - YouTube management exists in Settings (confirmed by user)
   - Delete/disconnect functionality is implemented and working
   - **Use:** "You can manage your YouTube connection and delete imported YouTube data in Settings."

2. **Add Privacy Policy Anchor:**
   - Add `id="youtube"` to Section 7 in Privacy Policy
   - Ensure privacy policy is publicly accessible (no auth required)

3. **Test "Learn how we use YouTube data" Link:**
   - Test with feature flag enabled AND user signed in → should go to `/youtube-data-review`
   - Test with feature flag enabled BUT user signed out → should go to `/privacy-policy#youtube` (no auth wall)
   - Test with feature flag disabled → should go to `/privacy-policy#youtube`
   - **Critical:** Link must work for signed-out reviewers

4. **Verify Google Cloud Console "Application home page" URL:**
   - Must point to public URL: `https://thenetwork.life/landing` (or your domain)
   - NOT a Supabase URL, preview URL, or route that redirects
   - Must be accessible without authentication
   - Should match the actual landing page URL

## Testing Checklist

Before submission:
- [ ] Purpose section is visible above the fold
- [ ] "Who it's for" line is present
- [ ] All required links are present and working
- [ ] Content is visible before sign-in (no auto-redirect)
- [ ] Mobile responsive
- [ ] Privacy Policy link works
- [ ] Privacy Policy has `#youtube` anchor that works
- [ ] Contact link works (mailto opens email client)
- [ ] "Learn how we use YouTube data" link works (test with feature flag ON and OFF)
- [ ] "Learn how we use YouTube data" link NEVER 404s (falls back to privacy policy)
- [ ] "Learn how we use YouTube data" link works for SIGNED-OUT users (no auth wall)
- [ ] Privacy Policy is publicly accessible (no authentication required)
- [ ] Google Cloud Console "Application home page" URL points to public landing page (not Supabase/preview URL)
- [ ] CTA button has "Sign in with Google" sublabel
- [ ] Google Cloud Console "Application home page" URL points to `/landing`
- [ ] Content matches what's in Google Cloud Console application description
- [ ] Landing page correctly states deletion is available in Settings (since it's implemented)
- [ ] If deletion is implemented, verify it works and update landing page text

---

## ✅ FINAL CONTENT (Ready to Implement)

## 📍 WHERE TO PUT THIS ON THE LANDING PAGE

**Exact Location in `src/app/landing/page.tsx`:**

1. **Purpose Section:** Insert between line 46 (headline) and line 49 (CTA button)
   - After: `</h1>` (closing headline tag)
   - Before: `{/* CTA Button */}` comment

2. **CTA Button Sublabel:** Add below the button (after line 56, before `</main>`)
   - Small text: "Sign in with Google"

3. **Additional Links:** Add after CTA button, before `</main>` closing tag
   - "Learn how we use YouTube data" link
   - "Contact" link

4. **Footer:** Keep existing links, add "Contact" if not there

**Visual Structure:**
```
[Logo]
[Headline: "Control who you are online"]
[Purpose Section - NEW - INSERT HERE] ← Between headline and CTA
[CTA Button: "Claim my Digital DNA"]
["Sign in with Google" sublabel - NEW]
["Learn how we use YouTube data" link - NEW]
["Contact" link - NEW]
[Footer with existing links + Contact]
```

### Purpose Section Text (Final - Best Version):

```
TheNetwork helps you discover people you'll actually get along with — based on shared interests.
Built for people who want to meet friends and communities around what they genuinely like.

Connect your Google account to create your profile. If you choose to connect YouTube (read-only), we use your subscriptions and liked videos to infer interest topics and recommend people with similar interests inside the app.

YouTube access is read-only: we do not upload videos, post comments, modify subscriptions, or change anything in your YouTube account.

You can manage your YouTube connection and delete imported YouTube data in Settings.
```

**Visual Implementation Note:**
- Consider splitting the "read-only" sentence into bullets on the UI for better reviewer scannability
- The text can stay identical, but bullets reduce reviewer friction
- Example visual format (text stays the same):
  ```
  YouTube access is read-only: we do not
  • upload videos
  • post comments
  • modify subscriptions
  • change anything in your YouTube account
  ```

**Why this is better:**
- Shows you have proper user controls (Google loves this)
- Demonstrates data deletion capability (big trust win)
- More transparent than just "revoke in Google Account settings"
- Matches what's actually implemented in your app
- One-line Settings sentence is cleaner and more scannable

### Links to Add:
1. **"Learn how we use YouTube data"**
   - URL: Conditional on feature flag
   - If enabled: `/youtube-data-review`
   - If disabled: `/privacy-policy#youtube` (NEVER 404)
   
2. **"Contact"**
   - URL: `mailto:privacy@thenetwork.life`
   - Or: Link to Terms of Use page (which has contact section)

3. **Keep existing:**
   - Privacy Policy → `/privacy-policy`
   - Terms of Service → `/terms-of-service`
   - Terms of Use → `/terms-of-use`

### CTA Button:
- **Main text:** "Claim my Digital DNA" (keep existing)
- **Sublabel:** "Sign in with Google" (add below button, smaller font)

---

## Critical Implementation Notes

### Google Cloud Console "Application home page" URL

**⚠️ CRITICAL:** Must point to public, accessible URL

**Requirements:**
- Must be a public URL (not Supabase URL, preview URL, or internal route)
- Must be accessible without authentication
- Should match your actual landing page: `https://thenetwork.life/landing` (or your domain)
- Must NOT redirect (reviewers check this URL directly)
- Must show the purpose section (not just redirect to login)

**Verification Steps:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Find your OAuth 2.0 Client ID
3. Check "Authorized JavaScript origins" and "Authorized redirect URIs"
4. Check "Application home page" field
5. Ensure it points to: `https://thenetwork.life/landing` (or your public domain)
6. Test the URL in incognito mode (signed out) - should show landing page with purpose section

**Common Mistakes:**
- ❌ Using Supabase preview URL
- ❌ Using localhost URL
- ❌ Using a route that auto-redirects to login
- ❌ Using a route that requires authentication

### Delete/Disconnect Functionality Status

**✅ Current Status: IMPLEMENTED AND WORKING**
- User has confirmed delete/disconnect functionality is fully implemented and tested
- Delete YouTube data functionality exists and works
- Can be accessed from Settings or review page

**Landing Page Wording (Since It's Implemented):**
Use the stronger wording that mentions Settings controls:

```
You can manage your YouTube connection and delete imported YouTube data in Settings.
```

Or if it's only in one location:

```
You can manage your YouTube connection and delete imported data in Settings.
```

**This is better than the "revoke in Google Account settings" wording since you have actual in-app controls.**

### Privacy Policy Anchor

**Action Required:** Add `id="youtube"` to Section 7 in Privacy Policy
- Current: Section 7 title is "7. Revoking YouTube Access, Deleting Data, and Data Retention"
- Need: Add `id="youtube"` to the section element
- This allows `/privacy-policy#youtube` link to work reliably

### Link Fallback Strategy

**Critical Requirements:**
1. The "Learn how we use YouTube data" link must NEVER 404
2. The link must NEVER hit an auth wall (must work for signed-out reviewers)
3. Privacy Policy must be publicly accessible

**Implementation:**
- If feature flag enabled AND user authenticated: `/youtube-data-review` (review page)
- Otherwise (feature flag disabled OR user signed out): `/privacy-policy#youtube` (privacy policy section)
- Both paths must be valid and informative
- Privacy policy must be public (no auth required)
- Test all scenarios before submission:
  - Feature flag ON + signed in
  - Feature flag ON + signed out
  - Feature flag OFF + signed in
  - Feature flag OFF + signed out

## ✅ Final Implementation Checklist

Before submitting to Google:

- [ ] Purpose section added between headline and CTA button
- [ ] Content matches final paste block exactly
- [ ] "Sign in with Google" sublabel added below CTA button
- [ ] "Learn how we use YouTube data" link added (with signed-out fallback)
- [ ] "Contact" link added (mailto:privacy@thenetwork.life)
- [ ] Privacy Policy has `id="youtube"` anchor on Section 7
- [ ] Google Cloud Console "Application home page" URL points to public landing page
- [ ] All links tested (signed in and signed out)
- [ ] Content is visible before sign-in (no auto-redirect)
- [ ] Mobile responsive
- [ ] Read-only statement is clear and scannable (consider bullets for UI)

## Notes

- Keep the existing headline "Control who you are online" - it's good branding
- The purpose section should complement, not replace, the headline
- Make sure the content is scannable - reviewers often skim
- Don't over-explain - Google wants concise, clear statements
- Ensure the page doesn't feel cluttered after adding content
- Consider visual bullets for the "we do not" list to improve scannability

