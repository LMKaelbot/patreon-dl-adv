import React, { useEffect, useState } from 'react';
import { api, User } from '../lib/api.js';
import { useAuth } from '../App.js';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', password: '', folder: '' });
  const [pwForm, setPwForm] = useState<{ id: number; pw: string } | null>(null);
  const [folderForm, setFolderForm] = useState<{ id: number; folder: string } | null>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try { setUsers(await api.getUsers()); }
    catch (err: unknown) { setError((err as Error).message); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.register(addForm.username, addForm.password, addForm.folder);
      setShowAdd(false);
      setAddForm({ username: '', password: '', folder: '' });
      loadUsers();
    } catch (err: unknown) { setError((err as Error).message); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this user?')) return;
    try { await api.deleteUser(id); setUsers((u) => u.filter((x) => x.id !== id)); }
    catch (err: unknown) { setError((err as Error).message); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwForm) return;
    try {
      await api.changePassword(pwForm.id, pwForm.pw);
      setPwForm(null);
    } catch (err: unknown) { setError((err as Error).message); }
  }

  async function handleChangeFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!folderForm) return;
    try {
      await api.changeFolder(folderForm.id, folderForm.folder);
      setUsers((u) => u.map((x) => x.id === folderForm.id ? { ...x, folder: folderForm.folder } : x));
      setFolderForm(null);
    } catch (err: unknown) { setError((err as Error).message); }
  }

  if (!me?.is_admin) {
    return <div className="text-gray-500">Admin access required.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add User</button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Add user modal */}
      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-lg">Add User</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input className="input" required value={addForm.username} onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input className="input" type="password" required value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Download Folder (optional)</label>
                <input className="input" value={addForm.folder} onChange={(e) => setAddForm((f) => ({ ...f, folder: e.target.value }))} placeholder="e.g. username" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {pwForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-lg">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input className="input" type="password" required placeholder="New password" value={pwForm.pw} onChange={(e) => setPwForm((f) => f ? { ...f, pw: e.target.value } : f)} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setPwForm(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Change</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change folder modal */}
      {folderForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-lg">Change Download Folder</h2>
            <form onSubmit={handleChangeFolder} className="space-y-3">
              <input className="input" placeholder="Folder name" value={folderForm.folder} onChange={(e) => setFolderForm((f) => f ? { ...f, folder: e.target.value } : f)} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setFolderForm(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Folder</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Joined</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3 text-gray-500">{u.folder || '—'}</td>
                <td className="px-4 py-3">
                  {u.is_admin ? (
                    <span className="badge bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">Admin</span>
                  ) : (
                    <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">User</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setPwForm({ id: u.id, pw: '' })} className="btn-secondary text-xs">Password</button>
                    <button onClick={() => setFolderForm({ id: u.id, folder: u.folder })} className="btn-secondary text-xs">Folder</button>
                    {u.id !== me!.id && (
                      <button onClick={() => handleDelete(u.id)} className="btn-danger text-xs">Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
