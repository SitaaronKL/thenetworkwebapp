# YouTube/Google OAuth Verification Compliance Analysis

**Date:** December 2025  
**App:** TheNetwork WebApp  
**Scope:** YouTube Read-Only API (`https://www.googleapis.com/auth/youtube.readonly`)

---

## Executive Summary

This analysis identifies gaps between your current implementation and YouTube's explicit requirements for OAuth verification. **Critical issues** must be fixed before submission. **High-priority issues** should be addressed for approval. **Medium-priority issues** improve approval chances.

---

## 🔴 CRITICAL ISSUES (Must Fix Before Submission)

### 1. **30-Day Refresh-or-Delete Rule Violation**

**Requirement:** YouTube Developer Policies state that Authorized Data (subscriptions + liked videos) can only be stored for 30 calendar days unless you delete or refresh it after 30 days.

**Current State:**
- ❌ Documentation states: "YouTube sync is one-time (no automatic refresh)"
- ❌ No `last_refreshed_at` or `last_verified_authorization_at` tracking in database
- ❌ No scheduled job or background task to refresh data every 30 days
- ❌ Data is stored indefinitely without refresh mechanism

**Evidence:**
- `src/services/youtube.ts` - `syncYouTubeData()` is only called on initial signup
- `src/app/auth/callback/page.tsx` - Sync happens once, no recurring refresh
- Database schema has no timestamp tracking for refresh cycles

**Required Fix:**
1. Add `last_refreshed_at` timestamp to `youtube_subscriptions` and `youtube_liked_videos` tables (or a separate `user_youtube_sync_status` table)
2. Implement scheduled job (cron/edge function) that:
   - Checks all users with YouTube data older than 30 days
   - Verifies authorization is still valid
   - If valid: Refreshes subscriptions + liked videos
   - If invalid/revoked: Queues deletion (must complete within 7 days)
3. Update privacy policy to state: "We refresh your YouTube data every 30 days to ensure it remains current, or delete it if authorization is revoked."

---

### 2. **7-Day Deletion After Revocation Violation**

**Requirement:** If user revokes consent, you must delete all Authorized Data accessed/stored under that consent within 7 calendar days.

**Current State:**
- ❌ Privacy Policy Section 7.1 states: "Existing stored data (if any) remains until you delete it or request account deletion"
- ❌ No automatic deletion trigger when OAuth is revoked
- ❌ No 7-day deletion window enforcement

**Evidence:**
```typescript
// src/app/privacy-policy/page.tsx:270
"Existing stored data (if any) remains until you delete it or request account deletion, unless we must retain limited records for security or legal compliance."
```

**Required Fix:**
1. Implement webhook/listener for OAuth revocation (or periodic check)
2. When revocation detected:
   - Immediately delete all `youtube_subscriptions` rows for user
   - Immediately delete all `youtube_liked_videos` rows for user
   - Delete derived data (interests, DNA vectors) if they're solely derived from YouTube
3. Update privacy policy Section 7.1 to state: "If you revoke YouTube access, we will delete all stored YouTube data within 7 calendar days."

---

### 3. **Privacy Policy Missing YouTube API Services Disclosure**

**Requirement:** Privacy policy must explicitly state:
- "We use YouTube API Services"
- Link to Google's Privacy Policy: https://policies.google.com/privacy

**Current State:**
- ❌ Privacy policy does NOT explicitly say "We use YouTube API Services"
- ❌ No link to Google's Privacy Policy anywhere in privacy policy
- ✅ Mentions YouTube data collection (Section 2.2) but not "API Services" terminology

**Evidence:**
- `src/app/privacy-policy/page.tsx` - Section 2.2 mentions "YouTube Data APIs" but not "YouTube API Services"
- No link to `https://policies.google.com/privacy`

**Required Fix:**
1. Add explicit statement in Section 2.2: "We use YouTube API Services to access your YouTube data."
2. Add link to Google Privacy Policy: "Google's Privacy Policy: https://policies.google.com/privacy"
3. Consider adding a dedicated section: "YouTube API Services Usage" that explicitly states this

