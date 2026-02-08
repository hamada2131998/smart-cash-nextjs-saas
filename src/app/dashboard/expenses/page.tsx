'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Download, Eye, FileText, Plus, Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format-utils';
import { ExpenseStatus } from '@/types/database.types';

type ExpenseRow = {
  id: string;
  amount: number;
  status: ExpenseStatus;
  category_id: string;
  created_at: string;
  description: string;
  category?: { name?: string } | null;
  created_by_profile?: { full_name?: string } | null;
  approvals?: Array<{ id: string }>;
};

type CategoryRow = { id: string; name: string };

const PAGE_SIZE = 10;

export default function ExpensesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ExpenseStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: categoriesData } = await supabase
        .from('expense_categories')
        .select('id,name')
        .eq('is_active', true)
        .order('name');

      setCategories((categoriesData ?? []) as CategoryRow[]);

      const { data: expensesData } = await supabase
        .from('expenses')
        .select(
          'id,amount,status,category_id,created_at,description,category:expense_categories(name),created_by_profile:profiles!expenses_created_by_fkey(full_name),approvals(id)'
        )
        .order('created_at', { ascending: false });

      const rows = (expensesData ?? []) as unknown as ExpenseRow[];
      setExpenses(rows);

      const total = rows.reduce((sum, row) => sum + (row.amount || 0), 0);
      const pending = rows
        .filter((row) => row.status === 'submitted')
        .reduce((sum, row) => sum + (row.amount || 0), 0);
      const approved = rows
        .filter((row) => row.status === 'approved')
        .reduce((sum, row) => sum + (row.amount || 0), 0);
      const rejected = rows
        .filter((row) => row.status === 'rejected')
        .reduce((sum, row) => sum + (row.amount || 0), 0);

      setStats({ total, pending, approved, rejected });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        expense.description?.toLowerCase().includes(search) ||
        expense.created_by_profile?.full_name?.toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || expense.category_id === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [expenses, searchTerm, statusFilter, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const exportCsv = () => {
    const headers = ['id', 'description', 'amount', 'status', 'category', 'created_at'];
    const lines = filteredExpenses.map((row) => [
      row.id,
      (row.description ?? '').replace(/,/g, ' '),
      String(row.amount ?? 0),
      row.status,
      (row.category?.name ?? '').replace(/,/g, ' '),
      row.created_at,
    ]);
    const csv = [headers.join(','), ...lines.map((line) => line.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `expenses-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: ExpenseStatus) => {
    const style: Record<ExpenseStatus, string> = {
      draft: 'badge-gray',
      submitted: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger',
    };

    const label: Record<ExpenseStatus, string> = {
      draft: 'مسودة',
      submitted: 'بانتظار الموافقة',
      approved: 'معتمد',
      rejected: 'مرفوض',
    };

    return <span className={`badge ${style[status]}`}>{label[status]}</span>;
  };

  const handleApprove = async (expenseId: string) => {
    const approval = expenses.find((expense) => expense.id === expenseId)?.approvals?.[0];
    if (!approval) return;

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.rpc('decide_approval', {
      p_approval_id: approval.id,
      p_action: 'approved',
      p_comment: '',
      p_actor_id: userData.user?.id,
    });

    if (error) {
      alert(`فشل الاعتماد: ${error.message}`);
      return;
    }

    await loadData();
  };

  const handleReject = async (expenseId: string) => {
    const comment = prompt('الرجاء إدخال سبب الرفض:');
    if (!comment) return;

    const approval = expenses.find((expense) => expense.id === expenseId)?.approvals?.[0];
    if (!approval) return;

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.rpc('decide_approval', {
      p_approval_id: approval.id,
      p_action: 'rejected',
      p_comment: comment,
      p_actor_id: userData.user?.id,
    });

    if (error) {
      alert(`فشل الرفض: ${error.message}`);
      return;
    }

    await loadData();
  };

  if (loading) return <div className="p-6">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المصروفات</h1>
          <p className="text-gray-500 mt-1">عرض وإدارة جميع المصروفات والموافقات</p>
        </div>
        <Link href="/dashboard/expenses/new" className="btn btn-primary">
          <Plus className="w-5 h-5" />
          إضافة مصروف
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total)}</div>
          <div className="text-sm text-gray-500 mt-1">إجمالي المصروفات</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-warning-600">{formatCurrency(stats.pending)}</div>
          <div className="text-sm text-gray-500 mt-1">قيد الموافقة</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-success-600">{formatCurrency(stats.approved)}</div>
          <div className="text-sm text-gray-500 mt-1">تم الاعتماد</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-danger-600">{formatCurrency(stats.rejected)}</div>
          <div className="text-sm text-gray-500 mt-1">تم الرفض</div>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالوصف أو اسم الموظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pr-10"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-full lg:w-auto"
          >
            <option value="all">جميع التصنيفات</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ExpenseStatus)}
            className="input w-full lg:w-auto"
          >
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="submitted">بانتظار الموافقة</option>
            <option value="approved">معتمد</option>
            <option value="rejected">مرفوض</option>
          </select>

          <button type="button" onClick={exportCsv} className="btn btn-secondary">
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {filteredExpenses.length} نتيجة - الصفحة {currentPage} من {pageCount}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>الوصف</th>
                <th>التصنيف</th>
                <th>الموظف</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pageItems.map((expense) => (
                <tr key={expense.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{expense.description}</span>
                    </div>
                  </td>
                  <td className="text-gray-600">{expense.category?.name ?? '-'}</td>
                  <td className="text-gray-600">{expense.created_by_profile?.full_name ?? '-'}</td>
                  <td className="font-medium">{formatCurrency(expense.amount)}</td>
                  <td>{getStatusBadge(expense.status)}</td>
                  <td className="text-gray-500">{formatDate(expense.created_at)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/expenses/${expense.id}`)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {expense.status === 'submitted' && expense.approvals?.length ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(expense.id)}
                            className="p-2 text-success-600 hover:bg-success-50 rounded-lg transition-colors"
                            title="اعتماد"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(expense.id)}
                            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                            title="رفض"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pageItems.length === 0 && (
          <div className="p-8 text-center text-gray-500">لا توجد نتائج مطابقة للبحث</div>
        )}

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage <= 1}
            className="btn btn-secondary disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-sm text-gray-500">
            {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            disabled={currentPage >= pageCount}
            className="btn btn-secondary disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  );
}
