'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { DollarSign, Mail, Lock, Eye, EyeOff, Building2, Store, Hammer, Users, ArrowLeft, ArrowRight, ArrowRight as ArrowRightIcon } from 'lucide-react';

type ActivityType = 'commercial' | 'contracting' | 'sales_reps';

interface ActivityInfo {
  id: ActivityType;
  name: string;
  icon: typeof Building2;
  description: string;
}

const activities: ActivityInfo[] = [
  {
    id: 'commercial',
    name: 'شركة تجارية',
    icon: Store,
    description: 'متاجر، تجارة الجملة والتجزئة، استيراد وتصدير',
  },
  {
    id: 'contracting',
    name: 'مقاولات',
    icon: Hammer,
    description: 'مقاولات البناء، المشاريع، المقاولات العامة',
  },
  {
    id: 'sales_reps',
    name: 'مناديب مبيعات',
    icon: Users,
    description: 'فرق المبيعات، المندوبين، التوزيع',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    activityType: '' as ActivityType | '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleActivitySelect = (activityId: ActivityType) => {
    setFormData({ ...formData, activityType: activityId });
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.fullName.trim()) {
          toast.error('الرجاء إدخال الاسم الكامل');
          return false;
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
          toast.error('الرجاء إدخال بريد إلكتروني صحيح');
          return false;
        }
        if (!formData.password || formData.password.length < 8) {
          toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('كلمتا المرور غير متطابقتين');
          return false;
        }
        return true;
      case 2:
        if (!formData.companyName.trim()) {
          toast.error('الرجاء إدخال اسم الشركة');
          return false;
        }
        if (!formData.activityType) {
          toast.error('الرجاء اختيار نوع النشاط');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
            activity_type: formData.activityType,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success('تم إنشاء الحساب بنجاح! جاري تحويلك...');
        // Redirect to dashboard - the trigger will handle onboarding
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1000);
      } else {
        toast.success('تم إرسال رابط تأكيد إلى بريدك الإلكتروني');
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                    step >= s
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 mx-2 transition-colors ${
                      step > s ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Account Info */}
          {step === 1 && (
            <div className="animate-fadeIn">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">أنشئ حسابك</h1>
              <p className="text-gray-600 text-center mb-8">أدخل معلومات حسابك الشخصية</p>

              <div className="space-y-5">
                <div>
                  <label className="label">الاسم الكامل</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="أدخل اسمك الكامل"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="label">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="input pr-10"
                      placeholder="example@company.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input pr-10"
                      placeholder="8 أحرف على الأقل"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="input pr-10"
                      placeholder="أعد إدخال كلمة المرور"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={handleNextStep} className="btn btn-primary w-full py-3 mt-8">
                التالي <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Company Info */}
          {step === 2 && (
            <div className="animate-fadeIn">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">معلومات الشركة</h1>
              <p className="text-gray-600 text-center mb-8">أخبرنا عن شركتك ونوع نشاطها</p>

              <div className="space-y-5">
                <div>
                  <label className="label">اسم الشركة *</label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="input pr-10"
                      placeholder="أدخل اسم شركتك"
                      autoComplete="organization"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">نوع النشاط (مطلوب)</label>
                  <div className="grid gap-3 mt-2">
                    {activities.map((activity) => (
                      <button
                        key={activity.id}
                        onClick={() => handleActivitySelect(activity.id)}
                        className={`p-4 rounded-lg border-2 text-right transition-all ${
                          formData.activityType === activity.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <activity.icon className={`w-6 h-6 ${
                            formData.activityType === activity.id ? 'text-primary-600' : 'text-gray-400'
                          }`} />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{activity.name}</div>
                            <div className="text-sm text-gray-500">{activity.description}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            formData.activityType === activity.id
                              ? 'border-primary-600 bg-primary-600'
                              : 'border-gray-300'
                          }`}>
                            {formData.activityType === activity.id && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={handlePrevStep} className="btn btn-secondary py-3">
                  <ArrowRightIcon className="w-5 h-5" /> السابق
                </button>
                <button onClick={handleNextStep} className="btn btn-primary flex-1 py-3">
                  التالي <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="animate-fadeIn">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">مراجعة البيانات</h1>
              <p className="text-gray-600 text-center mb-8">تأكد من صحة البيانات قبل الإنشاء</p>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-500">الاسم</span>
                  <span className="font-medium">{formData.fullName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-500">البريد</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-500">الشركة</span>
                  <span className="font-medium">{formData.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">نوع النشاط</span>
                  <span className="font-medium">
                    {activities.find(a => a.id === formData.activityType)?.name}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4 text-center">
                بالضغط على &quot;إنشاء الحساب&quot; فإنك توافق على{' '}
                <a href="#" className="text-primary-600">الشروط والأحكام</a> و{' '}
                <a href="#" className="text-primary-600">سياسة الخصوصية</a>
              </p>

              <div className="flex gap-3 mt-6">
                <button onClick={handlePrevStep} className="btn btn-secondary py-3">
                  <ArrowRightIcon className="w-5 h-5" /> السابق
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn btn-success flex-1 py-3"
                >
                  {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              لديك حساب بالفعل؟{' '}
              <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium">
                سجل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Left Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary-600 items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <DollarSign className="w-14 h-14" />
          </div>
          <h2 className="text-3xl font-bold mb-4">ابدأ رحلتك معنا</h2>
          <p className="text-primary-100 text-lg mb-8">
            انضم إلى عدد متزايد من الشركات التي تثق في Smart Cash لإدارة ميزانياتها
          </p>
        </div>
      </div>
    </div>
  );
}