---

### 4. **Terms of Service Missing YouTube ToS Binding Statement**

**Requirement:** Your Terms must explicitly state that by using your app, users agree to be bound by YouTube's Terms of Service.

**Current State:**
- ⚠️ Terms of Service Section 5.2 mentions YouTube ToS but doesn't explicitly bind users
- ⚠️ Terms of Use Section 6.2 links to YouTube ToS but doesn't explicitly bind users
- ❌ No explicit statement: "By using features that access YouTube data, you agree to be bound by YouTube's Terms of Service"

**Evidence:**
```typescript
// src/app/terms-of-service/page.tsx:134
"If you use features that access YouTube data, you also agree to comply with YouTube's Terms of Service (and any applicable YouTube API terms and policies)."
```

This is close but not explicit enough. Google wants: "By using this app, you agree to be bound by YouTube's Terms of Service."

**Required Fix:**
1. Update Terms of Service Section 5.2 to explicitly state: "By using TheNetwork features that access YouTube data, you agree to be bound by YouTube's Terms of Service, available at https://www.youtube.com/t/terms."
2. Update Terms of Use Section 6.2 similarly
3. Consider adding this to the consent page as well

---

### 5. **Missing Always-Accessible YouTube ToS Link**

**Requirement:** App must display an always-accessible link to YouTube's Terms of Service (footer / settings / consent page).

**Current State:**
- ❌ No YouTube ToS link in footer
- ❌ No YouTube ToS link in settings
- ⚠️ YouTube ToS link exists in Terms of Use page (Section 6.2) but not easily accessible
- ❌ Landing page footer has Privacy/Terms links but no YouTube ToS link

**Evidence:**
- `src/app/landing/page.tsx` - Footer has Privacy, Terms of Service, Terms of Use, Contact - but no YouTube ToS
- `src/app/edit-profile/page.tsx` - Legal links section has Privacy, Terms of Service, Terms of Use - but no YouTube ToS

**Required Fix:**
1. Add YouTube ToS link to landing page footer
2. Add YouTube ToS link to settings/edit-profile page legal links section
3. Consider adding to consent page as well
4. Link should go to: `https://www.youtube.com/t/terms`

---

## 🟠 HIGH-PRIORITY ISSUES (Strongly Recommended)

### 6. **Privacy Policy Missing Revocation Instructions**

**Requirement:** Privacy policy must explain how to revoke access via Google security settings.

**Current State:**
- ⚠️ Section 7.1 mentions revocation but doesn't provide clear step-by-step instructions
- ❌ No link to Google Account security settings
- ❌ Instructions are vague: "in your Google Account security permissions (Third-party access)"

**Evidence:**
```typescript
// src/app/privacy-policy/page.tsx:263-266
"You can revoke TheNetwork's access to YouTube at any time:
- in your TheNetwork account settings (Connected Accounts / Integrations), and/or
- in your Google Account security permissions (Third-party access)"
```

**Required Fix:**
1. Add explicit step-by-step instructions:
   - "To revoke access via Google: Go to https://myaccount.google.com/permissions, find 'TheNetwork', and click 'Remove Access'"
2. Add link to Google Account permissions page
3. Make instructions more actionable

---

### 7. **Privacy Policy Missing Device Storage Disclosure**

**Requirement:** Privacy policy must clearly explain what user info/API data you access, store, and use, including where it's stored (device vs. server).

**Current State:**
- ✅ Section 2.2 explains what data is accessed
- ⚠️ Section 2.2 doesn't explicitly state WHERE data is stored (device vs. server)
- ❌ No explicit statement about server-side storage

**Evidence:**
- Privacy policy mentions "stored data" but doesn't clarify it's stored on servers, not device

**Required Fix:**
1. Add to Section 2.2: "This data is stored on our servers (not on your device) to power your Digital DNA profile and matching features."
2. Clarify storage location for all YouTube data

---

