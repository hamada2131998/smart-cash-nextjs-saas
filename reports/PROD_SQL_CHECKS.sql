-- A) Tables existence
select
  to_regclass('public.notifications') as notifications,
  to_regclass('public.custody_transactions') as custody_transactions,
  to_regclass('public.customers') as customers,
  to_regclass('public.expenses') as expenses;

-- B) Functions existence
select proname
from pg_proc
where proname in ('custody_current_balance','auth_company_id','auth_user_role')
order by proname;

-- C) Triggers on custody_transactions (should be empty currently)
select
  tgname,
  pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t
join pg_class c on t.tgrelid = c.oid
where c.relname = 'custody_transactions'
  and not t.tgisinternal
order by tgname;

-- D) Optional: custody_transactions columns
select
  column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='custody_transactions'
order by ordinal_position;
