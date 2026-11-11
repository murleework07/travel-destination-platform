import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { getErrorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../../components/Spinner.jsx';
import { formatDate } from '../../utils/format.js';

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => adminApi.users({ page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }) => adminApi.changeRole(id, role),
    onSuccess: (u) => {
      toast.success(`${u.name} is now ${u.role}. They must log in again.`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <p className="text-red-600">{getErrorMessage(error)}</p>;

  const { data: users, meta } = data;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Users <span className="text-lg font-normal text-slate-400">({meta.total})</span></h1>

      <div className={`card overflow-x-auto ${isPlaceholderData ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = Number(u.id) === Number(me.id);
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{u.name} {isMe && <span className="text-xs text-slate-400">(you)</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={isMe || changeRole.isPending}
                      title={isMe ? "You can't change your own role" : ''}
                      onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}
                      className="input w-auto py-1"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="btn-outline">← Previous</button>
        <span className="text-sm text-slate-500">Page {meta.page} of {Math.max(meta.totalPages, 1)}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages} className="btn-outline">Next →</button>
      </div>
    </div>
  );
}
