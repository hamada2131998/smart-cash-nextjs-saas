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
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        if (result.error === 'Already invited/exists') {
          toast(result.error, { icon: 'ℹ️' });
        } else {
          toast.error(result.error || 'فشل إرسال الدعوة');
        }
        return;
      }

      toast.success('تم إرسال الدعوة بنجاح');
      setEmail('');
      setRole('employee');
    } catch {
      toast.error('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
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

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'جاري الإرسال...' : 'إرسال الدعوة'}
        </button>
      </form>
    </div>
  );
}
