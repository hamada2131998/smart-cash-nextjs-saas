'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { DollarSign, FileText, Clock, TrendingUp, TrendingDown, Users, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format-utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalCustodyBalance: 0,
    activeCustodies: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0,
    totalExpensesThisMonth: 0,
    expensesChange: 0,
  });

  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [topCustodies, setTopCustodies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profile?.company_id) {
          const { data: roleRow } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('company_id', profile.company_id)
            .single();

          if (roleRow?.role === 'employee' || roleRow?.role === 'sales_rep') {
            router.replace('/dashboard/employee');
            return;
          }
        }
      }

      // Load expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          *,
          category:expense_categories(name),
          created_by_profile:profiles!expenses_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (expenses) {
        setRecentExpenses(expenses);

        // Calculate expense stats
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const thisMonthExpenses = expenses.filter(e => new Date(e.created_at) >= thisMonth);
        const lastMonthExpenses = expenses.filter(e => {
          const date = new Date(e.created_at);
          return date >= lastMonth && date < thisMonth;
        });

        const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const changePercent = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

        const pendingTotal = expenses.filter(e => e.status === 'submitted').reduce((sum, e) => sum + (e.amount || 0), 0);
        const approvedTotal = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);
        const rejectedTotal = expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + (e.amount || 0), 0);

        setStats(prev => ({
          ...prev,
          totalExpensesThisMonth: thisMonthTotal,
          expensesChange: changePercent,
          pendingExpenses: pendingTotal,
          approvedExpenses: approvedTotal,
          rejectedExpenses: rejectedTotal,
        }));
      }

      // Load custodies
      const { data: custodies } = await supabase
        .from('custodies')
        .select(`
          *,
          profiles(
            full_name
          )
        `)
        .eq('status', 'active')
        .order('current_balance', { ascending: false })
        .limit(10);

      if (custodies) {
        const totalBalance = custodies.reduce((sum, c) => sum + (c.current_balance || 0), 0);
        const topCustodiesWithUtil = custodies.map(c => ({
          ...c,
          utilization: c.initial_amount > 0 ? ((c.initial_amount - c.current_balance) / c.initial_amount) * 100 : 0,
        }));

        setStats(prev => ({
          ...prev,
          totalCustodyBalance: totalBalance,
          activeCustodies: custodies.length,
        }));

        setTopCustodies(topCustodiesWithUtil.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'badge-warning',
      submitted: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger',
      draft: 'badge-gray',
    };
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      submitted: 'بانتظار الموافقة',
      approved: 'مقبول',
      rejected: 'مرفوض',
      draft: 'مسودة',
    };
    return <span className={`badge ${styles[status]}`}>{labels[status]}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-primary-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
            {stats.expensesChange !== 0 && (
              <span className={`text-sm font-medium ${
                stats.expensesChange > 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {stats.expensesChange > 0 ? <TrendingUp className="w-4 h-4 inline ml-1" /> : <TrendingDown className="w-4 h-4 inline ml-1" />}
                {Math.abs(stats.expensesChange).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-4">
            <div className="stat-value">{formatCurrency(stats.totalCustodyBalance)}</div>
            <div className="stat-label">إجمالي العهد النشط</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-warning-50 rounded-lg">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.pendingExpenses)}</div>
              <div className="stat-label">المصروفات المعلقة</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.approvedExpenses)}</div>
              <div className="stat-label">المصروفات المعتمدة</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-danger-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-danger-600" />
            </div>
            <div>
              <div className="stat-value">{formatCurrency(stats.rejectedExpenses)}</div>
              <div className="stat-label">المصروفات المرفوضة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Expenses */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">أحدث المصروفات</h2>
            <Link href="/dashboard/expenses" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              عرض الكل
            </Link>
          </div>
          <div className="card-body p-0">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>الوصف</th>
                    <th>المبلغ</th>
                    <th>الحالة</th>
                    <th>المقدم</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>
                        <div>
                          <div className="font-medium text-gray-900">{expense.description}</div>
                          <div className="text-sm text-gray-500">{expense.category?.name}</div>
                        </div>
                      </td>
                      <td className="font-medium">{formatCurrency(expense.amount)}</td>
                      <td>{getStatusBadge(expense.status)}</td>
                      <td className="text-gray-600">{expense.created_by_profile?.full_name}</td>
                      <td className="text-gray-500">{formatDate(expense.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {recentExpenses.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                لا توجد مصروفات بعد
              </div>
            )}
          </div>
        </div>

        {/* Top Custodies */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">أعلى العهد استخداماً</h2>
            <Link href="/dashboard/custodies" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              عرض الكل
            </Link>
          </div>
          <div className="card-body space-y-4">
            {topCustodies.map((custody) => (
              <div key={custody.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium">
                        {custody.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('') || '??'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{custody.profiles?.full_name}</div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(custody.current_balance)} / {formatCurrency(custody.initial_amount)}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    custody.utilization > 80 ? 'text-danger-600' : custody.utilization > 60 ? 'text-warning-600' : 'text-success-600'
                  }`}>
                    {Math.round(custody.utilization)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      custody.utilization > 80 ? 'bg-danger-500' : custody.utilization > 60 ? 'bg-warning-500' : 'bg-success-500'
                    }`}
                    style={{ width: `${100 - custody.utilization}%` }}
                  />
                </div>
              </div>
            ))}

            {topCustodies.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                لا توجد عهد بعد
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">إجراءات سريعة</h2>
        </div>
        <div className="card-body">
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/expenses/new" className="btn btn-primary">
              <FileText className="w-5 h-5" />
              إضافة مصروف جديد
            </Link>
            <Link href="/dashboard/custodies/new" className="btn btn-secondary">
              <DollarSign className="w-5 h-5" />
              إنشاء عهد جديدة
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
