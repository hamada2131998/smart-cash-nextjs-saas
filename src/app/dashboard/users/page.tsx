'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Search, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase';
import { getRoleLabel } from '@/lib/auth-utils';
import { UserRole } from '@/types/database.types';

type UserRow = {
  id: string;
  role: UserRole;
  assigned_at: string;
  user_id?: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    is_active: boolean;
  } | null;
};

const roleOptions: UserRole[] = ['owner', 'admin', 'accountant', 'employee', 'manager', 'finance_manager', 'sales_rep'];

export default function UsersPage() {
  const supabase = createClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [savingRole, setSavingRole] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('employee');
  const [inviting, setInviting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_roles')
      .select('id,user_id,role,assigned_at,profiles(id,email,full_name,avatar_url,is_active)')
      .order('assigned_at', { ascending: false });

    setUsers((data ?? []) as unknown as UserRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleUserStatus = async (profileId: string) => {
    const current = users.find((user) => user.profiles?.id === profileId)?.profiles?.is_active;
    if (typeof current !== 'boolean') return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !current })
      .eq('id', profileId);

    if (error) {
      alert(`فشل تحديث الحالة: ${error.message}`);
      return;
    }

    await loadUsers();
  };

  const openEdit = (row: UserRow) => {
    setEditing(row);
    setEditRole(row.role);
  };

  const saveRole = async () => {
    if (!editing) return;

    setSavingRole(true);
    const { error } = await supabase
      .from('user_roles')
      .update({ role: editRole })
      .eq('id', editing.id);

    setSavingRole(false);

    if (error) {
      alert(`فشل تحديث الدور: ${error.message}`);
      return;
    }

    setEditing(null);
    await loadUsers();
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        user.profiles?.full_name?.toLowerCase().includes(search) ||
        user.profiles?.email?.toLowerCase().includes(search);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      owner: 'badge-danger',
      admin: 'badge-danger',
      accountant: 'badge-primary',
      employee: 'badge-gray',
      manager: 'badge-warning',
      finance_manager: 'badge-primary',
      sales_rep: 'badge-success',
    };

    return colors[role] || 'badge-gray';
  };

  if (loading) return <div className="p-6">جاري التحميل...</div>;

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setInviting(true);
    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !result.ok) {
        if (result.error === 'Already invited/exists') {
          toast(result.error, { icon: 'ℹ️' });
        } else {
          toast.error(result.error || 'فشل إرسال الدعوة');
        }
        return;
      }

      toast.success('تم إرسال الدعوة بنجاح');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('employee');
      await loadUsers();
    } catch {
      toast.error('تعذر الاتصال بالخادم');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المستخدمون</h1>
          <p className="text-gray-500 mt-1">إدارة مستخدمي الشركة وصلاحياتهم</p>
        </div>
        <button type="button" onClick={() => setShowInviteModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          إضافة مستخدم جديد
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pr-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
            className="input w-auto"
          >
            <option value="all">جميع الأدوار</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>تاريخ الإضافة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {user.profiles?.avatar_url ? (
                        <img
                          src={user.profiles.avatar_url}
                          alt={user.profiles.full_name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {user.profiles?.full_name
                              ?.split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2) || '??'}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{user.profiles?.full_name ?? '-'}</span>
                    </div>
                  </td>
                  <td className="text-gray-600">{user.profiles?.email ?? '-'}</td>
                  <td>
                    <span className={`badge ${getRoleColor(user.role)}`}>{getRoleLabel(user.role)}</span>
                  </td>
                  <td>
                    {user.profiles?.is_active ? (
                      <span className="badge badge-success">نشط</span>
                    ) : (
                      <span className="badge badge-gray">غير نشط</span>
                    )}
                  </td>
                  <td className="text-gray-500">
                    {user.assigned_at ? new Date(user.assigned_at).toLocaleDateString('ar-SA') : '-'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="تعديل الدور"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => user.profiles?.id && toggleUserStatus(user.profiles.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.profiles?.is_active
                            ? 'text-warning-500 hover:bg-warning-50'
                            : 'text-success-500 hover:bg-success-50'
                        }`}
                        title={user.profiles?.is_active ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
                      >
                        {user.profiles?.is_active ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500">لا يوجد مستخدمون مطابقون للبحث</div>
        )}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">تعديل دور المستخدم</h2>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">{editing.profiles?.full_name ?? '-'}</div>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="input"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={saveRole}
                  disabled={savingRole}
                >
                  {savingRole ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">دعوة مستخدم جديد</h2>
            <form className="space-y-3" onSubmit={submitInvite}>
              <div>
                <label className="label">البريد الإلكتروني *</label>
                <input
                  type="email"
                  className="input"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div>
                <label className="label">الدور</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="input"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={inviting}>
                  {inviting ? 'جاري الإرسال...' : 'إرسال دعوة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
