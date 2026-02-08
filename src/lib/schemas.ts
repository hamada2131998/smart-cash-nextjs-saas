import { z } from 'zod';

export const expenseSchema = z.object({
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  category_id: z.string().min(1, 'اختر تصنيف المصروف'),
  project_id: z.string().optional(),
  cost_center_id: z.string().optional(),
  expense_date: z.string().min(1, 'اختر تاريخ المصروف'),
  description: z.string().min(3, 'الوصف يجب أن يكون 3 أحرف على الأقل').max(500, 'الوصف طويل جداً'),
  notes: z.string().max(1000, 'الملاحظات طويلة جداً').optional(),
});

export const custodySchema = z.object({
  employee_id: z.string().min(1, 'اختر الموظف'),
  initial_amount: z.coerce.number().min(0, 'المبلغ يجب أن يكون صفر أو أكبر'),
  currency: z.string().default('SAR'),
  notes: z.string().max(500).optional(),
});

export const policySchema = z.object({
  name: z.string().min(3, 'اسم السياسة يجب أن يكون 3 أحرف على الأقل'),
  description: z.string().max(500).optional(),
  activity_type_ids: z.array(z.string()).min(1, 'اختر نوع نشاط واحد على الأقل'),
  policy_rules: z.object({
    auto_approve_amount: z.number().optional(),
    require_attachment_above: z.number().optional(),
    require_approval: z.boolean().optional(),
    max_amount_without_approval: z.number().optional(),
    allowed_categories: z.array(z.string()).optional(),
    blocked_categories: z.array(z.string()).optional(),
  }),
  priority: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(2, 'اسم التصنيف يجب أن يكون حرفين على الأقل'),
  code: z.string().optional(),
  parent_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const projectSchema = z.object({
  name: z.string().min(2, 'اسم المشروع يجب أن يكون حرفين على الأقل'),
  code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.coerce.number().optional(),
});

export const costCenterSchema = z.object({
  name: z.string().min(2, 'اسم مركز التكلفة يجب أن يكون حرفين على الأقل'),
  code: z.string().optional(),
  description: z.string().optional(),
  parent_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const userSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صحيح'),
  full_name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'accountant', 'employee']),
});

export const companySchema = z.object({
  name: z.string().min(3, 'اسم الشركة يجب أن يكون 3 أحرف على الأقل'),
  commercial_number: z.string().optional(),
  tax_number: z.string().optional(),
  activity_type_id: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type CustodyFormData = z.infer<typeof custodySchema>;
export type PolicyFormData = z.infer<typeof policySchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export type CostCenterFormData = z.infer<typeof costCenterSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type CompanyFormData = z.infer<typeof companySchema>;
