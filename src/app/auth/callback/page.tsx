import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function AuthCallback() {
  const supabase = await createClient();

  const { error } = await supabase.auth.getSession();

  if (error) {
    redirect('/auth/login?error=email_confirmation_failed');
  }

  redirect('/dashboard');
}