### 8. **Derived Data (Embeddings/DNA) Limited Use Disclosure**

**Requirement:** Limited Use rules apply to derived data (embeddings, Digital DNA, archetypes). Privacy policy must explicitly state that derived vectors/profiles are created from YouTube data and used only inside TheNetwork.

**Current State:**
- ✅ Section 4.2 mentions Limited Use
- ⚠️ Section 4.2 doesn't explicitly mention that derived data (embeddings, DNA vectors, archetypes) is subject to Limited Use
- ❌ No explicit statement: "Derived data (embeddings, Digital DNA profiles) created from YouTube data is subject to Google's Limited Use requirements"

**Evidence:**
- Privacy policy Section 4.2 talks about YouTube data but doesn't explicitly call out derived data

**Required Fix:**
1. Add to Section 4.2: "This includes data derived from YouTube data, such as interest embeddings, Digital DNA vectors, personality archetypes, and similarity scores. All derived data is subject to Google's Limited Use requirements and is used only to provide and improve user-facing features within TheNetwork (e.g., interest profile and matching), not for advertising, data sales, or transfer to third parties."

---

### 9. **OAuth Button Labeling (Transparency)**

**Requirement:** If "Continue" button immediately triggers Google OAuth requesting YouTube access, it should be labeled clearly (e.g., "Continue with Google (YouTube read-only)") to reduce reviewer friction.

**Current State:**
- ⚠️ Onboarding page button says "Continue with Google" but doesn't mention YouTube
- ⚠️ Landing page button says "Claim my Digital DNA" which doesn't mention YouTube/OAuth at all

**Evidence:**
```typescript
// src/app/onboarding/page.tsx:357
<span>Continue with Google</span>
```

**Required Fix:**
1. Update onboarding button to: "Continue with Google (YouTube read-only)"
2. Or add tooltip/subtext explaining YouTube access will be requested
3. Consider updating landing page CTA to be more transparent

---

## 🟡 MEDIUM-PRIORITY ISSUES (Improve Approval Chances)

### 10. **Verification Readiness: Public Homepage Clarity**

**Requirement:** Home page must be publicly accessible and clearly describe the app.

**Current State:**
- ✅ Landing page exists and is publicly accessible
- ✅ Landing page describes the app
- ⚠️ Could be more explicit about YouTube integration

**Evidence:**
- Landing page mentions YouTube in "Learn more" modal but not prominently

**Recommended Fix:**
1. Consider adding a brief mention of YouTube integration on landing page (not just in modal)
2. Ensure homepage clearly states app purpose

---

### 11. **Verification Readiness: Authorized Domain Ownership**

**Requirement:** Must verify authorized domains in Google Search Console.

**Current State:**
- ❓ Unknown - need to verify this is done
- ⚠️ Must ensure domain is verified in Google Search Console before submission

**Action Required:**
1. Verify domain ownership in Google Search Console
2. Ensure authorized domains match OAuth consent screen configuration

---

### 12. **Verification Readiness: OAuth Consent Screen URLs**

**Requirement:** Privacy policy URL on OAuth consent screen must match actual privacy policy URL.

**Current State:**
- ❓ Unknown - need to verify OAuth consent screen configuration
- ⚠️ Must ensure URLs are consistent

**Action Required:**
1. Verify OAuth consent screen has correct:
   - Privacy Policy URL: `https://www.thenetwork.life/privacy-policy` (or your actual domain)
   - Terms of Service URL: `https://www.thenetwork.life/terms-of-service`
   - Homepage URL: `https://www.thenetwork.life` (or landing page)

---

### 13. **Branding/Attribution Rules**

**Requirement:** If you show YouTube logo/icon, it must link back to YouTube content or a YouTube component in your app. Don't use "YouTube/YT" in app name or imply endorsement.

**Current State:**
- ✅ App name is "TheNetwork" (no YouTube reference)
- ❓ Need to check if YouTube logo is used anywhere
- ⚠️ If YouTube logo is used, ensure it links appropriately

