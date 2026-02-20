import { NextResponse } from 'next/server';

export async function GET() {
  const requiredEnv = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);

  return NextResponse.json(
    {
      status: missing.length === 0 ? 'ok' : 'degraded',
      service: 'smart-cash-nextjs-saas',
      timestamp: new Date().toISOString(),
      checks: {
        env: missing.length === 0,
      },
      missing,
    },
    { status: missing.length === 0 ? 200 : 503 }
  );
}
