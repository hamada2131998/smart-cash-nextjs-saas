'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, ToggleLeft, ToggleRight, Edit, Trash2, Shield, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function PoliciesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<any[]>([]);

  const supabase = createClient();

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const { data: policiesData } = await supabase
        .from('policies')
        .select('*')
        .order('priority', { ascending: true });

      if (policiesData) {
        setPolicies(policiesData);
      }
    } catch (error) {
      console.error('Error loading policies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const togglePolicy = async (id: string) => {
    try {
      const policy = policies.find(p => p.id === id);
      if (!policy) return;

      const { error } = await supabase
        .from('policies')
        .update({ is_active: !policy.is_active })
        .eq('id', id);

      if (error) {
        alert('فشل تحديث السياسة: ' + error.message);
      } else {
        await loadPolicies();
      }
    } catch (error) {
      console.error('Error toggling policy:', error);
    }
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = showInactive || policy.is_active;
    return matchesSearch && matchesActive;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة السياسات</h1>
          <p className="text-gray-500 mt-1">تعريف سياسات المصروفات والموافقات</p>
        </div>
        <button type="button" disabled onClick={() => {}} className="btn btn-primary opacity-60 cursor-not-allowed" title="قريبًا">
          <Plus className="w-5 h-5" />
          إضافة سياسة جديدة (قريبًا)
        </button>
      </div>

      {/* Info Card */}
      <div className="card bg-primary-50 border-primary-200">
        <div className="p-4 flex items-start gap-3">
          <Info className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-primary-900">ما هي السياسات؟</h3>
            <p className="text-sm text-primary-700 mt-1">
              السياسات هي قواعد تلقائية تحدد كيفية معالجة المصروفات. مثلاً: الموافقة تلقائياً على المصروفات الصغيرة، أو إلزامية المرفقات للمبالغ الكبيرة.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pr-10"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer self-center">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">عرض غير النشطة</span>
          </label>
        </div>
      </div>

      {/* Policies List */}
      <div className="space-y-4">
        {filteredPolicies.map((policy) => (
          <div key={policy.id} className={`card ${!policy.is_active ? 'opacity-60' : ''}`}>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${policy.is_active ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <Shield className={`w-6 h-6 ${policy.is_active ? 'text-primary-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{policy.name}</h3>
                      {!policy.is_active && (
                        <span className="badge badge-gray">غير نشطة</span>
                      )}
                    </div>
                    {policy.description && (
                      <p className="text-sm text-gray-500 mt-1">{policy.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {policy.policy_rules && typeof policy.policy_rules === 'object' && (
                        <>
                          {policy.policy_rules.autoApproveAmount && (
                            <span className="text-xs text-gray-600">
                              ✓ موافقة تلقائية لأقل من {policy.policy_rules.autoApproveAmount} ر.س
                            </span>
                          )}
                          {policy.policy_rules.requireAttachmentAbove && (
                            <span className="text-xs text-gray-600">
                              📎 مرفقات إجبارية لأكثر من {policy.policy_rules.requireAttachmentAbove} ر.س
                            </span>
                          )}
                          {policy.policy_rules.requireApproval && (
                            <span className="text-xs text-gray-600">
                              👤 يتطلب موافقة
                            </span>
                          )}
                          {policy.policy_rules.maxAmountWithoutApproval && (
                            <span className="text-xs text-gray-600">
                              ⚠️ الحد الأقصى بدون موافقة: {policy.policy_rules.maxAmountWithoutApproval}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">الأولوية: {policy.priority}</span>
                  <button
                    type="button"
                    onClick={() => togglePolicy(policy.id)}
                    className={`${policy.is_active ? 'text-success-500' : 'text-gray-400'}`}
                  >
                    {policy.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {policy.created_at && `تم الإنشاء: ${new Date(policy.created_at).toLocaleDateString('ar-SA')}`}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled
                    onClick={() => {}}
                    className="btn btn-secondary btn-sm opacity-60 cursor-not-allowed"
                    title="قريبًا"
                  >
                    <Edit className="w-4 h-4" />
                    تعديل (قريبًا)
                  </button>
                  <button
                    type="button"
                    disabled
                    onClick={() => {}}
                    className="btn btn-outline btn-sm text-danger-500 opacity-60 cursor-not-allowed"
                    title="قريبًا"
                  >
                    <Trash2 className="w-4 h-4" />
                    قريبًا
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPolicies.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          لا توجد سياسات {showInactive ? '' : 'نشطة '}تطابق معايير البحث
        </div>
      )}
    </div>
  );
}
