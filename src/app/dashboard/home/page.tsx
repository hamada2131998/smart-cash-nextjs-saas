'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/format-utils';
import { UserRole } from '@/types/database.types';

type TxRow = {
  id: string;
  tx_type: 'topup' | 'transfer' | 'expense_deduction';
  source: 'manual_admin' | 'customer_payment' | 'transfer' | 'expense';
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  created_at: string;
};

export default function LiteHomePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('SAR');
  const [role, setRole] = useState<UserRole | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .single();

      if (roleRow?.role) {
        setRole(roleRow.role as UserRole);
      }

      const { data: custody } = await supabase
        .from('custodies')
        .select('id,currency')
        .eq('company_id', profile.company_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (custody?.id) {
        setCurrency(custody.currency ?? 'SAR');

        const { data: balanceData } = await supabase.rpc('custody_current_balance', {
          p_custody_id: custody.id,
        });
        setBalance(Number(balanceData ?? 0));

        const { data: txData } = await supabase
          .from('custody_transactions')
          .select('id,tx_type,source,status,amount,created_at')
          .eq('custody_id', custody.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setTransactions((txData ?? []) as unknown as TxRow[]);
      }

      setLoading(false);
    };

    load();
  }, [supabase]);

  if (loading) {
    return <div className="min-h-screen p-6 flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="text-sm text-gray-500 mb-2">رصيدك الحالي</div>
          <div className="text-3xl sm:text-4xl font-bold text-gray-900">{formatCurrency(balance, currency)}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/dashboard/expenses/new" className="btn btn-primary w-full py-3">
            <PlusCircle className="w-5 h-5" />
            إضافة مصروف
          </Link>

          <Link href="/dashboard/custodies?mode=request" className="btn btn-secondary w-full py-3">
            <Wallet className="w-5 h-5" />
            طلب تغذية رصيد
          </Link>
        </div>

        {role === 'sales_rep' && (
          <div>
            <Link href="/dashboard/customers" className="btn btn-secondary w-full">
              تحصيل من عميل
            </Link>
          </div>
        )}

        <div>
          <Link href="/dashboard/advanced" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700">
            لوحة التحكم المتقدمة
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">آخر 5 حركات</h2>
          {transactions.length === 0 ? (
            <div className="text-sm text-gray-500">لا توجد حركات حتى الآن</div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{tx.tx_type}</div>
                    <div className="text-xs text-gray-500">{formatDateTime(tx.created_at)}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(tx.amount, currency)}</div>
                    <div className="text-xs text-gray-500">{tx.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
