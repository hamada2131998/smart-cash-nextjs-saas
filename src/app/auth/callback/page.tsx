import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

type CallbackParams = {
  code?: string;
  error?: string;
  error_description?: string;
};

export default async function AuthCallback({
  searchParams,
}: {
  searchParams: Promise<CallbackParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  if (params.error) {
    redirect('/auth/login?error=email_confirmation_failed');
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      redirect('/auth/login?error=email_confirmation_failed');
    }
  }

  const { error } = await supabase.auth.getSession();

  if (error) {
    redirect('/auth/login?error=email_confirmation_failed');
  }

  redirect('/dashboard');
}
