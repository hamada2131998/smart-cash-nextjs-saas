'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Search } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export default function DashboardHeader({ title }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'مصروف جديد بانتظار الموافقة', time: 'منذ 5 دقائق', unread: true },
    { id: 2, title: 'تم اعتماد مصروف #1234', time: 'منذ ساعة', unread: true },
    { id: 3, title: 'تذكير: رصيد العهد منخفض', time: 'منذ ساعتين', unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              className="w-64 pl-4 pr-10 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">الإشعارات</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${notification.unread ? 'bg-primary-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {notification.unread && <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />}
                      <div className={notification.unread ? '' : 'mr-5'}>
                        <p className="text-sm text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <Link href="/dashboard/notifications" className="text-sm text-primary-600 hover:text-primary-700 font-medium" onClick={() => setShowNotifications(false)}>
                  عرض كل الإشعارات
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
