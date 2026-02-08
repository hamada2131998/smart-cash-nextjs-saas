'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRoleLabel } from '@/lib/auth-utils';
import { UserRole } from '@/types/database.types';

const roleOptions: UserRole[] = ['owner', 'admin', 'accountant', 'employee', 'manager', 'finance_manager'];

export default function NewUserInvitePage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('employee');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }

    toast('سيتم تفعيل الدعوات قريبًا', { icon: 'ℹ️' });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/users" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-4">
          <ArrowRight className="w-4 h-4" />
          العودة إلى المستخدمين
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">دعوة مستخدم جديد</h1>
      </div>

      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">البريد الإلكتروني *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="name@company.com"
            required
          />
        </div>

        <div>
          <label className="label">الدور</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input">
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {getRoleLabel(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          سيتم تفعيل الدعوات قريبًا.
        </div>

        <button type="submit" className="btn btn-primary w-full">
          إرسال الدعوة
        </button>
      </form>
    </div>
  );
}
