'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

type ShellUser = {
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
};

export default function DashboardLayoutShell({
  children,
  user,
  role,
}: {
  children: React.ReactNode;
  user?: ShellUser;
  role?: string | null;
}) {
  const pathname = usePathname();
  const isHome = pathname === '/dashboard/home';
  const isLiteRole = role === 'employee' || role === 'sales_rep';

  const getTitle = (path: string): string => {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/dashboard/home': 'الرئيسية',
      '/dashboard/all': 'كل الأقسام',
      '/dashboard/advanced': 'لوحة التحكم المتقدمة',
      '/dashboard/expenses': 'إدارة المصروفات',
      '/dashboard/custodies': 'إدارة العهد',
      '/dashboard/policies': 'السياسات',
      '/dashboard/users': 'المستخدمون',
      '/dashboard/settings': 'الإعدادات',
      '/dashboard/customers': 'العملاء',
      '/dashboard/notifications': 'الإشعارات',
    };

    return titles[path] || 'Dashboard';
  };

  if (isHome || isLiteRole) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="lg:mr-64">
        <DashboardHeader title={getTitle(pathname)} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
