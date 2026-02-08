export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'owner' | 'admin' | 'accountant' | 'employee' | 'manager' | 'finance_manager';
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type CustodyStatus = 'active' | 'closed' | 'frozen';
export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled';

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

// Full table list matches supabase/migrations/010_saas_production_patch.sql
export interface Database {
  public: {
    Tables: {
      activity_types: GenericTable;
      companies: GenericTable;
      profiles: GenericTable;
      user_roles: GenericTable;
      expense_categories: GenericTable;
      projects: GenericTable;
      cost_centers: GenericTable;
      custodies: GenericTable;
      expenses: GenericTable;
      approvals: GenericTable;
      notifications: GenericTable;
      audit_logs: GenericTable;
    };
    Views: Record<string, never>;
    Functions: {
      auth_company_id: { Args: Record<PropertyKey, never>; Returns: string };
      auth_user_role: { Args: Record<PropertyKey, never>; Returns: UserRole | null };
      is_owner: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_accountant: { Args: Record<PropertyKey, never>; Returns: boolean };
      submit_expense: { Args: { p_expense_id: string }; Returns: string };
      decide_approval: {
        Args: {
          p_approval_id: string;
          p_action: ApprovalStatus;
          p_comment: string;
          p_actor_id?: string | null;
        };
        Returns: boolean;
      };
      handle_new_user_onboarding: { Args: Record<PropertyKey, never>; Returns: unknown };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
