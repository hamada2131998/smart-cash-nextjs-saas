# AUTH / INVITE DEBUG REPORT

## Responsible files and paths

- Users invite UI:
  - `src/app/dashboard/users/page.tsx`
  - `src/app/dashboard/users/new/page.tsx`
- Invite API handler:
  - `src/app/api/users/invite/route.ts`
- Auth pages currently present:
  - `src/app/auth/login/page.tsx`
  - `src/app/auth/register/page.tsx`
  - `src/app/auth/callback/page.tsx`

## App Router auth routes found (`/auth/*`)

- `/auth/login`
- `/auth/register`
- `/auth/callback`

## Existence check for required auth pages

- `/auth/forgot-password`: NOT FOUND
- `/auth/reset-password`: NOT FOUND
- `/auth/callback`: FOUND (`src/app/auth/callback/page.tsx`)

## Reset password implementation check

- `resetPasswordForEmail(...)` usage: NOT FOUND in codebase.
- `supabase.auth.updateUser({ password })` usage: NOT FOUND in codebase.
- Current login page links to `/auth/forgot-password` from:
  - `src/app/auth/login/page.tsx`
- Current redirect settings observed:
  - Invite API uses `redirectTo = ${NEXT_PUBLIC_APP_URL}/auth/callback` in:
    - `src/app/api/users/invite/route.ts`
  - Register uses `emailRedirectTo = ${window.location.origin}/auth/callback` in:
    - `src/app/auth/register/page.tsx`

## Invite error condition analysis

Error text: `User already belongs to another company`

This is returned from `src/app/api/users/invite/route.ts` under two conditions:

1) Existing profile by email belongs to different company:
- Query:
  - `admin.from('profiles').select('id,company_id').eq('email', email).maybeSingle()`
- Condition:
  - `existingByEmail?.company_id !== companyId`

2) Resolved invited auth user id has profile in another company:
- Query:
  - `admin.from('profiles').select('company_id').eq('id', invitedUserId).maybeSingle()`
- Condition:
  - `existingById?.company_id && existingById.company_id !== companyId`

## If multi-company is enabled later (design note)

- Move from unique single `profiles.company_id` membership to a dedicated membership table per user/company.
- Replace invite conflict rule from hard reject on foreign `company_id` to explicit company-invite join/accept flow.
- Update RLS to rely on active membership context (current company selector) rather than single company on profile.
- Update invite API contract to support linking existing auth users to additional companies with role-scoped membership rows.