**Action Required:**
1. Search codebase for YouTube logo usage
2. If found, ensure it links to YouTube content or YouTube data review page
3. Ensure no YouTube branding in app name

---

## ✅ WHAT'S CORRECT (Good Practices Already Implemented)

### 1. **Limited Use Disclosure**
- ✅ Section 4.1 explicitly states adherence to Google API Services User Data Policy
- ✅ Section 4.2 explains how YouTube data is used (only for user-facing features)
- ✅ Section 4.2 states what YouTube data is NOT used for (selling, advertising, etc.)

### 2. **Scope Usage**
- ✅ Only requests `youtube.readonly` scope (correct)
- ✅ OAuth scopes properly configured in `AuthContext.tsx`

### 3. **Data Minimization**
- ✅ Only stores necessary fields (channel_id, title, thumbnail_url, etc.)
- ✅ Doesn't store unnecessary YouTube data

### 4. **Transparency**
- ✅ YouTube data review page exists (feature-flagged)
- ✅ Shows exactly what data is fetched and stored
- ✅ Explains how data is used (interests, matching)

### 5. **User Control**
- ✅ Users can view their YouTube data (review page)
- ✅ Account deletion exists
- ⚠️ Need to add explicit "Delete YouTube Data" button (separate from account deletion)

### 6. **Terms of Service Structure**
- ✅ Terms of Service and Terms of Use exist
- ✅ Both mention YouTube integration
- ✅ Both link to YouTube ToS (though needs to be more explicit)

### 7. **Privacy Policy Structure**
- ✅ Comprehensive privacy policy exists
- ✅ Covers data collection, use, sharing
- ✅ Has contact information
- ✅ Explains authentication

---

## 📋 IMPLEMENTATION CHECKLIST

### Critical (Must Fix)
- [ ] Implement 30-day refresh-or-delete mechanism for YouTube data
- [ ] Add `last_refreshed_at` timestamp tracking
- [ ] Create scheduled job to refresh/delete data every 30 days
- [ ] Implement 7-day deletion after revocation
- [ ] Update privacy policy Section 7.1 to state 7-day deletion
- [ ] Add "We use YouTube API Services" statement to privacy policy
- [ ] Add link to Google Privacy Policy in privacy policy
- [ ] Update Terms of Service to explicitly bind users to YouTube ToS
- [ ] Add YouTube ToS link to landing page footer
- [ ] Add YouTube ToS link to settings page

### High Priority (Strongly Recommended)
- [ ] Add step-by-step revocation instructions to privacy policy
- [ ] Add link to Google Account permissions page
- [ ] Add device vs. server storage disclosure
- [ ] Add explicit derived data Limited Use disclosure
- [ ] Update OAuth button labeling for transparency

### Medium Priority (Improve Approval)
- [ ] Verify authorized domain in Google Search Console
- [ ] Verify OAuth consent screen URLs match actual URLs
- [ ] Check for YouTube logo usage and ensure proper linking
- [ ] Consider adding "Delete YouTube Data" button (separate from account deletion)

---

## 🔧 TECHNICAL IMPLEMENTATION NOTES

### 30-Day Refresh Implementation

**Option 1: Edge Function Cron Job**
```typescript
// supabase/functions/refresh-youtube-data/index.ts
// Runs daily, checks for users with data older than 30 days
// Refreshes if authorized, deletes if revoked
```

**Option 2: Database Trigger + Background Job**
- Add `last_refreshed_at` to `youtube_subscriptions` and `youtube_liked_videos`
- Create scheduled function that checks and refreshes

