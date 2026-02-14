import { createClient } from '@/lib/supabase-server';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  let role: string | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;

    if (data?.company_id) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', data.company_id)
        .single();

      role = roleData?.role ?? null;
    }
  }

  const isEmployeeLite = role === 'employee' || role === 'sales_rep';

  if (isEmployeeLite) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const getTitle = (pathname: string): string => {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/dashboard/expenses': 'إدارة المصروفات',
      '/dashboard/custodies': 'إدارة العهد',
      '/dashboard/policies': 'السياسات',
      '/dashboard/users': 'المستخدمون',
        '/dashboard/settings': 'الإعدادات',
        '/dashboard/employee': 'لوحة الموظف',
      };
    return titles[pathname] || 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={profile ? {
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        avatar_url: profile.avatar_url,
      } : undefined} />
      
      <div className="lg:mr-64">
        <DashboardHeader title={getTitle('/dashboard')} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
