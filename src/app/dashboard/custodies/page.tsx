'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Plus, Search, Send, Wallet, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/format-utils';
import { CustodyStatus, UserRole } from '@/types/database.types';

type CustodyRow = {
  id: string;
  user_id: string;
  initial_amount: number;
  currency: string;
  status: CustodyStatus;
  created_at: string;
  notes: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

type TxRow = {
  id: string;
  tx_type: 'topup' | 'transfer' | 'expense_deduction';
  source: 'manual_admin' | 'customer_payment' | 'transfer' | 'expense';
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  from_user_id: string | null;
  to_user_id: string | null;
  notes: string | null;
  decision_comment: string | null;
  created_at: string;
};

type ProfileOption = { id: string; full_name: string | null; email: string | null };

const PRIVILEGED_TOPUP: UserRole[] = ['owner', 'admin', 'accountant', 'manager'];

export default function CustodiesPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CustodyStatus>('all');
  const [rows, setRows] = useState<CustodyRow[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [inbox, setInbox] = useState<TxRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupToUserId, setTopupToUserId] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNotes, setTopupNotes] = useState('');
  const [submittingTopup, setSubmittingTopup] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  const profileNameById = useMemo(() => {
    return profiles.reduce<Record<string, string>>((acc, profile) => {
      acc[profile.id] = profile.full_name || profile.email || profile.id;
      return acc;
    }, {});
  }, [profiles]);

  const canRequestTopup = currentRole ? PRIVILEGED_TOPUP.includes(currentRole) : false;
  const isSalesRep = currentRole === 'sales_rep';

  const loadData = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const companyId = profile?.company_id as string | undefined;
    if (!companyId) {
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .single();

    if (roleData?.role) {
      setCurrentRole(roleData.role as UserRole);
    }

    const [{ data: custodiesData }, { data: profilesData }, { data: txData }, { data: inboxData }] =
      await Promise.all([
        supabase
          .from('custodies')
          .select('id,user_id,initial_amount,currency,status,created_at,notes,profiles(full_name,email)')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id,full_name,email')
          .order('full_name'),
        supabase
          .from('custody_transactions')
          .select('id,tx_type,source,status,amount,from_user_id,to_user_id,notes,decision_comment,created_at')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('custody_transactions')
          .select('id,tx_type,source,status,amount,from_user_id,to_user_id,notes,decision_comment,created_at')
          .eq('status', 'pending')
          .eq('to_user_id', user.id)
          .in('tx_type', ['topup', 'transfer'])
          .order('created_at', { ascending: false }),
      ]);

    const custodyRows = (custodiesData ?? []) as unknown as CustodyRow[];
    setRows(custodyRows);
    setProfiles((profilesData ?? []) as ProfileOption[]);
    setTransactions((txData ?? []) as unknown as TxRow[]);
    setInbox((inboxData ?? []) as unknown as TxRow[]);

    const balanceEntries = await Promise.all(
      custodyRows.map(async (row) => {
        const { data } = await supabase.rpc('custody_current_balance', { p_custody_id: row.id });
        return [row.id, Number(data ?? 0)] as const;
      })
    );
    setBalances(Object.fromEntries(balanceEntries));

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = rows.filter((item) => {
    const name = item.profiles?.full_name ?? '';
    const email = item.profiles?.email ?? '';
    const matchText =
      name.toLowerCase().includes(query.toLowerCase()) ||
      email.toLowerCase().includes(query.toLowerCase());
    const matchStatus = status === 'all' || item.status === status;
    return matchText && matchStatus;
  });

  const decideInbox = async (tx: TxRow, approve: boolean) => {
    const comment = approve ? '' : prompt('سبب الرفض') || '';
    if (!approve && !comment.trim()) {
      toast.error('سبب الرفض مطلوب');
      return;
    }

    const rpcName = tx.tx_type === 'transfer' ? 'decide_transfer' : 'decide_manual_topup';
    const { error } = await supabase.rpc(rpcName, {
      p_tx_id: tx.id,
      p_approve: approve,
      p_comment: comment,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(approve ? 'تم القبول' : 'تم الرفض');
    await loadData();
  };

  const submitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupToUserId || Number(topupAmount) <= 0) {
      toast.error('الرجاء إدخال البيانات بشكل صحيح');
      return;
    }

    setSubmittingTopup(true);
    const { error } = await supabase.rpc('request_manual_topup', {
      p_to_user_id: topupToUserId,
      p_amount: Number(topupAmount),
      p_notes: topupNotes,
    });
    setSubmittingTopup(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('تم إرسال طلب تغذية العهدة');
    setShowTopupModal(false);
    setTopupToUserId('');
    setTopupAmount('');
    setTopupNotes('');
    await loadData();
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferToUserId || Number(transferAmount) <= 0) {
      toast.error('الرجاء إدخال البيانات بشكل صحيح');
      return;
    }

    setSubmittingTransfer(true);
    const { error } = await supabase.rpc('request_transfer', {
      p_to_user_id: transferToUserId,
      p_amount: Number(transferAmount),
      p_notes: transferNotes,
    });
    setSubmittingTransfer(false);

    if (error) {
      if (error.message.toLowerCase().includes('insufficient')) {
        toast.error('Insufficient balance');
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success('تم إرسال طلب التحويل');
    setShowTransferModal(false);
    setTransferToUserId('');
    setTransferAmount('');
    setTransferNotes('');
    await loadData();
  };

  if (loading) {
    return <div className="p-6">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة العهد</h1>
          <p className="text-sm text-gray-500">الأرصدة مبنية على الحركات المعتمدة فقط</p>
        </div>
        <div className="flex gap-2">
          {canRequestTopup && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowTopupModal(true)}>
              <Plus className="w-4 h-4" />
              طلب تغذية عهدة
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(true)}>
            <Send className="w-4 h-4" />
            تحويل عهدة
          </button>
          {isSalesRep && (
            <Link href="/dashboard/customers" className="btn btn-primary">
              <Wallet className="w-4 h-4" />
              تحصيل من عميل
            </Link>
          )}
          <Link href="/dashboard/custodies/new" className="btn btn-primary">
            <Plus className="w-4 h-4" />
            عهدة جديدة
          </Link>
        </div>
      </div>

      <div className="card p-4 flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
            <input
              className="input pr-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو البريد"
            />
          </div>
        </div>
        <select
          className="input w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | CustodyStatus)}
        >
          <option value="all">الكل</option>
          <option value="active">نشطة</option>
          <option value="closed">مغلقة</option>
          <option value="frozen">مجمّدة</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الرصيد الحالي</th>
              <th>رصيد تأسيسي</th>
              <th>الحالة</th>
              <th>تاريخ الإنشاء</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="font-medium">{item.profiles?.full_name ?? 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{item.profiles?.email ?? '-'}</div>
                </td>
                <td>{formatCurrency(balances[item.id] ?? 0, item.currency)}</td>
                <td>{formatCurrency(item.initial_amount ?? 0, item.currency)}</td>
                <td>{item.status}</td>
                <td>{new Date(item.created_at).toLocaleDateString('ar-SA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">الطلبات الواردة</h2>
        {inbox.length === 0 ? (
          <div className="text-sm text-gray-500">لا توجد طلبات واردة</div>
        ) : (
          <div className="space-y-2">
            {inbox.map((tx) => (
              <div key={tx.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">
                    {tx.tx_type === 'transfer' ? 'تحويل وارد' : 'تغذية عهدة واردة'} - {formatCurrency(tx.amount)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    من: {tx.from_user_id ? profileNameById[tx.from_user_id] ?? tx.from_user_id : '-'}
                  </div>
                  <div className="text-xs text-gray-500">{formatDateTime(tx.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => decideInbox(tx, false)}
                  >
                    <X className="w-4 h-4" />
                    رفض
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => decideInbox(tx, true)}
                  >
                    <Check className="w-4 h-4" />
                    قبول
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">حركات العهدة</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>النوع</th>
                <th>المصدر</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>من</th>
                <th>إلى</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.tx_type}</td>
                  <td>{tx.source}</td>
                  <td>{formatCurrency(tx.amount)}</td>
                  <td>{tx.status}</td>
                  <td>{tx.from_user_id ? profileNameById[tx.from_user_id] ?? tx.from_user_id : '-'}</td>
                  <td>{tx.to_user_id ? profileNameById[tx.to_user_id] ?? tx.to_user_id : '-'}</td>
                  <td>{new Date(tx.created_at).toLocaleString('ar-SA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showTopupModal && (
        <div className="modal-overlay" onClick={() => setShowTopupModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">طلب تغذية عهدة</h2>
            <form className="space-y-3" onSubmit={submitTopup}>
              <div>
                <label className="label">الموظف المستلم</label>
                <select className="input" value={topupToUserId} onChange={(e) => setTopupToUserId(e.target.value)} required>
                  <option value="">اختر الموظف</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">المبلغ</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">ملاحظة</label>
                <textarea className="input" rows={3} value={topupNotes} onChange={(e) => setTopupNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTopupModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingTopup}>
                  {submittingTopup ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">طلب تحويل عهدة</h2>
            <form className="space-y-3" onSubmit={submitTransfer}>
              <div>
                <label className="label">المستلم</label>
                <select
                  className="input"
                  value={transferToUserId}
                  onChange={(e) => setTransferToUserId(e.target.value)}
                  required
                >
                  <option value="">اختر المستلم</option>
                  {profiles
                    .filter((profile) => profile.id !== currentUserId)
                    .map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label">المبلغ</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">ملاحظة</label>
                <textarea
                  className="input"
                  rows={3}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingTransfer}>
                  {submittingTransfer ? 'جاري الإرسال...' : 'إرسال التحويل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