**Database Schema Addition:**
```sql
ALTER TABLE youtube_subscriptions 
ADD COLUMN last_refreshed_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE youtube_liked_videos 
ADD COLUMN last_refreshed_at TIMESTAMPTZ DEFAULT NOW();

-- Or create a separate tracking table:
CREATE TABLE user_youtube_sync_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_refreshed_at TIMESTAMPTZ,
  last_verified_authorization_at TIMESTAMPTZ,
  authorization_valid BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7-Day Deletion Implementation

**Option 1: Webhook Listener**
- Listen for OAuth revocation events
- Immediately delete data when revocation detected

**Option 2: Periodic Check**
- Daily job checks if user's OAuth token is still valid
- If invalid, queue deletion (must complete within 7 days)

**Implementation:**
```typescript
// Check if token is valid
const isValid = await verifyGoogleToken(accessToken);
if (!isValid) {
  // Queue deletion
  await queueYouTubeDataDeletion(userId);
  // Must complete within 7 days
}
```

---

## 📝 PRIVACY POLICY UPDATES NEEDED

### Section 2.2 - Add:
```
We use YouTube API Services to access your YouTube data. For more information about how Google handles your data, see Google's Privacy Policy: https://policies.google.com/privacy.

This data is stored on our servers (not on your device) to power your Digital DNA profile and matching features.
```

### Section 4.2 - Add:
```
This includes data derived from YouTube data, such as interest embeddings, Digital DNA vectors, personality archetypes, and similarity scores. All derived data is subject to Google's Limited Use requirements and is used only to provide and improve user-facing features within TheNetwork (e.g., interest profile and matching), not for advertising, data sales, or transfer to third parties.
```

### Section 7.1 - Replace:
**Current:**
```
After revocation:
- We stop fetching new data from YouTube.
- Existing stored data (if any) remains until you delete it or request account deletion, unless we must retain limited records for security or legal compliance.
```

**Replace with:**
```
After revocation:
- We stop fetching new data from YouTube.
- We will delete all stored YouTube data (subscriptions, liked videos, and derived data) within 7 calendar days of revocation.
- You can also request immediate deletion by contacting privacy@thenetwork.life.
```

### Section 7.1 - Add Revocation Instructions:
```
To revoke access via Google Account:
1. Go to https://myaccount.google.com/permissions
2. Find "TheNetwork" in the list of connected apps
3. Click "Remove Access" or "Revoke Access"
```

### Add New Section 7.4 - Data Refresh:
```
7.4 Data Refresh and Retention
We refresh your YouTube data every 30 days to ensure it remains current. If authorization is revoked or expires, we delete all stored YouTube data within 7 calendar days. You can request deletion of your YouTube data at any time by contacting privacy@thenetwork.life.
```

---

## 📝 TERMS OF SERVICE UPDATES NEEDED

### Section 5.2 - Replace:
**Current:**
```
If you use features that access YouTube data, you also agree to comply with YouTube's Terms of Service (and any applicable YouTube API terms and policies). YouTube is a third-party service and is not controlled by TheNetwork.
```

**Replace with:**
```
By using TheNetwork features that access YouTube data, you agree to be bound by YouTube's Terms of Service, available at https://www.youtube.com/t/terms. YouTube is a third-party service and is not controlled by TheNetwork. Your use of YouTube remains subject to YouTube's policies and terms.
```

---

## 🎯 PRIORITY ORDER FOR FIXES

1. **Week 1 (Critical):**
   - Privacy policy updates (YouTube API Services, Google Privacy Policy link, 7-day deletion)
   - Terms of Service YouTube ToS binding statement
   - Add YouTube ToS links to footer and settings

2. **Week 2 (Critical):**
   - Implement 30-day refresh mechanism
   - Add database timestamps
   - Create scheduled job

3. **Week 3 (High Priority):**
   - Implement 7-day deletion after revocation
   - Add revocation instructions
   - Update OAuth button labeling

4. **Week 4 (Polish):**
   - Verify domain ownership
   - Verify OAuth consent screen URLs
   - Final testing

---

## 📞 CONTACT FOR QUESTIONS

If you need clarification on any of these requirements, refer to:
- [YouTube API Services User Data Policy](https://developers.google.com/youtube/terms/api-services-user-data-policy)
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [OAuth Verification Requirements](https://support.google.com/cloud/answer/9110914)

---

**Last Updated:** December 2025  
**Status:** Ready for Implementation

