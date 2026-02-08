'use client';

import { useEffect, useState } from 'react';
import { Save, Building2, Bell, Shield, Palette, Database, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const settingsTabs = [
  { id: 'company', name: 'معلومات الشركة', icon: Building2 },
  { id: 'notifications', name: 'الإشعارات', icon: Bell },
  { id: 'security', name: 'الأمان', icon: Shield },
  { id: 'appearance', name: 'المظهر', icon: Palette },
  { id: 'integrations', name: 'التكاملات', icon: Database },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: '',
    commercial_number: '',
    tax_number: '',
  });
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const supabase = createClient();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserData({
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
        });
      }

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (company) {
          setCompanyData({
            name: company.name || '',
            commercial_number: company.commercial_number || '',
            tax_number: company.tax_number || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: userData.full_name,
          phone: userData.phone,
        })
        .eq('id', user.id);

      if (profileError) {
        throw new Error('فشل تحديث الملف الشخصي');
      }

      // Update company
      if (activeTab === 'company' && companyData.name) {
        const { error: companyError } = await supabase
          .from('companies')
          .update({
            name: companyData.name,
            commercial_number: companyData.commercial_number || null,
            tax_number: companyData.tax_number || null,
          })
          .eq('id', (await supabase.from('profiles').select('company_id').eq('id', user.id).single()).data?.company_id);

        if (companyError) {
          throw new Error('فشل تحديث بيانات الشركة');
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !companyData.name) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
        <p className="text-gray-500 mt-1">إدارة إعدادات الشركة والتطبيق</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="card p-2 space-y-1">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'company' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">معلومات الشركة</h2>
              </div>
              <div className="card-body space-y-6">
                <div>
                  <label className="label">اسم الشركة</label>
                  <input
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">رقم السجل التجاري</label>
                    <input
                      type="text"
                      value={companyData.commercial_number}
                      onChange={(e) => setCompanyData({ ...companyData, commercial_number: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">الرقم الضريبي</label>
                    <input
                      type="text"
                      value={companyData.tax_number}
                      onChange={(e) => setCompanyData({ ...companyData, tax_number: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">الاسم الكامل</label>
                  <input
                    type="text"
                    value={userData.full_name}
                    onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSave} disabled={loading} className="btn btn-primary">
                    {loading ? 'جاري الحفظ...' : saved ? '✓ تم الحفظ!' : 'حفظ التغييرات'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">إعدادات الإشعارات</h2>
              </div>
              <div className="card-body space-y-6">
                {[
                  { title: 'مصروف جديد معل awaiting الموافقة', description: 'إشعار عند تقديم مصروف جديد' },
                  { title: 'اعتماد أو رفض مصروف', description: 'إشعار عند الموافقة أو الرفض' },
                  { title: 'رصيد عهد منخفض', description: 'تنبيه عندما يصل رصيد العهد للحد الأدنى' },
                  { title: 'تقرير أسبوعي', description: 'إرسال ملخص أسبوعي للمصروفات' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={index < 3} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">إعدادات الأمان</h2>
              </div>
              <div className="card-body space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">تغيير كلمة المرور</h3>
                  <p className="text-sm text-gray-500">للحماية الأفضل، قم بتغيير كلمة المرور الخاصة بك بانتظام</p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">معلومات الحساب</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">البريد الإلكتروني</span>
                      <span className="text-sm font-medium">{userData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">آخر تسجيل دخول</span>
                      <span className="text-sm text-gray-400">الجلسة الحالية</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">المظهر واللغة</h2>
              </div>
              <div className="card-body space-y-6">
                <div>
                  <label className="label">لغة الواجهة</label>
                  <select className="input" defaultValue="ar">
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="label">المنطقة الزمنية</label>
                  <select className="input" defaultValue="Asia/Riyadh">
                    <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                    <option value="Asia/Dubai">دبي (GMT+4)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div>
                  <label className="label">العملة الافتراضية</label>
                  <select className="input" defaultValue="SAR">
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="AED">درهم إماراتي (AED)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">التكاملات</h2>
              </div>
              <div className="card-body space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  التكاملات ستكون متاحة قريبًا. الأزرار معطلة حاليًا.
                </div>
                {[
                  { name: 'WhatsApp', description: 'إرسال إشعارات عبر WhatsApp', connected: false },
                  { name: 'Slack', description: 'إرسال إشعارات إلى قنوات Slack', connected: false },
                  { name: 'Google Drive', description: 'حفظ المرفقات في Google Drive', connected: false },
                  { name: 'Microsoft Teams', description: 'إرسال إشعارات إلى Teams', connected: false },
                ].map((integration, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{integration.name}</div>
                        <div className="text-sm text-gray-500">{integration.description}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled
                      onClick={() => {}}
                      className={`btn ${integration.connected ? 'btn-secondary' : 'btn-primary'} opacity-60 cursor-not-allowed`}
                      title="قريبًا"
                    >
                      قريبًا
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
