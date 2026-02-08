'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format-utils';
import { CustodyStatus } from '@/types/database.types';

type CustodyRow = {
  id: string;
  user_id: string;
  initial_amount: number;
  current_balance: number;
  currency: string;
  status: CustodyStatus;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

export default function CustodiesPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CustodyStatus>('all');
  const [rows, setRows] = useState<CustodyRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('custodies')
        .select('id,user_id,initial_amount,current_balance,currency,status,created_at,profiles(full_name,email)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRows(data as unknown as CustodyRow[]);
      }
      setLoading(false);
    };

    load();
  }, [supabase]);

  const filtered = rows.filter((item) => {
    const name = item.profiles?.full_name ?? '';
    const email = item.profiles?.email ?? '';
    const matchText = name.toLowerCase().includes(query.toLowerCase()) || email.toLowerCase().includes(query.toLowerCase());
    const matchStatus = status === 'all' || item.status === status;
    return matchText && matchStatus;
  });

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custodies</h1>
          <p className="text-sm text-gray-500">Track employee custody balances</p>
        </div>
        <Link href="/dashboard/custodies/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Custody
        </Link>
      </div>

      <div className="card p-4 flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
            <input
              className="input pr-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
            />
          </div>
        </div>
        <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value as 'all' | CustodyStatus)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="frozen">Frozen</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Balance</th>
              <th>Initial</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="font-medium">{item.profiles?.full_name ?? 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{item.profiles?.email ?? '-'}</div>
                </td>
                <td>{formatCurrency(item.current_balance, item.currency)}</td>
                <td>{formatCurrency(item.initial_amount, item.currency)}</td>
                <td>{item.status}</td>
                <td>{formatDate(item.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
