import Link from 'next/link';

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">لماذا تستخدم هذا النظام؟</h1>
          <p className="text-gray-600">منصة مبسطة تساعدك تدير العهد والمصروفات والموافقات بسرعة ووضوح.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-3">المشكلة</h2>
          <ul className="list-disc pr-5 text-gray-700 space-y-2">
            <li>المصروفات تتسجل في أماكن مختلفة ويصعب تتبعها.</li>
            <li>طلبات التغذية والتحويل تتأخر بسبب غياب مسار واضح للموافقة.</li>
            <li>الفرق لا ترى الرصيد الفعلي المتاح بشكل لحظي.</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-3">قبل / بعد</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="font-semibold text-red-700 mb-2">قبل</div>
              <p className="text-red-800">قرارات بطيئة، أرقام غير دقيقة، وتتبع يدوي مرهق.</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="font-semibold text-green-700 mb-2">بعد</div>
              <p className="text-green-800">تدفق واضح من الطلب للموافقة مع رؤية مباشرة للرصيد والحركة.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-3">مثال حقيقي</h2>
          <p className="text-gray-700 leading-7">
            موظف ينشئ مصروفًا مرفقًا بفاتورة. المحاسب يراجع الطلب ويعتمده. النظام يسجل الأثر مباشرة على
            العهدة ويظهر الرصيد الجديد بدون خطوات يدوية إضافية.
          </p>
        </div>

        <Link href="/dashboard/home" className="btn btn-primary">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
