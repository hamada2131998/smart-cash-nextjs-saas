'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { DollarSign, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle onboarding_pending error
  const errorMessage = searchParams.get('error');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('مرحباً بعودتك!');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Smart Cash</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">مرحباً بعودتك</h1>
          <p className="text-gray-600 mb-8">سجل الدخول للوصول إلى لوحة التحكم</p>

          {/* Onboarding Pending Alert */}
          {errorMessage === 'onboarding_pending' && (
            <div className="alert alert-info mb-6">
              جاري تجهيز شركتك… سجّل الدخول بعد لحظات
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pr-10"
                  placeholder="example@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10 pl-10"
                  placeholder="أدخل كلمة المرور"
                  required
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-600">تذكرني</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ليس لديك حساب؟{' '}
              <Link href="/auth/register" className="text-primary-600 hover:text-primary-700 font-medium">
                أنشئ حساباً جديداً
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
          <h2 className="text-3xl font-bold mb-4">إدارة مالية أذكى وأبسط</h2>
          <p className="text-primary-100 text-lg mb-8">
            تابع مصروفاتك، أصدر الموافقات، وأدير عهد موظفيك من لوحة تحكم واحدة سهلة الاستخدام
          </p>
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-primary-200 text-sm">شركة نشطة</div>
            </div>
            <div>
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-primary-200 text-sm">رضا العملاء</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
