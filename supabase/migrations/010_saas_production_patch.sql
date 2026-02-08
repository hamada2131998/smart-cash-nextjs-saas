-- SaaS production patch (idempotent / non-destructive)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'accountant', 'employee', 'manager', 'finance_manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE custody_status AS ENUM ('active', 'closed', 'frozen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('active', 'completed', 'on_hold', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO activity_types (code, name, description) VALUES
('commercial', 'Commercial', 'Commercial companies'),
('contracting', 'Contracting', 'Contracting companies'),
('sales_reps', 'Sales Reps', 'Sales representative companies')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  activity_type_id UUID NOT NULL REFERENCES activity_types(id),
  created_by UUID REFERENCES auth.users(id),
  commercial_number VARCHAR(50),
  tax_number VARCHAR(50),
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  subscription_status VARCHAR(20) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  CONSTRAINT unique_user_company_role UNIQUE(user_id, company_id)
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  status project_status DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  initial_amount DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'SAR',
  status custody_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  custody_id UUID REFERENCES custodies(id),
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  project_id UUID REFERENCES projects(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SAR',
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  status expense_status DEFAULT 'draft',
  attachment_url TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  status approval_status DEFAULT 'pending',
  decided_by UUID REFERENCES profiles(id),
  decided_at TIMESTAMPTZ,
  comment TEXT,
  auto_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.auth_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND company_id = auth_company_id() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT auth_user_role() = 'owner'::user_role; $$;

CREATE OR REPLACE FUNCTION public.is_accountant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT auth_user_role() IN ('accountant','admin','owner'); $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_activity_code text;
  v_activity_id uuid;
  v_full_name text;
  v_company_name text;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1));
  v_company_name := COALESCE(NEW.raw_user_meta_data ->> 'company_name', v_full_name || ' Company');
  v_activity_code := COALESCE(NEW.raw_user_meta_data ->> 'activity_type', 'commercial');

  SELECT id INTO v_activity_id FROM activity_types WHERE code = v_activity_code LIMIT 1;
  IF v_activity_id IS NULL THEN
    SELECT id INTO v_activity_id FROM activity_types WHERE code = 'commercial' LIMIT 1;
  END IF;

  INSERT INTO companies (name, activity_type_id, created_by)
  VALUES (v_company_name, v_activity_id, NEW.id)
  RETURNING id INTO v_company_id;

  INSERT INTO profiles (id, email, full_name, company_id)
  VALUES
    (NEW.id, NEW.email, v_full_name, v_company_id);

  INSERT INTO user_roles (user_id, company_id, role)
  VALUES (NEW.id, v_company_id, 'owner')
  ON CONFLICT (user_id, company_id) DO NOTHING;

  INSERT INTO custodies (company_id, user_id, initial_amount, current_balance)
  VALUES (v_company_id, NEW.id, 0, 0)
  ON CONFLICT DO NOTHING;

  INSERT INTO expense_categories (company_id, name, code) VALUES
    (v_company_id, 'Fuel', 'fuel'),
    (v_company_id, 'Meals', 'meals'),
    (v_company_id, 'Office', 'office'),
    (v_company_id, 'Maintenance', 'maintenance'),
    (v_company_id, 'Transportation', 'transportation'),
    (v_company_id, 'Misc', 'misc')
  ON CONFLICT DO NOTHING;

  IF v_activity_code = 'contracting' THEN
    INSERT INTO projects (company_id, name, code, status) VALUES
      (v_company_id, 'Project A', 'PRJ-A', 'active'),
      (v_company_id, 'Project B', 'PRJ-B', 'active')
    ON CONFLICT DO NOTHING;

    INSERT INTO cost_centers (company_id, name, code) VALUES
      (v_company_id, 'Cost Center 01', 'CC-01'),
      (v_company_id, 'Cost Center 02', 'CC-02')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_approval(
  p_approval_id uuid,
  p_action approval_status,
  p_comment text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_approval approvals%ROWTYPE;
  v_expense expenses%ROWTYPE;
  v_custody custodies%ROWTYPE;
BEGIN
  SELECT * INTO v_approval FROM approvals WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval not found';
  END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = v_approval.expense_id FOR UPDATE;
  IF NOT FOUND OR v_expense.company_id <> auth_company_id() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_actor_id IS NOT NULL THEN
    SELECT role INTO v_role FROM user_roles WHERE user_id = p_actor_id AND company_id = auth_company_id() LIMIT 1;
    IF v_role NOT IN ('accountant', 'admin', 'owner') THEN
      RAISE EXCEPTION 'Unauthorized: insufficient permissions';
    END IF;
  END IF;

  IF v_approval.status <> 'pending' THEN
    RAISE EXCEPTION 'Approval already decided';
  END IF;

  IF p_action = 'approved' THEN
    IF v_expense.custody_id IS NOT NULL THEN
      SELECT * INTO v_custody FROM custodies WHERE id = v_expense.custody_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Custody not found';
      END IF;
      IF v_custody.current_balance < v_expense.amount THEN
        RAISE EXCEPTION 'Insufficient custody balance';
      END IF;
      UPDATE custodies SET current_balance = current_balance - v_expense.amount WHERE id = v_custody.id;
    END IF;

    UPDATE approvals
    SET status = 'approved', auto_approved = (p_actor_id IS NULL), decided_by = p_actor_id, decided_at = NOW(), comment = COALESCE(p_comment, '')
    WHERE id = p_approval_id;

    UPDATE expenses SET status = 'approved', decided_at = NOW() WHERE id = v_expense.id;
    RETURN true;
  END IF;

  IF p_comment IS NULL OR trim(p_comment) = '' THEN
    RAISE EXCEPTION 'Comment is required for rejection';
  END IF;

  UPDATE approvals SET status = 'rejected', decided_by = p_actor_id, decided_at = NOW(), comment = p_comment WHERE id = p_approval_id;
  UPDATE expenses SET status = 'rejected', decided_at = NOW() WHERE id = v_expense.id;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_expense(p_expense_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense expenses%ROWTYPE;
  v_approval_id uuid;
BEGIN
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;
  IF v_expense.company_id <> auth_company_id() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE expenses SET status = 'submitted', submitted_at = NOW() WHERE id = p_expense_id;

  INSERT INTO approvals (company_id, expense_id, status)
  VALUES (v_expense.company_id, p_expense_id, 'pending')
  RETURNING id INTO v_approval_id;

  IF v_expense.amount < 500 THEN
    PERFORM public.decide_approval(v_approval_id, 'approved', 'auto-approval', NULL);
  END IF;

  RETURN v_approval_id;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'companies_updated_at') THEN
    CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at') THEN
    CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'expenses_updated_at') THEN
    CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_onboarding();
  END IF;
