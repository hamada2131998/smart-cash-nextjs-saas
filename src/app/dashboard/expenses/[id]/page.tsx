'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDateTime } from '@/lib/format-utils';

type ExpenseDetails = {
  id: string;
  description: string;
  amount: number;
  status: string;
  currency: string;
  attachment_url: string | null;
  created_at: string;
  notes: string | null;
  category?: { name?: string } | null;
  approvals?: Array<{ status: string; comment: string | null; decided_at: string | null }>;
};

export default function ExpenseDetailsPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<ExpenseDetails | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      if (!params?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('expenses')
        .select('id,description,amount,status,currency,attachment_url,created_at,notes,category:expense_categories(name),approvals(status,comment,decided_at)')
        .eq('id', params.id)
        .single();
      setExpense((data ?? null) as ExpenseDetails | null);
      setLoading(false);
    };
    load();
  }, [params?.id, supabase]);

  if (loading) return <div className="p-6">جاري التحميل...</div>;
  if (!expense) return <div className="p-6">المصروف غير موجود</div>;

  const latestApproval = expense.approvals?.[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">تفاصيل المصروف</h1>
        <Link href="/dashboard/expenses" className="btn btn-secondary">العودة</Link>
      </div>

      <div className="card p-6 space-y-4">
        <div><span className="text-gray-500">الوصف:</span> <span className="font-medium">{expense.description}</span></div>
        <div><span className="text-gray-500">المبلغ:</span> <span className="font-medium">{formatCurrency(expense.amount, expense.currency)}</span></div>
        <div><span className="text-gray-500">الحالة:</span> <span className="font-medium">{expense.status}</span></div>
        <div><span className="text-gray-500">التصنيف:</span> <span className="font-medium">{expense.category?.name ?? '-'}</span></div>
        <div><span className="text-gray-500">تاريخ الإنشاء:</span> <span className="font-medium">{formatDateTime(expense.created_at)}</span></div>
        <div><span className="text-gray-500">ملاحظات:</span> <span className="font-medium">{expense.notes ?? '-'}</span></div>

        <div className="border-t pt-4">
          <h2 className="font-semibold text-gray-900 mb-2">حالة الموافقة</h2>
          {latestApproval ? (
            <div className="space-y-2 text-sm">
              <div>الحالة: {latestApproval.status}</div>
              <div>التعليق: {latestApproval.comment ?? '-'}</div>
              <div>الوقت: {latestApproval.decided_at ? formatDateTime(latestApproval.decided_at) : '-'}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">لا يوجد سجل موافقة بعد</div>
          )}
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold text-gray-900 mb-2">المرفق</h2>
          {expense.attachment_url ? (
            <div className="text-sm break-all">{expense.attachment_url}</div>
          ) : (
            <div className="text-sm text-gray-500">لا يوجد مرفق</div>
          )}
        </div>
      </div>
    </div>
  );
}
