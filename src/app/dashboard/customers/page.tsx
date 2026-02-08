'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase';
import { UserRole } from '@/types/database.types';

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

export default function CustomersPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectCustomerId, setCollectCustomerId] = useState('');
  const [collectCustomerName, setCollectCustomerName] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectFile, setCollectFile] = useState<File | null>(null);
  const [collecting, setCollecting] = useState(false);

  const loadData = async () => {
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

    if (profile?.company_id) {
      setCompanyId(profile.company_id as string);
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', profile?.company_id)
      .single();

    if (roleData?.role) {
      setRole(roleData.role as UserRole);
    }

    const { data: customersData } = await supabase
      .from('customers')
      .select('id,name,phone,notes,created_at')
      .order('created_at', { ascending: false });

    setCustomers((customersData ?? []) as unknown as CustomerRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(text) ||
        (customer.phone ?? '').toLowerCase().includes(text) ||
        (customer.notes ?? '').toLowerCase().includes(text)
      );
    });
  }, [customers, query]);

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('اسم العميل مطلوب');
      return;
    }

    setSavingCustomer(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user || !companyId) {
      setSavingCustomer(false);
      toast.error('تعذر التحقق من الشركة');
      return;
    }

    const { error } = await supabase.from('customers').insert({
      company_id: companyId,
      name: newName.trim(),
      phone: newPhone.trim() || null,
      notes: newNotes.trim() || null,
      created_by: user.id,
    });

    setSavingCustomer(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('تمت إضافة العميل');
    setShowAddModal(false);
    setNewName('');
    setNewPhone('');
    setNewNotes('');
    await loadData();
  };

  const collectPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collectAmount || Number(collectAmount) <= 0) {
      toast.error('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    if (!collectFile) {
      toast.error('المرفق مطلوب');
      return;
    }

    if (!collectCustomerId && !collectCustomerName.trim()) {
      toast.error('حدد عميلًا أو أدخل اسم عميل');
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user || !companyId) {
      toast.error('تعذر التحقق من المستخدم');
      return;
    }

    setCollecting(true);
    try {
      const fileName = `${Date.now()}_${collectFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${companyId}/customer-payments/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('expense_attachments')
        .upload(filePath, collectFile);

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { error: paymentError } = await supabase.rpc('record_customer_payment', {
        p_amount: Number(collectAmount),
        p_customer_id: collectCustomerId || null,
        p_customer_name: collectCustomerId ? null : collectCustomerName.trim(),
        p_attachment_path: filePath,
        p_notes: collectNotes.trim(),
      });

      if (paymentError) {
        toast.error(paymentError.message);
        return;
      }

      toast.success('تم تسجيل التحصيل بنجاح');
      setShowCollectModal(false);
      setCollectAmount('');
      setCollectCustomerId('');
      setCollectCustomerName('');
      setCollectNotes('');
      setCollectFile(null);
    } finally {
      setCollecting(false);
    }
  };

  if (loading) return <div className="p-6">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">العملاء</h1>
          <p className="text-sm text-gray-500">إدارة العملاء وتحصيل المدفوعات</p>
        </div>
        <div className="flex gap-2">
          {role === 'sales_rep' && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowCollectModal(true)}>
              <Wallet className="w-4 h-4" />
              تحصيل من عميل
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            إضافة عميل
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
          <input
            className="input pr-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث عن عميل"
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>ملاحظات</th>
              <th>تاريخ الإنشاء</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer) => (
              <tr key={customer.id}>
                <td className="font-medium">{customer.name}</td>
                <td>{customer.phone ?? '-'}</td>
                <td>{customer.notes ?? '-'}</td>
                <td>{new Date(customer.created_at).toLocaleDateString('ar-SA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">إضافة عميل</h2>
            <form className="space-y-3" onSubmit={addCustomer}>
              <div>
                <label className="label">الاسم *</label>
                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div>
                <label className="label">الهاتف</label>
                <input className="input" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <textarea className="input" rows={3} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingCustomer}>
                  {savingCustomer ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCollectModal && (
        <div className="modal-overlay" onClick={() => setShowCollectModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">تحصيل من عميل</h2>
            <form className="space-y-3" onSubmit={collectPayment}>
              <div>
                <label className="label">العميل (اختياري إذا أدخلت الاسم)</label>
                <select
                  className="input"
                  value={collectCustomerId}
                  onChange={(e) => setCollectCustomerId(e.target.value)}
                >
                  <option value="">اختر عميلًا</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {!collectCustomerId && (
                <div>
                  <label className="label">اسم عميل بديل</label>
                  <input
                    className="input"
                    value={collectCustomerName}
                    onChange={(e) => setCollectCustomerName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="label">المبلغ *</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.01"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">المرفق *</label>
                <input
                  type="file"
                  className="input"
                  onChange={(e) => setCollectFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>

              <div>
                <label className="label">ملاحظات</label>
                <textarea
                  className="input"
                  rows={3}
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCollectModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={collecting}>
                  {collecting ? 'جاري الحفظ...' : 'تسجيل التحصيل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