END $$;

ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Activity types readable by all" ON activity_types;
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "Owners can update their company" ON companies;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Privileged can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view roles in their company" ON user_roles;
DROP POLICY IF EXISTS "Owners can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view categories in their company" ON expense_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can view projects in their company" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Users can view cost centers in their company" ON cost_centers;
DROP POLICY IF EXISTS "Admins can manage cost centers" ON cost_centers;
DROP POLICY IF EXISTS "Users can view own custodies" ON custodies;
DROP POLICY IF EXISTS "Users can create custodies" ON custodies;
DROP POLICY IF EXISTS "Owners can manage custodies" ON custodies;
DROP POLICY IF EXISTS "Users can view expenses in their company" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own draft expenses" ON expenses;
DROP POLICY IF EXISTS "Accountants can manage expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view own expense approvals" ON approvals;
DROP POLICY IF EXISTS "Approvers can manage approvals" ON approvals;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view audit logs in their company" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;

CREATE POLICY "Activity types readable by all" ON activity_types FOR SELECT USING (true);
CREATE POLICY "Users can view their company" ON companies FOR SELECT USING (id = auth_company_id());
CREATE POLICY "Owners can update their company" ON companies FOR UPDATE USING (is_owner());
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Privileged can view company profiles" ON profiles FOR SELECT USING (company_id = auth_company_id() AND (is_owner() OR auth_user_role() IN ('accountant','admin','manager','finance_manager')));
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can view their own role" ON user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view roles in their company" ON user_roles FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "Owners can manage roles" ON user_roles FOR ALL USING (company_id = auth_company_id() AND is_owner());
CREATE POLICY "Users can view categories in their company" ON expense_categories FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "Admins can manage categories" ON expense_categories FOR ALL USING (company_id = auth_company_id() AND is_owner());
CREATE POLICY "Users can view projects in their company" ON projects FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "Admins can manage projects" ON projects FOR ALL USING (company_id = auth_company_id() AND is_owner());
CREATE POLICY "Users can view cost centers in their company" ON cost_centers FOR SELECT USING (company_id = auth_company_id());
CREATE POLICY "Admins can manage cost centers" ON cost_centers FOR ALL USING (company_id = auth_company_id() AND is_owner());
CREATE POLICY "Users can view own custodies" ON custodies FOR SELECT USING (company_id = auth_company_id() AND (user_id = auth.uid() OR is_owner() OR is_accountant()));
CREATE POLICY "Users can create custodies" ON custodies FOR INSERT WITH CHECK (company_id = auth_company_id() AND is_owner());
CREATE POLICY "Owners can manage custodies" ON custodies FOR UPDATE USING (company_id = auth_company_id() AND is_owner());
CREATE POLICY "Users can view expenses in their company" ON expenses FOR SELECT USING (company_id = auth_company_id() AND (created_by = auth.uid() OR is_owner() OR is_accountant()));
CREATE POLICY "Users can create expenses" ON expenses FOR INSERT WITH CHECK (company_id = auth_company_id() AND created_by = auth.uid());
CREATE POLICY "Users can update own draft expenses" ON expenses FOR UPDATE USING (company_id = auth_company_id() AND created_by = auth.uid() AND status = 'draft');
CREATE POLICY "Accountants can manage expenses" ON expenses FOR UPDATE USING (company_id = auth_company_id() AND is_accountant());
CREATE POLICY "Users can view own expense approvals" ON approvals FOR SELECT USING (company_id = auth_company_id() AND (expense_id IN (SELECT id FROM expenses WHERE created_by = auth.uid()) OR is_accountant()));
CREATE POLICY "Approvers can manage approvals" ON approvals FOR ALL USING (company_id = auth_company_id() AND is_accountant());
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (company_id = auth_company_id());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can view audit logs in their company" ON audit_logs FOR SELECT USING (company_id = auth_company_id() AND is_owner());
CREATE POLICY "System can create audit logs" ON audit_logs FOR INSERT WITH CHECK (company_id = auth_company_id());

INSERT INTO storage.buckets (id, name, public)
VALUES ('expense_attachments', 'expense_attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments" ON storage.objects;

CREATE POLICY "Users can upload attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'expense_attachments' AND (storage.foldername(name))[1] = auth_company_id()::text);

CREATE POLICY "Users can view attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'expense_attachments' AND (storage.foldername(name))[1] = auth_company_id()::text);

CREATE POLICY "Users can delete attachments" ON storage.objects
FOR DELETE USING (bucket_id = 'expense_attachments' AND (storage.foldername(name))[1] = auth_company_id()::text);
