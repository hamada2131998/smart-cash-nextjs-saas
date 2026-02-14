'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import {
  DollarSign,
  LayoutDashboard,
  FileText,
  Shield,
  Users,
  Contact,
  Settings,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard/advanced', icon: LayoutDashboard },
  { name: 'المصروفات', href: '/dashboard/expenses', icon: FileText },
  { name: 'العهد', href: '/dashboard/custodies', icon: DollarSign },
  { name: 'السياسات', href: '/dashboard/policies', icon: Shield },
  { name: 'المستخدمون', href: '/dashboard/users', icon: Users },
  { name: 'العملاء', href: '/dashboard/customers', icon: Contact },
  { name: 'الإعدادات', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  user?: {
    full_name: string;
    email: string;
    role: string;
    avatar_url?: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        type="button"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 w-64 bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Smart Cash</span>
          </Link>
        </div>

        {user && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium">
                    {user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{user.full_name}</div>
                <div className="text-sm text-gray-500 truncate">{user.email}</div>
              </div>
            </div>
          </div>
        )}

        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
                {isActive && <ChevronRight className="w-4 h-4 mr-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-60"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">{signingOut ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
