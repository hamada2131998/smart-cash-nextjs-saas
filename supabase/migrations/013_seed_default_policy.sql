CREATE OR REPLACE FUNCTION public.seed_default_policies(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.policies WHERE company_id = p_company_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.policies (
    company_id,
    name,
    description,
    is_active,
    policy_rules,
    priority
  )
  VALUES (
    p_company_id,
    'Expense Policy',
    'سياسة افتراضية: موافقة تلقائية على المصروفات حتى 500 ريال',
    true,
    jsonb_build_object(
      'autoApproveAmount', 500,
      'requireAttachmentAbove', NULL,
      'requireApproval', true,
      'maxAmountWithoutApproval', 500
    ),
    100
  );
END;
$$;

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
  PERFORM public.seed_default_policies(v_company_id);

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
