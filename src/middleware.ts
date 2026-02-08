import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options as never);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
  const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard');

  if (isDashboardPage && !session) {
    const url = new URL('/auth/login', req.url);
    url.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', session.user.id)
      .single();

    if (!profile || !profile.company_id) {
      const url = new URL('/auth/login', req.url);
      url.searchParams.set('error', 'onboarding_pending');
      return NextResponse.redirect(url);
    }

    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
