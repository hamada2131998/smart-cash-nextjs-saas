'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format-utils';
import { createClient } from '@/lib/supabase';

export default function NewExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [amount, setAmount] = useState('');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [custodies, setCustodies] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [companyActivityType, setCompanyActivityType] = useState('');
  const [currentRole, setCurrentRole] = useState<string>('');
  const [myCustodyBalance, setMyCustodyBalance] = useState(0);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    custody_id: '',
    project_id: '',
    cost_center_id: '',
    expenseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const supabase = createClient();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Get user's company and activity type
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .single();

      if (roleRow?.role) {
        setCurrentRole(roleRow.role);
      }

      const { data: myCustody } = await supabase
        .from('custodies')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (myCustody?.id) {
        const { data: balanceData } = await supabase.rpc('custody_current_balance', {
          p_custody_id: myCustody.id,
        });
        setMyCustodyBalance(Number(balanceData ?? 0));
      }

      const { data: company } = await supabase
        .from('companies')
        .select('activity_type_id')
        .eq('id', profile.company_id)
        .single();

      let activityCode = '';
      if (company) {
        const { data: activityType } = await supabase
          .from('activity_types')
          .select('code')
          .eq('id', company.activity_type_id)
          .single();

        if (activityType) {
          activityCode = activityType.code;
          setCompanyActivityType(activityType.code);
        }
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (categoriesData && categoriesData.length > 0) {
        const preferredCategory = categoriesData.find((category) => category.name === 'مصروفات عامة');
        setDefaultCategoryId(preferredCategory?.id ?? categoriesData[0].id);
      } else {
        setDefaultCategoryId('');
      }

      // Load custodies
      const { data: custodiesData } = await supabase
        .from('custodies')
        .select('*, profiles(full_name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (custodiesData) setCustodies(custodiesData);

      // Load projects if contracting
      if (activityCode === 'contracting') {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('status', 'active')
          .order('name');

        if (projectsData) setProjects(projectsData);

        const { data: costCentersData } = await supabase
          .from('cost_centers')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (costCentersData) setCostCenters(costCentersData);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachment = async (file: File, expenseId: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${profile.company_id}/${expenseId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('expense_attachments')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      return data.path;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      return null;
    }
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

      if (myCustodyBalance <= 0) {
        toast.error('Insufficient balance');
        setLoading(false);
        return;
      }

      if (!defaultCategoryId) {
        toast.error('لا توجد فئات مصروفات — راجع إعدادات الشركة');
        setLoading(false);
        return;
      }

      // Validate
      if (companyActivityType === 'contracting') {
        if (!formData.project_id || !formData.cost_center_id) {
          toast.error('المشاريع ومراكز التكلفة مطلوبة لأنواع نشاط المقاولات');
          setLoading(false);
          return;
        }
      }

      // Create expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          company_id: profile.company_id,
          created_by: user.id,
          category_id: defaultCategoryId,
          custody_id: formData.custody_id || null,
          project_id: formData.project_id || null,
          cost_center_id: formData.cost_center_id || null,
          amount: parseFloat(formData.amount),
          currency: 'SAR',
          expense_date: formData.expenseDate,
          description: formData.description,
          notes: formData.notes,
          status: 'draft',
        })
        .select()
        .single();

      if (expenseError || !expense) {
        throw new Error(expenseError?.message || 'Failed to create expense');
      }

      // Upload attachments
      if (attachments.length > 0) {
        setUploading(true);
        const uploadPromises = attachments.map(file => uploadAttachment(file, expense.id));
        const paths = await Promise.all(uploadPromises);
        const validPaths = paths.filter(Boolean) as string[];

        if (validPaths.length > 0) {
          const { error: updateError } = await supabase
            .from('expenses')
            .update({ attachment_url: validPaths[0] })
            .eq('id', expense.id);

          if (updateError) {
            console.error('Error updating expense with attachment:', updateError);
          }
        }
        setUploading(false);
      }

      // Submit for approval
      const { error: submitError } = await supabase.rpc('submit_expense', {
        p_expense_id: expense.id,
      });

      if (submitError) {
        console.error('Error submitting expense:', submitError);
        toast.error('تم إنشاء المصروف ولكن فشل إرساله للموافقة');
      } else {
        toast.success('تم إضافة المصروف بنجاح!');
      }

      router.push('/dashboard/expenses');
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ المصروف');
    } finally {
      setLoading(false);
    }
  };

  const selectedCustody = custodies.find(c => c.id === formData.custody_id);
  const remainingBalance = selectedCustody ? selectedCustody.current_balance - (parseFloat(formData.amount) || 0) : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/expenses" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-4">
          <ArrowRight className="w-4 h-4" />
          العودة إلى المصروفات
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">إضافة مصروف جديد</h1>
        <p className="text-gray-500 mt-1">أدخل تفاصيل المصروف الجديد</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {myCustodyBalance <= 0 && (
          <div className="mx-6 mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <div className="font-medium">رصيد العهدة الحالي صفر</div>
            <div className="text-sm mt-1">لا يمكن إضافة مصروف قبل تغذية العهدة.</div>
            <div className="flex gap-2 mt-3">
              <Link href="/dashboard/custodies" className="btn btn-secondary">طلب تغذية عهدة</Link>
              {currentRole === 'sales_rep' && (
                <Link href="/dashboard/customers" className="btn btn-primary">تحصيل من عميل</Link>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="label">وصف المصروف *</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input"
              placeholder="أدخل وصفاً واضحاً للمصروف"
              required
            />
          </div>

          <div>
            <label className="label">المبلغ (ر.س) *</label>
            <input
              type="number"
              name="amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFormData({ ...formData, amount: e.target.value });
              }}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="label">تاريخ المصروف *</label>
            <input
              type="date"
              name="expenseDate"
              value={formData.expenseDate}
              onChange={handleInputChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">صاحب العهد</label>
            <select
              name="custody_id"
              value={formData.custody_id}
              onChange={handleInputChange}
              className="input"
            >
              <option value="">اختر العهد (اختياري)</option>
              {custodies.map(custody => (
                <option key={custody.id} value={custody.id}>
                  {custody.profiles?.full_name} - رصيد: {formatCurrency(custody.current_balance)}
                </option>
              ))}
            </select>
          </div>

          {companyActivityType === 'contracting' && (
            <>
              <div>
                <label className="label">المشروع *</label>
                <select
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="">اختر المشروع</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">مركز التكلفة *</label>
                <select
                  name="cost_center_id"
                  value={formData.cost_center_id}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="">اختر مركز التكلفة</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {selectedCustody && formData.amount && (
            <div className="md:col-span-2">
              <div className={`p-4 rounded-lg ${remainingBalance < 0 ? 'bg-danger-50 border border-danger-200' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">الرصيد المتبقي بعد الصرف</div>
                    <div className={`text-xl font-bold ${remainingBalance < 0 ? 'text-danger-600' : 'text-gray-900'}`}>
                      {formatCurrency(Math.max(0, remainingBalance))}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-gray-500">من رصيد {formatCurrency(selectedCustody.current_balance)}</div>
                    {remainingBalance < 0 && (
                      <div className="text-danger-600 text-sm font-medium">⚠️ رصيد غير كافٍ</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="label">ملاحظات إضافية</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="input"
              rows={3}
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">المرفقات</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="attachments"
              />
              <label htmlFor="attachments" className="cursor-pointer">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">اضغط لرفع الملفات</p>
                <p className="text-sm text-gray-500 mt-1">صور، PDF، أو مستندات (الحد الأقصى 5MB)</p>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded flex items-center justify-center">
                        <span className="text-primary-600 text-sm font-medium">
                          {file.name.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</div>
                        <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="p-1 text-gray-400 hover:text-danger-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Link href="/dashboard/expenses" className="btn btn-secondary flex-1">
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={loading || uploading || myCustodyBalance <= 0}
            className="btn btn-primary flex-1"
          >
            {uploading ? 'جاري رفع الملفات...' : loading ? 'جاري الحفظ...' : 'حفظ المصروف'}
          </button>
        </div>
      </form>
    </div>
  );
}
