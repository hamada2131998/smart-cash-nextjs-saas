import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Smart Cash & Custody - إدارة الكاش والعهد',
  description: 'منصة SaaS خفيفة لإدارة الكاش – العهد – المصروفات – الموافقات للشركات الصغيرة والمتوسطة',
  keywords: ['إدارة الكاش', 'إدارة المصروفات', 'العهد', 'SaaS', 'Saudi Arabia'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-primary-200 rounded-full"></div>
              <div className="text-gray-400">جاري التحميل...</div>
            </div>
          </div>
        }>
          {children}
        </Suspense>
        <Toaster
          position="top-left"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
