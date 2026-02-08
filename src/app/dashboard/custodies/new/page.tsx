'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format-utils';
import { createClient } from '@/lib/supabase';

export default function NewCustodyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    user_id: '',
    initial_amount: '',
    currency: 'SAR',
    notes: '',
  });

  const supabase = createClient();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const { data: employeesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (employeesData) {
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Check if user already has custody
      const { data: existingCustody } = await supabase
        .from('custodies')
        .select('id')
        .eq('user_id', formData.user_id)
        .eq('status', 'active')
        .single();

      if (existingCustody) {
        toast.error('المستخدم لديه عهدة نشطة بالفعل');
        setLoading(false);
        return;
      }

      // Create custody
      const { data: createdCustody, error } = await supabase
        .from('custodies')
        .insert({
          company_id: profile.company_id,
          user_id: formData.user_id,
          initial_amount: parseFloat(formData.initial_amount) || 0,
          current_balance: 0,
          currency: formData.currency,
          notes: formData.notes,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      if (!createdCustody?.id) {
        throw new Error('Failed to create custody record');
      }

      const amount = parseFloat(formData.initial_amount) || 0;
      if (amount > 0) {
        const { error: txError } = await supabase.from('custody_transactions').insert({
          company_id: profile.company_id,
          custody_id: createdCustody.id,
          tx_type: 'topup',
          source: 'manual_admin',
          status: 'approved',
          amount,
          from_user_id: user.id,
          to_user_id: formData.user_id,
          notes: 'Initial custody funding',
          created_by: user.id,
          decided_by: user.id,
          decided_at: new Date().toISOString(),
        });

        if (txError) {
          throw txError;
        }
      }

      toast.success('تم إنشاء العهد بنجاح!');
      router.push('/dashboard/custodies');
    } catch (error) {
      console.error('Error creating custody:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء العهد');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === formData.user_id);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/custodies" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-4">
          <ArrowRight className="w-4 h-4" />
          العودة إلى العهد
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">إنشاء عهد جديدة</h1>
        <p className="text-gray-500 mt-1">إضافة عهد نقدية لموظف جديد</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="label">الموظف *</label>
          <select
            name="user_id"
            value={formData.user_id}
            onChange={handleInputChange}
            className="input"
            required
          >
            <option value="">اختر الموظف</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name} ({emp.email})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">مبلغ العهد (ر.س) *</label>
            <input
              type="number"
              name="initial_amount"
              value={formData.initial_amount}
              onChange={handleInputChange}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="label">العملة</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="input"
            >
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="AED">درهم إماراتي (AED)</option>
            </select>
          </div>
        </div>

        {selectedEmployee && parseFloat(formData.initial_amount) > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h4 className="font-medium text-primary-900 mb-2">ملخص العملية</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-700">الموظف</span>
                <span className="font-medium">{selectedEmployee.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-700">مبلغ العهد</span>
                <span className="font-medium">{formatCurrency(parseFloat(formData.initial_amount))}</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="label">ملاحظات</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="input"
            rows={3}
            placeholder="أي ملاحظات إضافية..."
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Link href="/dashboard/custodies" className="btn btn-secondary flex-1">
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء العهد'}
          </button>
        </div>
      </form>
    </div>
  );
}
