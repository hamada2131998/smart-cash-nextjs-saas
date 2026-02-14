# Default Policy Seed Plan

## 1) Policies table confirmation
- Canonical table name: `public.policies`
- Source: `supabase/schema.sql` (`CREATE TABLE policies`)

## 2) Actual insert columns for `policies`
From `supabase/schema.sql`, columns are:
- `id` (uuid, PK, default)
- `company_id` (uuid, NOT NULL)
- `name` (varchar, NOT NULL)
- `description` (text, nullable)
- `activity_type_ids` (uuid[], nullable)
- `policy_rules` (jsonb, NOT NULL)
- `priority` (integer, default 0)
- `is_active` (boolean, default true)
- `created_by` (uuid, nullable)
- `created_at` (timestamptz, default)
- `updated_at` (timestamptz, default)

Required for a minimal valid insert:
- `company_id`, `name`, `policy_rules`

## 3) UI-expected policy rule keys (from policies page)
From `src/app/dashboard/policies/page.tsx`, UI reads these camelCase keys on `policy.rules`:
- `autoApproveAmount`
- `requireAttachmentAbove`
- `requireApproval`
- `maxAmountWithoutApproval`

## 4) Where policies are currently used in approval flow (paths only)
- `supabase/migrations/010_saas_production_patch.sql` (approval logic in `public.submit_expense` / `public.decide_approval`)
- `src/app/dashboard/expenses/new/page.tsx` (calls `submit_expense` RPC)
- `src/app/dashboard/expenses/page.tsx` (calls `decide_approval` RPC)

Current state:
- No existing approval-flow query/function reads from `public.policies`.
- Auto-approval threshold is currently hardcoded in `public.submit_expense` (`amount < 500`).

## 5) Default Policy values decision
- `name`: `Expense Policy`
- `is_active`: `true`
- threshold auto-approve: `500 SAR`
- JSON rules payload: include `autoApproveAmount = 500` and keep UI-safe camelCase keys
- `priority`: `100` (explicit safe value)

Chosen insert payload:
- `name = 'Expense Policy'`
- `description = 'سياسة افتراضية: موافقة تلقائية على المصروفات حتى 500 ريال'`
- `is_active = true`
- `policy_rules = {"autoApproveAmount":500,"requireAttachmentAbove":null,"requireApproval":true,"maxAmountWithoutApproval":500}`
- `priority = 100`

## 6) Local validation result
- Validation tooling is not available in this environment (`supabase` CLI and `psql` are not installed).
- SQL was validated by careful schema/signature matching against repository sources only.
