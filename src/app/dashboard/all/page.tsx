'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { UserRole } from '@/types/database.types';

type SectionLink = {
  href: string;
  label: string;
  roles?: UserRole[];
};

const sectionLinks: SectionLink[] = [
  { href: '/dashboard/home', label: 'الرئيسية' },
  { href: '/dashboard/expenses', label: 'المصروفات' },
  { href: '/dashboard/custodies', label: 'العهد' },
  { href: '/dashboard/customers', label: 'العملاء', roles: ['sales_rep', 'owner', 'admin', 'manager', 'accountant'] },
  { href: '/dashboard/users', label: 'المستخدمون', roles: ['owner', 'admin', 'manager'] },
  { href: '/dashboard/notifications', label: 'الإشعارات', roles: ['owner', 'admin', 'manager', 'accountant', 'finance_manager'] },
  { href: '/dashboard/policies', label: 'السياسات', roles: ['owner', 'admin', 'manager', 'accountant', 'finance_manager'] },
  { href: '/dashboard/settings', label: 'الإعدادات', roles: ['owner', 'admin'] },
  { href: '/dashboard/advanced', label: 'لوحة التحكم المتقدمة', roles: ['owner', 'admin', 'manager', 'accountant', 'finance_manager'] },
];

export default function DashboardAllSectionsPage() {
  const supabase = createClient();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .single();

      if (roleRow?.role) {
        setRole(roleRow.role as UserRole);
      }

      setLoading(false);
    };

    load();
  }, [supabase]);

  const visibleLinks = useMemo(() => {
    return sectionLinks.filter((item) => {
      if (!item.roles) return true;
      if (!role) return false;
      return item.roles.includes(role);
    });
  }, [role]);

  if (loading) {
    return <div className="min-h-screen p-6 flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">كل الأقسام</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleLinks.map((link) => (
            <Link key={link.href} href={link.href} className="btn btn-secondary w-full py-4 text-base">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
