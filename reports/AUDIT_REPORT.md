# AUDIT REPORT

## Executive summary
- Audit scope completed with **read-only analysis** plus diagnostics (`npm ci`, `npm run lint`, `npm run build`, `npm test`) and logs saved under `reports/`.
- Build is currently **passing**; lint/test checks are **not passing** due tooling/script issues, not TypeScript compile failures.
- Project is a **Next.js App Router** app with Supabase SSR auth/session and one API route (`/api/users/invite`).
- Multi-tenant model is present (`company_id` scoped across tables + RLS + helper SQL functions), with ledger-style custody transactions introduced in migration 011.
- Notification system now has UI polling + DB trigger automation (migration 012), but there are deployment-order and duplication edge cases to control.
- Highest-risk areas before next development wave: migration ordering/state drift, SECURITY DEFINER function trust boundaries, and policy hardening consistency.

---

## Inventory

### Repo structure (key paths)
- `src/app`
  - `/auth/login`, `/auth/register`, `/auth/callback`
  - `/dashboard` pages: `expenses`, `custodies`, `customers`, `notifications`, `users`, `policies`, `settings`
  - API route handlers: `src/app/api/users/invite/route.ts`
- `src/components`
  - `Sidebar.tsx`, `DashboardHeader.tsx`
- `src/lib`
  - `supabase.ts` (browser), `supabase-server.ts` (SSR), `supabase-admin.ts` (server-only)
  - helpers: `auth-utils.ts`, `format-utils.ts`, `schemas.ts`, `utils.ts`
- `supabase/migrations`
  - `010_saas_production_patch.sql`
  - `011_custody_operating_system.sql`
  - `012_custody_notifications_automation.sql`

### Node version + scripts
- `package.json` has **no `engines` field**.
- `.nvmrc` and `.node-version` are **not present**.
- Key scripts:
  - `dev`: `next dev`
  - `build`: `next build --webpack`
  - `start`: `next start`
  - `lint`: `next lint`
  - `type-check`: `tsc --noEmit`
  - `supabase:generate-types`: Supabase type generation script

### Build/CI diagnostics
- `npm ci`: PASS (with deprecation warnings for `@supabase/auth-helpers-nextjs`).
- `npm run lint`: FAIL (`next lint` invalid project directory behavior with current setup/version).
- `npm run build`: PASS.
- `npm test`: FAIL (no `test` script defined).
- Logs:
  - `reports/build.log`
  - `reports/lint.log`
  - `reports/test.log`

---

## Vercel / Next runtime diagnosis
- `vercel.json`:
  - framework: `nextjs`
  - build command: `npm run build`
  - install command: `npm install`
  - region: `iad1`
  - security headers configured globally
- `next.config.js`:
  - `experimental.serverActions.bodySizeLimit = '10mb'`
  - `images.domains` used (currently deprecated warning recommends `remotePatterns`)
- App architecture: **App Router** (`src/app` based routes).
- Edge runtime routes: **none found** (`export const runtime = 'edge'` not detected).
- Server actions using secrets: **no explicit `use server` actions found**.
- Env usage observed in code:
  - Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
  - Server-only secret: `SUPABASE_SERVICE_ROLE_KEY` via `src/lib/supabase-admin.ts`

---

## Supabase integration diagnosis

### Auth + callback
- Callback route: `src/app/auth/callback/page.tsx`
  - uses `exchangeCodeForSession(code)` then server-side session check.
- Login/Register are client components using Supabase JS in browser (`signInWithPassword`, `signUp`).
- Register sets `emailRedirectTo` to `${window.location.origin}/auth/callback`.

### PKCE/session model
- With `@supabase/ssr` + `exchangeCodeForSession`, flow is aligned with Supabase SSR cookie/session model.
- Server-side cookies/session handling exists in:
  - `src/lib/supabase-server.ts`
  - `src/middleware.ts` (session gate for `/dashboard` and auth redirects)

### Multi-tenant model (company + role resolution)
- SQL helper functions in migration 010:
  - `auth_company_id()` resolves `company_id` via `profiles.id = auth.uid()`
  - `auth_user_role()` resolves role from `user_roles`
- In app code, company/role are often read from:
  - `profiles.company_id`
  - `user_roles.role`
- Onboarding function: `handle_new_user_onboarding()` creates company/profile/owner role/default records.

### Admin API usage
- Found in:
  - `src/lib/supabase-admin.ts` (imports `server-only`)
  - `src/app/api/users/invite/route.ts`
- Service role exposure risk:
  - Current usage is server-side only by design.
  - No direct client import of admin client detected.
  - Residual risk: accidental future import into client components (mitigated by `server-only`, but still worth lint/CI guard).

---

## DB summary (tables/functions/RLS)

### Core tables observed
- Base SaaS (migration 010): `companies`, `profiles`, `user_roles`, `expenses`, `approvals`, `notifications`, etc.
- Ledger additions (migration 011):
  - `customers`
  - `custody_transactions`

### Custody/ledger computation
- Balance is computed by SQL function: `custody_current_balance(p_custody_id)` in migration 011.
- Definition uses `custody_transactions` where `status = 'approved'` only.
- Transaction types in DB: `topup`, `transfer`, `expense_deduction`.
- Sources in DB: `manual_admin`, `customer_payment`, `transfer`, `expense`.

