import { createClient } from '@/lib/supabase-server';
import DashboardLayoutShell from '@/components/DashboardLayoutShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: {
    full_name: string;
    email: string;
    role?: string;
    avatar_url?: string | null;
    company_id?: string;
  } | null = null;
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

  return (
    <DashboardLayoutShell
      role={role}
      user={
        profile
          ? {
              full_name: profile.full_name,
              email: profile.email,
              role: profile.role || role || 'employee',
              avatar_url: profile.avatar_url || undefined,
            }
          : undefined
      }
    >
      {children}
    </DashboardLayoutShell>
  );
}
