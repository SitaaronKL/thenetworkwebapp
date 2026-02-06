# Profile Page & user_profile_extras Table

The Network profile page (`/network-profile/[slug]` and `/network-profile/me`) displays and edits user information. **All editable profile fields (except Interests) are stored in the `user_profile_extras` table** (singular: `user_profile_extras`, not `user_profiles_extras`).

## Table: `user_profile_extras`

- **Primary key:** `user_id` (UUID, references `auth.users(id)`)
- **Row:** One row per user; upserted when the user edits any section.

## UI Section → Column Mapping

| Profile section | Columns in `user_profile_extras` | Notes |
|-----------------|-----------------------------------|--------|
| **Your Quote** | `working_on`, `working_on_updated_at` | Optional `status_text` also exists |
| **Basic Info** | `gender`, `age`, `hometown`, `looking_for` | `looking_for` is TEXT[] (e.g. Friends, Mentorship) |
| **Contact** | `contact_email`, `contact_phone`, `linkedin_url`, `instagram_url`, `network_handle` | `network_handle` stored as `handle.thenetwork` |
| **Networks** | `networks` (TEXT[]) | Communities/schools/companies; first slot can be verified college |
| **Education** | `college`, `class_year`, `high_school`, `high_school_class_year` | College often set via .edu verification |
| **Work** | `company`, `job_description`, `experiences`, `certifications` | Experiences/certifications are JSONB arrays |
| **Interests** | — | Stored in `profiles.interests` and `profiles.hierarchical_interests`, derived from YouTube / onboarding |

## Where it’s used in the webapp

- **Load:** `thenetworkwebapp/src/app/network-profile/[slug]/page.tsx`  
  - Fetches from `user_profile_extras` in the same file (e.g. `.from('user_profile_extras').select(...).eq('user_id', targetUserId)`).
- **Save:** Same page; each section has an edit modal that upserts to `user_profile_extras` with `onConflict: 'user_id'`.

If you have a table literally named `user_profiles_extras` (plural), it is not used by this app; the code and migrations use `user_profile_extras`. You can add a view or synonym if you need the plural name.

## RLS and 400/403 errors

If profile data exists in the table but the webapp shows "Not set" or you see **400/403** in the console when loading a profile, Row Level Security is likely blocking reads. The app needs **authenticated users to be able to read any row** (to view other users’ profile pages). Apply the migration that fixes this:

- **Migration:** `supabase/migrations/20260206_fix_user_profile_extras_rls.sql`
- It ensures the policy **"Authenticated users can read profile extras"** exists with `FOR SELECT TO authenticated USING (true)`.

After applying, run `supabase db push` (or apply the migration in the Supabase SQL Editor). The browser console will also log `user_profile_extras fetch error:` with code/message if the fetch fails.
