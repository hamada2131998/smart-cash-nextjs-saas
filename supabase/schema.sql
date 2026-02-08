-- Smart Cash & Custody SaaS Database Schema
-- Supabase PostgreSQL Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

-- ============================================
-- TABLES
-- ============================================

-- Activity Types Table
CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  requires_project BOOLEAN DEFAULT FALSE,
  requires_cost_center BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Companies Table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  commercial_number VARCHAR(50),
  tax_number VARCHAR(50),
  logo_url TEXT,
  activity_type_id UUID REFERENCES activity_types(id),
  settings JSONB DEFAULT '{}'::jsonb,
  subscription_status VARCHAR(20) DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Profiles Table (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'employee',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'accountant', 'employee'))
);

-- Custodies Table
CREATE TABLE custodies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id),
  custodian_type VARCHAR(20) DEFAULT 'employee',
  initial_amount DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'SAR',
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT valid_custodian_type CHECK (custodian_type IN ('employee', 'manager')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'closed', 'frozen'))
);

-- Custody Balances Table (Audit Trail)
CREATE TABLE custody_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  custody_id UUID NOT NULL REFERENCES custodies(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  description TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('add', 'subtract', 'adjust'))
);

-- Expense Categories Table
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  parent_id UUID REFERENCES expense_categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT valid_project_status CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled'))
);

-- Cost Centers Table
CREATE TABLE cost_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  parent_id UUID REFERENCES cost_centers(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Expenses Table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  custody_id UUID REFERENCES custodies(id),
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  project_id UUID REFERENCES projects(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SAR',
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  requires_approval BOOLEAN DEFAULT TRUE,
  approval_policy_id UUID,
  policy_result JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT valid_expense_status CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'paid'))
);

-- Expense Attachments Table
CREATE TABLE expense_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Approvals Table
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'pending',
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT valid_approval_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Policies Table
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  activity_type_ids UUID[],
  policy_rules JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Notification Preferences Table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  expense_approvals BOOLEAN DEFAULT TRUE,
  expense_rejections BOOLEAN DEFAULT TRUE,
  low_balance_alerts BOOLEAN DEFAULT TRUE,
  weekly_reports BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Activity Types: Public read, authenticated manage
CREATE POLICY "Activity types are viewable by everyone" ON activity_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage activity types" ON activity_types FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Companies: Users can view their own company
CREATE POLICY "Users can view their company" ON companies FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profiles.company_id = companies.id)
);
CREATE POLICY "Owners can manage their company" ON companies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner' AND profiles.company_id = companies.id)
);

-- Profiles: Users can view all profiles in their company
CREATE POLICY "Users can view profiles in their company" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profiles.company_id = profiles.company_id)
);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Custodies: Role-based access
CREATE POLICY "Users can view custodies in their company" ON custodies FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'accountant'))
  OR EXISTS (SELECT 1 FROM custodies WHERE employee_id = auth.uid())
);
CREATE POLICY "Admins can manage custodies" ON custodies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Custody Balances: Related to custodies
CREATE POLICY "Users can view custody balances" ON custody_balances FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'accountant'))
  OR EXISTS (SELECT 1 FROM custodies WHERE id = custody_balances.custody_id AND employee_id = auth.uid())
);
CREATE POLICY "Admins can manage custody balances" ON custody_balances FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Expense Categories: Company-scoped
CREATE POLICY "Users can view expense categories" ON expense_categories FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profiles.company_id = expense_categories.company_id)
);
CREATE POLICY "Admins can manage expense categories" ON expense_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Projects: Company-scoped
CREATE POLICY "Users can view projects" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profiles.company_id = projects.company_id)
);
CREATE POLICY "Admins can manage projects" ON projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Cost Centers: Company-scoped
CREATE POLICY "Users can view cost centers" ON cost_centers FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profiles.company_id = cost_centers.company_id)
);
CREATE POLICY "Admins can manage cost centers" ON cost_centers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Expenses: Role-based access
CREATE POLICY "Users can view expenses" ON expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'accountant'))
  OR submitted_by = auth.uid()
);
CREATE POLICY "Users can create expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (
  auth.uid() = submitted_by AND status = 'draft'
);
CREATE POLICY "Approvers can manage expenses" ON expenses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'accountant'))
);

-- Expense Attachments: Related to expenses
CREATE POLICY "Users can view attachments" ON expense_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'accountant'))
);
CREATE POLICY "Users can add attachments" ON expense_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

-- Approvals: Role-based access
CREATE POLICY "Approvers can view approvals" ON approvals FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'accountant'))
  OR approver_id = auth.uid()
);
CREATE POLICY "Approvers can manage approvals" ON approvals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'accountant'))
);

-- Policies: Company-scoped
CREATE POLICY "Users can view policies" ON policies FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profiles.company_id = policies.company_id)
);
CREATE POLICY "Admins can manage policies" ON policies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Notifications: User-scoped
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Notification Preferences: User-scoped
CREATE POLICY "Users can manage own notification preferences" ON notification_preferences FOR ALL USING (user_id = auth.uid());

-- Audit Logs: Admins only
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update timestamp on update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_activity_types_updated_at BEFORE UPDATE ON activity_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custodies_updated_at BEFORE UPDATE ON custodies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON cost_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update custody balance
CREATE OR REPLACE FUNCTION update_custody_balance(
  p_custody_id UUID,
  p_amount DECIMAL,
  p_transaction_type VARCHAR
)
RETURNS VOID AS $$
BEGIN
  UPDATE custodies
  SET current_balance = CASE
    WHEN p_transaction_type = 'add' THEN current_balance + p_amount
    WHEN p_transaction_type = 'subtract' THEN current_balance - p_amount
    ELSE p_amount
  END,
  updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = p_custody_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default activity types
INSERT INTO activity_types (name, code, description, requires_project, requires_cost_center) VALUES
('شركة تجارية', 'commercial', 'أنشطة تجارية ومتاجر', FALSE, FALSE),
('مقاولات', 'contracting', 'مقاولات البناء والمشاريع', TRUE, TRUE),
('مناديب مبيعات', 'sales', 'فرق المبيعات والتوزيع', FALSE, FALSE);

-- Create a function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for expense attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('expenses', 'expenses', FALSE);

-- Storage policies
CREATE POLICY "Users can upload expense attachments" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'expenses'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can view expense attachments" ON storage.objects FOR SELECT USING (
  bucket_id = 'expenses'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete own expense attachments" ON storage.objects FOR DELETE USING (
  bucket_id = 'expenses'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);
