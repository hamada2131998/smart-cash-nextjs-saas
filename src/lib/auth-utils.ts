import { UserRole } from '@/types/database.types';

export const rolePermissions: Record<UserRole, string[]> = {
  owner: ['manage_company', 'manage_users', 'manage_policies', 'view_all', 'approve', 'reject', 'manage_custodies', 'manage_expenses', 'view_reports', 'manage_settings'],
  admin: ['manage_users', 'manage_policies', 'view_all', 'approve', 'reject', 'manage_custodies', 'manage_expenses', 'view_reports', 'manage_settings'],
  accountant: ['view_all', 'approve', 'reject', 'manage_expenses', 'view_reports'],
  employee: ['view_own', 'create_expense', 'submit_expense', 'view_own_custody'],
  manager: ['view_all', 'approve', 'manage_expenses', 'view_reports'],
  finance_manager: ['view_all', 'approve', 'reject', 'manage_expenses', 'manage_custodies', 'view_reports'],
  sales_rep: ['view_own', 'create_expense', 'submit_expense', 'view_own_custody', 'collect_customer_payment'],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}

export function canApprove(role: UserRole): boolean {
  return hasPermission(role, 'approve');
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'manage_users');
}

export function canManagePolicies(role: UserRole): boolean {
  return hasPermission(role, 'manage_policies');
}

export function canViewAllData(role: UserRole): boolean {
  return hasPermission(role, 'view_all');
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    accountant: 'Accountant',
    employee: 'Employee',
    manager: 'Manager',
    finance_manager: 'Finance Manager',
    sales_rep: 'Sales Rep',
  };
  return labels[role] || role;
}
