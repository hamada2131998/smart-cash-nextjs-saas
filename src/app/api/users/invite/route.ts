import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { UserRole } from '@/types/database.types';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'accountant', 'employee', 'manager', 'finance_manager']),
});

const ALLOWED_INVITER_ROLES = new Set<UserRole>(['owner', 'admin', 'manager']);

function emailPrefix(email: string) {
  return email.split('@')[0] || 'User';
}

async function ensureMembership(
  invitedUserId: string,
  invitedEmail: string,
  invitedRole: UserRole,
  companyId: string,
  inviterId: string
) {
  const admin = createAdminClient();

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: invitedUserId,
      email: invitedEmail,
      company_id: companyId,
      full_name: emailPrefix(invitedEmail),
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: roleError } = await admin.from('user_roles').upsert(
    {
      user_id: invitedUserId,
      company_id: companyId,
      role: invitedRole,
      assigned_by: inviterId,
    },
    { onConflict: 'user_id,company_id' }
  );

  if (roleError) {
    throw new Error(roleError.message);
  }
}

export async function POST(request: Request) {
  try {
    const payload = inviteSchema.parse(await request.json());
    const email = payload.email.trim().toLowerCase();

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData.user;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 403 });
    }

    const companyId = profile.company_id as string;

    const { data: currentRoleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('company_id', companyId)
      .single();

    if (roleError || !currentRoleRow?.role || !ALLOWED_INVITER_ROLES.has(currentRoleRow.role as UserRole)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: existingByEmail } = await admin
      .from('profiles')
      .select('id,company_id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (existingByEmail?.id) {
      if (existingByEmail.company_id !== companyId) {
        return NextResponse.json(
          { ok: false, error: 'User already belongs to another company' },
          { status: 409 }
        );
      }

      await ensureMembership(existingByEmail.id as string, email, payload.role as UserRole, companyId, currentUser.id);

      return NextResponse.json({ ok: false, error: 'Already invited/exists' }, { status: 409 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${appUrl}/auth/callback`;

    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        company_id: companyId,
        invited_role: payload.role,
      },
      redirectTo,
    });

    let invitedUserId = inviteData.user?.id ?? null;

    if (inviteError && !invitedUserId) {
      const message = inviteError.message.toLowerCase();
      const looksExisting = message.includes('already') || message.includes('registered');

      if (!looksExisting) {
        return NextResponse.json({ ok: false, error: inviteError.message }, { status: 400 });
      }

      const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (usersError) {
        return NextResponse.json({ ok: false, error: usersError.message }, { status: 400 });
      }

      invitedUserId =
        usersData.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;

      if (!invitedUserId) {
        return NextResponse.json({ ok: false, error: 'Failed to resolve invited user' }, { status: 400 });
      }
    }

    if (!invitedUserId) {
      return NextResponse.json({ ok: false, error: 'Invite did not return user id' }, { status: 500 });
    }

    const { data: existingById } = await admin
      .from('profiles')
      .select('company_id')
      .eq('id', invitedUserId)
      .maybeSingle();

    if (existingById?.company_id && existingById.company_id !== companyId) {
      return NextResponse.json(
        { ok: false, error: 'User already belongs to another company' },
        { status: 409 }
      );
    }

    await ensureMembership(invitedUserId, email, payload.role as UserRole, companyId, currentUser.id);

    return NextResponse.json({ ok: true, invited_user_id: invitedUserId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
