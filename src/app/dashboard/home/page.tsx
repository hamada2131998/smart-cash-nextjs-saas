'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Menu, PlusCircle, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/format-utils';
import { UserRole } from '@/types/database.types';

type TxRow = {
  id: string;
  tx_type: 'topup' | 'transfer' | 'expense_deduction';
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  created_at: string;
};

const PRIVILEGED_ROLES: UserRole[] = ['owner', 'admin', 'manager', 'accountant'];

export default function LiteHomePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('SAR');
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);

  const [showWelcome, setShowWelcome] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showLiteMenu, setShowLiteMenu] = useState(false);

  const isPrivileged = role ? PRIVILEGED_ROLES.includes(role) : false;
  const isLiteRole = role === 'employee' || role === 'sales_rep';

  const welcomeKey = useMemo(() => {
    if (!userId || !companyId) return null;
    return `smartcash_welcome_dismissed_${userId}_${companyId}`;
  }, [userId, companyId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      setCompanyId(profile.company_id as string);

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .single();

      if (roleRow?.role) {
        setRole(roleRow.role as UserRole);
      }

      const { count } = await supabase
        .from('custody_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .in('tx_type', ['topup', 'transfer']);

      setPendingCount(count ?? 0);

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
          .select('id,tx_type,status,amount,created_at')
          .eq('custody_id', custody.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setTransactions((txData ?? []) as unknown as TxRow[]);
      }

      setLoading(false);
    };

    load();
  }, [supabase]);

  useEffect(() => {
    if (!welcomeKey || !role) return;
    if (role !== 'owner' && role !== 'admin') return;

    const dismissed = localStorage.getItem(welcomeKey);
    setShowWelcome(!dismissed);
  }, [welcomeKey, role]);

  const dismissWelcome = () => {
    if (welcomeKey) {
      localStorage.setItem(welcomeKey, '1');
    }
    setShowWelcome(false);
  };

  if (loading) {
    return <div className="min-h-screen p-6 flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {isLiteRole && (
          <div className="flex justify-end">
            <button type="button" className="btn btn-secondary" onClick={() => setShowLiteMenu(true)}>
              <Menu className="w-4 h-4" />
              القائمة
            </button>
          </div>
        )}

        {pendingCount !== null && pendingCount > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-center justify-between gap-3">
            <div>🔴 لديك {pendingCount} طلب ينتظر الموافقة</div>
            <Link href="/dashboard/custodies" className="btn btn-secondary">
              مراجعة
            </Link>
          </div>
        )}

        {showWelcome && (
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 sm:p-6 space-y-4">
            <div className="text-xl font-bold text-gray-900">مرحبًا بك 👋</div>
            <div className="text-gray-700 leading-7">
              لنبدأ بثلاث خطوات بسيطة:
              <br />1) دعوة موظف جديد
              <br />2) إضافة عهدة أولى
              <br />3) جرّب إضافة مصروف
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link href="/dashboard/users" className="btn btn-secondary w-full" onClick={dismissWelcome}>
                دعوة موظف جديد
              </Link>
              <Link href="/dashboard/custodies?mode=request" className="btn btn-secondary w-full" onClick={dismissWelcome}>
                إضافة عهدة أولى
              </Link>
              <Link href="/dashboard/expenses/new" className="btn btn-secondary w-full" onClick={dismissWelcome}>
                جرّب إضافة مصروف
              </Link>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-secondary" onClick={dismissWelcome}>
                تخطي
              </button>
              <button type="button" className="btn btn-primary" onClick={dismissWelcome}>
                ابدأ
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="text-sm text-gray-500 mb-2">🔵 رصيد العهدة المتاح للصرف</div>
          <div className="text-3xl sm:text-4xl font-bold text-gray-900">{formatCurrency(balance, currency)}</div>
          {isPrivileged ? (
            <div className="text-sm text-gray-600 mt-3">طلبات معلّقة: {pendingCount ?? '—'}</div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Link href="/dashboard/expenses/new" className="btn btn-primary w-full py-4 text-base">
            <PlusCircle className="w-5 h-5" />
            إضافة مصروف
          </Link>

          <Link href="/dashboard/custodies?mode=request" className="btn btn-secondary w-full py-4 text-base">
            <Wallet className="w-5 h-5" />
            طلب تغذية رصيد
          </Link>

          <Link href="/dashboard/all" className="btn btn-secondary w-full py-4 text-base">
            عرض كل الأقسام
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/why" className="text-sm text-primary-600 hover:text-primary-700">
            لماذا هذا النظام؟
          </Link>
          {isPrivileged && (role === 'owner' || role === 'admin') && (
            <button type="button" className="text-sm text-primary-600 hover:text-primary-700" onClick={() => setShowDemoModal(true)}>
              جرّب النظام في 30 ثانية
            </button>
          )}
        </div>

        {role === 'sales_rep' && (
          <div>
            <Link href="/dashboard/customers" className="btn btn-secondary w-full">
              تحصيل من عميل
            </Link>
          </div>
        )}

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

      {showDemoModal && (
        <div className="modal-overlay" onClick={() => setShowDemoModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-3">جرّب النظام في 30 ثانية</h2>
            <ol className="space-y-2 text-sm text-gray-700 mb-4">
              <li>1) افتح صفحة إضافة مصروف.</li>
              <li>2) املأ نموذجًا تجريبيًا بالمبلغ والوصف.</li>
              <li>3) راقب حالة المصروف وتأثيره على الرصيد بعد الاعتماد.</li>
            </ol>
            <p className="text-xs text-gray-500 mb-4">ملاحظة: هذا الدليل لا ينشئ بيانات تلقائيًا.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDemoModal(false)}>
                إغلاق
              </button>
              <Link href="/dashboard/expenses/new" className="btn btn-primary" onClick={() => setShowDemoModal(false)}>
                ابدأ التجربة
              </Link>
            </div>
          </div>
        </div>
      )}

      {showLiteMenu && (
        <div className="modal-overlay" onClick={() => setShowLiteMenu(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">القائمة</h2>
            <div className="grid gap-2">
              <Link href="/dashboard/home" className="btn btn-secondary" onClick={() => setShowLiteMenu(false)}>
                الرئيسية
              </Link>
              <Link href="/dashboard/expenses" className="btn btn-secondary" onClick={() => setShowLiteMenu(false)}>
                المصروفات
              </Link>
              <Link href="/dashboard/custodies" className="btn btn-secondary" onClick={() => setShowLiteMenu(false)}>
                العهد
              </Link>
              {role === 'sales_rep' && (
                <Link href="/dashboard/customers" className="btn btn-secondary" onClick={() => setShowLiteMenu(false)}>
                  العملاء
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
