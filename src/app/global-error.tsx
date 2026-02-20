'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">حدث خطأ غير متوقع</h1>
          <p className="text-gray-600">تم تسجيل الخطأ تلقائيا وسنعمل على إصلاحه.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
