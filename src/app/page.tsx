import Link from 'next/link';
import { Shield, DollarSign, FileCheck, Users, Zap, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: DollarSign,
      title: 'إدارة العهد',
      description: 'تتبع العهد النقدية لكل موظف مع رصيد واضح ومحدث تلقائياً',
    },
    {
      icon: FileCheck,
      title: 'نظام الموافقات',
      description: 'موافقة أو رفض المصروفات مع سجل تدقيق كامل وشفاف',
    },
    {
      icon: Shield,
      title: 'سياسات ذكية',
      description: 'تعريف سياسات المصروفات حسب نوع النشاط والمبلغ',
    },
    {
      icon: Users,
      title: 'صلاحيات متعددة',
      description: 'أدوار واضحة: مالك، مدير، محاسب، موظف',
    },
    {
      icon: TrendingUp,
      title: 'Dashboard لحظي',
      description: 'نظرة شاملة على الوضع المالي من أي مكان',
    },
    {
      icon: Zap,
      title: 'Fast Onboarding',
      description: 'ابدأ خلال دقائق مع الإعدادات التلقائية حسب نوع نشاطك',
    },
  ];

  const benefits = [
    'توفير الوقت والجهد في تتبع المصروفات',
    'شفافية كاملة لصاحب الشركة',
    'تقليل الأخطاء البشرية',
    'توفير تقارير فورية',
    'أمان عالي للبيانات',
    'دعم فني متواصل',
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Smart Cash</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">المميزات</a>
              <a href="#benefits" className="text-gray-600 hover:text-gray-900 transition-colors">الفوائد</a>
              <Link href="/auth/login" className="btn btn-outline">تسجيل الدخول</Link>
              <Link href="/auth/register" className="btn btn-primary">ابدأ الآن مجاناً</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              منصة متكاملة لإدارة
              <span className="text-primary-600"> الكاش والعهد والمصروفات</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              حل سهل وبسيط للشركات الصغيرة والمتوسطة. تابع مصروفاتك، أصدر الموافقات، وأدير عهد موظفيك من لوحة تحكم واحدة.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="btn btn-primary btn-lg">
                ابدأ الفترة التجريبية المجانية
              </Link>
              <Link href="#features" className="btn btn-secondary btn-lg">
                اعرف المزيد
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">500+</div>
              <div className="text-primary-100 mt-1">شركة نشطة</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">10M+</div>
              <div className="text-primary-100 mt-1">ريال تم صرفه</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">99.9%</div>
              <div className="text-primary-100 mt-1">وقت التشغيل</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white">24/7</div>
              <div className="text-primary-100 mt-1">دعم فني</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">كل ما تحتاجه لإدارة ميزانيتك</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              نظام متكامل يغطي جميع جوانب إدارة الكاش والمصروفات مع واجهة سهلة الاستخدام
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">لماذا تختار Smart Cash؟</h2>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary-600 mb-2">بداية مجانية</div>
                <div className="text-gray-500">جرب المنصة مجاناً لمدة 14 يوم</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">المستخدمين</span>
                  <span className="font-medium">غير محدود</span>
                </li>
                <li className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">التخزين</span>
                  <span className="font-medium">5 GB</span>
                </li>
                <li className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">الدعم</span>
                  <span className="font-medium">البريد الإلكتروني</span>
                </li>
                <li className="flex justify-between py-2">
                  <span className="text-gray-600">التقارير</span>
                  <span className="font-medium">أساسية</span>
                </li>
              </ul>
              <Link href="/auth/register" className="btn btn-primary w-full">
                ابدأ الآن
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">ابدأ رحلتك مع إدارة مالية أذكى</h2>
          <p className="text-lg text-primary-100 mb-8">
            انضم إلى hundreds من الشركات التي تثق في Smart Cash لإدارة ميزانياتها
          </p>
          <Link href="/auth/register" className="btn bg-white text-primary-600 hover:bg-primary-50 btn-lg">
            أنشئ حسابك الآن
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Smart Cash</span>
              </div>
              <p className="text-sm">منصة متكاملة لإدارة الكاش والعهد والمصروفات للشركات الصغيرة والمتوسطة.</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">المنتج</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">المميزات</a></li>
                <li><a href="#" className="hover:text-white transition-colors">الأسعار</a></li>
                <li><a href="#" className="hover:text-white transition-colors">التكاملات</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">الدعم</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">المساعدة</a></li>
                <li><a href="#" className="hover:text-white transition-colors">التوثيق</a></li>
                <li><a href="#" className="hover:text-white transition-colors">اتصل بنا</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">المعلومات</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">من نحن</a></li>
                <li><a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a></li>
                <li><a href="#" className="hover:text-white transition-colors">الشروط والأحكام</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © 2024 Smart Cash & Custody. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}
