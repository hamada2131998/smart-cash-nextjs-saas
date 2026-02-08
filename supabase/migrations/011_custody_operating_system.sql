-- Custody operating system (idempotent / non-destructive)

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_rep';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT customers_company_name_unique UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS custody_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  custody_id UUID NOT NULL REFERENCES custodies(id) ON DELETE CASCADE,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('topup', 'transfer', 'expense_deduction')),
  source TEXT NOT NULL CHECK (source IN ('manual_admin', 'customer_payment', 'transfer', 'expense')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  from_user_id UUID REFERENCES profiles(id),
  to_user_id UUID REFERENCES profiles(id),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  attachment_path TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_by UUID REFERENCES profiles(id),
  decided_at TIMESTAMPTZ,
  decision_comment TEXT
);

CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_custody_transactions_company ON custody_transactions(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custody_transactions_to_user_pending ON custody_transactions(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_custody_transactions_custody ON custody_transactions(custody_id, status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'customers_updated_at') THEN
    CREATE TRIGGER customers_updated_at
      BEFORE UPDATE ON customers
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.custody_current_balance(p_custody_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_balance numeric;
BEGIN
  SELECT user_id, company_id
  INTO v_user_id, v_company_id
  FROM custodies
  WHERE id = p_custody_id;

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN tx_type = 'topup' AND to_user_id = v_user_id THEN amount
      WHEN tx_type = 'transfer' AND to_user_id = v_user_id THEN amount
      WHEN tx_type = 'transfer' AND from_user_id = v_user_id THEN -amount
      WHEN tx_type = 'expense_deduction' AND custody_id = p_custody_id THEN -amount
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM custody_transactions
  WHERE company_id = v_company_id
    AND status = 'approved';

  RETURN COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_manual_topup(
  p_to_user_id uuid,
  p_amount numeric,
  p_notes text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_company_id uuid;
  v_custody_id uuid;
  v_tx_id uuid;
BEGIN
  SELECT auth_user_role() INTO v_role;
  IF v_role NOT IN ('owner', 'admin', 'accountant', 'manager') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  v_company_id := auth_company_id();

  SELECT id INTO v_custody_id
  FROM custodies
  WHERE company_id = v_company_id
    AND user_id = p_to_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_custody_id IS NULL THEN
    RAISE EXCEPTION 'Target user has no active custody';
  END IF;

  INSERT INTO custody_transactions (
    company_id,
    custody_id,
    tx_type,
    source,
    status,
    amount,
    from_user_id,
    to_user_id,
    notes,
    created_by
  ) VALUES (
    v_company_id,
    v_custody_id,
    'topup',
    'manual_admin',
    'pending',
    p_amount,
    auth.uid(),
    p_to_user_id,
    COALESCE(p_notes, ''),
    auth.uid()
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_manual_topup(
  p_tx_id uuid,
  p_approve boolean,
  p_comment text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx custody_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_tx
  FROM custody_transactions
  WHERE id = p_tx_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.company_id <> auth_company_id() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_tx.tx_type <> 'topup' OR v_tx.source <> 'manual_admin' OR v_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'Invalid transaction state';
  END IF;

  IF v_tx.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only receiver can decide';
  END IF;

  UPDATE custody_transactions
  SET
    status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    decided_by = auth.uid(),
    decided_at = NOW(),
    decision_comment = COALESCE(p_comment, '')
  WHERE id = p_tx_id;

  RETURN p_approve;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_transfer(
  p_to_user_id uuid,
  p_amount numeric,
  p_notes text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_from_custody_id uuid;
  v_to_custody_id uuid;
  v_tx_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  IF p_to_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot transfer to self';
  END IF;

  v_company_id := auth_company_id();

  SELECT id INTO v_from_custody_id
  FROM custodies
  WHERE company_id = v_company_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;

  IF v_from_custody_id IS NULL THEN
    RAISE EXCEPTION 'Sender has no active custody';
  END IF;

  SELECT id INTO v_to_custody_id
  FROM custodies
  WHERE company_id = v_company_id
    AND user_id = p_to_user_id
    AND status = 'active'
  LIMIT 1;

  IF v_to_custody_id IS NULL THEN
    RAISE EXCEPTION 'Receiver has no active custody';
  END IF;

  INSERT INTO custody_transactions (
    company_id,
    custody_id,
    tx_type,
    source,
    status,
    amount,
    from_user_id,
    to_user_id,
    notes,
    created_by
  ) VALUES (
    v_company_id,
    v_from_custody_id,
    'transfer',
    'transfer',
    'pending',
    p_amount,
    auth.uid(),
    p_to_user_id,
    COALESCE(p_notes, ''),
    auth.uid()
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_transfer(
  p_tx_id uuid,
  p_approve boolean,
  p_comment text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx custody_transactions%ROWTYPE;
  v_sender_custody_id uuid;
  v_sender_balance numeric;
BEGIN
  SELECT * INTO v_tx
  FROM custody_transactions
  WHERE id = p_tx_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.company_id <> auth_company_id() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_tx.tx_type <> 'transfer' OR v_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'Invalid transaction state';
  END IF;

  IF v_tx.to_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only receiver can decide';
  END IF;

  IF p_approve THEN
    SELECT id INTO v_sender_custody_id
    FROM custodies
    WHERE company_id = v_tx.company_id
      AND user_id = v_tx.from_user_id
      AND status = 'active'
    LIMIT 1;

    IF v_sender_custody_id IS NULL THEN
      RAISE EXCEPTION 'Sender custody not found';
    END IF;

    SELECT custody_current_balance(v_sender_custody_id) INTO v_sender_balance;
    IF COALESCE(v_sender_balance, 0) < v_tx.amount THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
  END IF;

  UPDATE custody_transactions
  SET
    status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    decided_by = auth.uid(),
    decided_at = NOW(),
    decision_comment = COALESCE(p_comment, '')
  WHERE id = p_tx_id;

  RETURN p_approve;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_customer_payment(
  p_amount numeric,
  p_customer_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_attachment_path text DEFAULT NULL,
  p_notes text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_company_id uuid;
  v_custody_id uuid;
  v_tx_id uuid;
  v_customer_name text;
BEGIN
  SELECT auth_user_role() INTO v_role;
  IF v_role <> 'sales_rep' THEN
    RAISE EXCEPTION 'Only sales reps can record customer payments';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  IF p_attachment_path IS NULL OR trim(p_attachment_path) = '' THEN
    RAISE EXCEPTION 'Attachment is required';
  END IF;

  IF p_customer_id IS NULL AND (p_customer_name IS NULL OR trim(p_customer_name) = '') THEN
    RAISE EXCEPTION 'Customer is required';
  END IF;

  v_company_id := auth_company_id();

  IF p_customer_id IS NOT NULL THEN
    SELECT name INTO v_customer_name
    FROM customers
    WHERE id = p_customer_id
      AND company_id = v_company_id
    LIMIT 1;

    IF v_customer_name IS NULL THEN
      RAISE EXCEPTION 'Customer not found';
    END IF;
  ELSE
    v_customer_name := trim(p_customer_name);
  END IF;

  SELECT id INTO v_custody_id
  FROM custodies
  WHERE company_id = v_company_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;

  IF v_custody_id IS NULL THEN
    RAISE EXCEPTION 'No active custody found';
  END IF;

  INSERT INTO custody_transactions (
    company_id,
    custody_id,
    tx_type,
    source,
    status,
    amount,
    to_user_id,
    customer_id,
    customer_name,
    attachment_path,
    notes,
    created_by,
    decided_by,
    decided_at
  ) VALUES (
    v_company_id,
    v_custody_id,
    'topup',
    'customer_payment',
    'approved',
    p_amount,
    auth.uid(),
    p_customer_id,
    v_customer_name,
    p_attachment_path,
    COALESCE(p_notes, ''),
    auth.uid(),
    auth.uid(),
    NOW()
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
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
  v_custody_balance numeric;
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
    SELECT role INTO v_role
    FROM user_roles
    WHERE user_id = p_actor_id
      AND company_id = auth_company_id()
    LIMIT 1;

    IF v_role NOT IN ('accountant', 'admin', 'owner', 'finance_manager') THEN
      RAISE EXCEPTION 'Unauthorized: insufficient permissions';
    END IF;
  END IF;

  IF v_approval.status <> 'pending' THEN
    RAISE EXCEPTION 'Approval already decided';
  END IF;

  IF p_action = 'approved' THEN
    IF v_expense.custody_id IS NOT NULL THEN
      SELECT custody_current_balance(v_expense.custody_id) INTO v_custody_balance;
      IF COALESCE(v_custody_balance, 0) < v_expense.amount THEN
        RAISE EXCEPTION 'Insufficient custody balance';
      END IF;

      INSERT INTO custody_transactions (
        company_id,
        custody_id,
        tx_type,
        source,
        status,
        amount,
        from_user_id,
        notes,
        created_by,
        decided_by,
        decided_at,
        decision_comment
      ) VALUES (
        v_expense.company_id,
        v_expense.custody_id,
        'expense_deduction',
        'expense',
        'approved',
        v_expense.amount,
        v_expense.created_by,
        'Expense approval ' || v_expense.id::text,
        COALESCE(p_actor_id, auth.uid()),
        p_actor_id,
        NOW(),
        COALESCE(p_comment, '')
      );
    END IF;

    UPDATE approvals
    SET
      status = 'approved',
      auto_approved = (p_actor_id IS NULL),
      decided_by = p_actor_id,
      decided_at = NOW(),
      comment = COALESCE(p_comment, '')
    WHERE id = p_approval_id;

    UPDATE expenses
    SET
      status = 'approved',
      decided_at = NOW()
    WHERE id = v_expense.id;

    RETURN true;
  END IF;

  IF p_comment IS NULL OR trim(p_comment) = '' THEN
    RAISE EXCEPTION 'Comment is required for rejection';
  END IF;

  UPDATE approvals
  SET
    status = 'rejected',
    decided_by = p_actor_id,
    decided_at = NOW(),
    comment = p_comment
  WHERE id = p_approval_id;

  UPDATE expenses
  SET
    status = 'rejected',
    decided_at = NOW()
  WHERE id = v_expense.id;

  RETURN false;
END;
$$;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view customers in company" ON customers;
DROP POLICY IF EXISTS "Users can create customers in company" ON customers;
DROP POLICY IF EXISTS "Admins can update customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

CREATE POLICY "Users can view customers in company"
ON customers FOR SELECT
USING (company_id = auth_company_id());

CREATE POLICY "Users can create customers in company"
ON customers FOR INSERT
WITH CHECK (company_id = auth_company_id() AND created_by = auth.uid());

CREATE POLICY "Admins can update customers"
ON customers FOR UPDATE
USING (company_id = auth_company_id() AND auth_user_role() IN ('owner', 'admin'));

CREATE POLICY "Admins can delete customers"
ON customers FOR DELETE
USING (company_id = auth_company_id() AND auth_user_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS "Users can view custody transactions" ON custody_transactions;
DROP POLICY IF EXISTS "Users can insert custody transactions" ON custody_transactions;
DROP POLICY IF EXISTS "Receivers can decide custody transactions" ON custody_transactions;

CREATE POLICY "Users can view custody transactions"
ON custody_transactions FOR SELECT
USING (
  company_id = auth_company_id()
  AND (
    auth_user_role() IN ('owner', 'admin', 'accountant', 'manager', 'finance_manager')
    OR from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR custody_id IN (SELECT id FROM custodies WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert custody transactions"
ON custody_transactions FOR INSERT
WITH CHECK (
  company_id = auth_company_id()
  AND created_by = auth.uid()
  AND (
    (tx_type = 'topup' AND source = 'manual_admin' AND auth_user_role() IN ('owner', 'admin', 'accountant', 'manager'))
    OR (tx_type = 'topup' AND source = 'customer_payment' AND auth_user_role() = 'sales_rep' AND to_user_id = auth.uid())
    OR (tx_type = 'transfer' AND source = 'transfer' AND from_user_id = auth.uid())
    OR (tx_type = 'expense_deduction' AND source = 'expense')
  )
);

CREATE POLICY "Receivers can decide custody transactions"
ON custody_transactions FOR UPDATE
USING (
  company_id = auth_company_id()
  AND status = 'pending'
  AND (
    (tx_type = 'topup' AND source = 'manual_admin' AND to_user_id = auth.uid())
    OR (tx_type = 'transfer' AND source = 'transfer' AND to_user_id = auth.uid())
  )
)
WITH CHECK (
  company_id = auth_company_id()
  AND (
    (tx_type = 'topup' AND source = 'manual_admin' AND to_user_id = auth.uid())
    OR (tx_type = 'transfer' AND source = 'transfer' AND to_user_id = auth.uid())
  )
);
