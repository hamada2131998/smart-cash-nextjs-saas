'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { formatDateTime } from '@/lib/format-utils';

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('id,title,message,type,link,is_read,created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      setRows((data ?? []) as NotificationRow[]);
      setLoading(false);
    };

    load();
  }, [supabase]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
        <p className="text-sm text-gray-500">آخر 50 إشعار</p>
      </div>

      {loading ? (
        <div className="card p-6 text-gray-500">جاري التحميل...</div>
      ) : rows.length === 0 ? (
        <div className="card p-6 text-gray-500">لا توجد إشعارات</div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {rows.map((n) => (
            <div key={n.id} className="p-4 flex items-start gap-3">
              <span className={`mt-1 h-2 w-2 rounded-full ${n.is_read ? 'bg-gray-300' : 'bg-primary-500'}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-medium text-gray-900">{n.title}</h2>
                  <span className="text-xs text-gray-500">{formatDateTime(n.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                <div className="text-xs text-gray-400 mt-1">{n.type}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