### Migration 011 status and prerequisites
- Migration 011 exists and includes:
  - new tables + indexes
  - SECURITY DEFINER functions
  - RLS policies for `customers` and `custody_transactions`
  - override of `decide_approval` to ledger-based deduction
- Prerequisites for execution in Supabase SQL Editor:
  1. Apply migration 010 first (creates base schema + `update_updated_at_column` + enums/functions).
  2. Ensure `pgcrypto` available (`gen_random_uuid()` used, enabled in 010).
  3. Apply 011, then 012 (trigger automation depends on `custody_transactions` and `notifications`).

---

## Current flow diagnosis

### Invite flow
- API: `POST /api/users/invite` in `src/app/api/users/invite/route.ts`.
- Role gate in route: owner/admin/manager only.
- Uses Supabase Admin invite flow and upserts profile/role membership.

### Custody flow
- Main page: `src/app/dashboard/custodies/page.tsx`
- Uses SQL RPCs:
  - `request_manual_topup`
  - `decide_manual_topup`
  - `request_transfer`
  - `decide_transfer`
  - `custody_current_balance`

### Expense flow
- New expense page: `src/app/dashboard/expenses/new/page.tsx`
- Uploads attachments to storage bucket `expense_attachments`.
- Approval decision path is DB function-driven (`decide_approval`) and in 011 writes `expense_deduction` ledger rows.

### Notifications flow
- Schema: `notifications(id, user_id, company_id, type, title, message, link, is_read, metadata, created_at)` (migration 010).
- Dashboard header:
  - fetches latest notifications + pending custody inbox count
  - mark-all-read via direct table update in client (`update({ is_read: true })`)
  - polling every ~30s
- Notifications page:
  - fetches latest 50
  - mark-all-read via direct table update in client
  - no dedicated API endpoint for mark-all-read
- Automation:
  - migration 012 adds DB trigger function `notify_custody_tx_events()` for insert/update events on `custody_transactions`.

### Attachments/storage flow
- Storage upload usage found in:
  - `src/app/dashboard/expenses/new/page.tsx`
  - `src/app/dashboard/customers/page.tsx`
- Bucket used: `expense_attachments` (created/policy-managed in migration 010).
- Persistence strategy:
  - expenses table stores `attachment_url` (path-like value from storage upload response)
  - custody transactions store `attachment_path`

---

## Notifications risk notes
- If migration 012 is not applied in production, notifications depend on UI behavior and can be incomplete.
- If both DB triggers and UI inserts are active simultaneously (state drift), duplicate notifications can occur.
- Current unread and pending counters rely on polling + separate queries; acceptable now but can become cost/perf concern at scale.
- Mark-all-read is client-direct table update (authorized by RLS), not centralized endpoint.

---

## Security/consistency findings (important)
- `decide_approval` function trust boundary should be reviewed carefully:
  - it accepts optional `p_actor_id` and checks role for that ID; ensure caller identity cannot spoof actor semantics.
- Multiple migrations redefine same function names (`decide_approval` in 010 then overridden in 011); deployment order is critical.
- `custodies.current_balance` still exists while ledger balance is derived from transactions; dual-source confusion risk if legacy code reads direct column.

---

## Safety Matrix

| Feature area | Dependency on current code/DB | Break risk | Safe rollout strategy | Rollback plan |
|---|---|---|---|---|
| SQL triggers (notifications, audit hooks) | `notifications`, `custody_transactions`, function order across migrations | Med | Additive migration only, idempotent `DROP TRIGGER IF EXISTS` + `CREATE`, verify in staging first | Disable trigger via follow-up migration (`DROP TRIGGER`), keep tables unchanged |
| Storage enhancements (new buckets/paths/policies) | Existing bucket `expense_attachments`, storage RLS folder-by-company assumptions | Med | Add new bucket/policies additive; keep existing bucket untouched until cutover | Revert policy changes, route uploads back to old bucket/path |
| RLS policy hardening | Existing `auth_company_id`, `auth_user_role`, many table policies | High | Add policies incrementally + test matrix per role/company + SQL smoke tests | Reapply previous policy set from backup SQL scripts |
| Audit logs expansion | Existing `audit_logs` table + events from functions/triggers | Low/Med | Insert-only additive triggers/functions; avoid changing current transactional paths initially | Drop new triggers/functions; keep audit table data |

---

## Questions to answer before issuing development orders
- هل تم تطبيق migrations `011` و`012` فعليًا على production DB بنفس ترتيبها؟
- هل نريد توحيد مصدر الإشعارات بالكامل على DB triggers (مع إزالة أي UI-generated notifications نهائيًا)؟
- ما سياسة الهوية المعتمدة في دوال `SECURITY DEFINER` التي تستقبل `actor_id` من العميل؟
- هل سنعتمد `custody_current_balance` فقط كمصدر وحيد للرصيد، ونمنع أي قراءة/تحديث مباشر لـ`custodies.current_balance`؟
- هل نحتاج API endpoint موحد لـ mark-all-read بدل التحديث المباشر من العميل؟
