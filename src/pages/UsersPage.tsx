import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { UserAccount, UserRole } from '../types';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  User, 
  Key, 
  UserX, 
  UserCheck, 
  Trash2,
  CheckCircle2, 
  AlertTriangle,
  Search,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>(() => storage.getUsers());
  const [filterRole, setFilterRole] = useState<'all' | 'kasir' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editPasswordUser, setEditPasswordUser] = useState<UserAccount | null>(null);
  const [deletingUserTarget, setDeletingUserTarget] = useState<UserAccount | null>(null);

  // Password visibility states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Add Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('kasir');
  const [newPassword, setNewPassword] = useState('');

  // Password Reset Form State
  const [updatedPassword, setUpdatedPassword] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshList = () => {
    setUsers(storage.getUsers());
  };

  // Sync with cross-tab / storage updates
  useEffect(() => {
    const handleUpdate = () => refreshList();
    window.addEventListener('pandir_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('pandir_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Form error state
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateUser = () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError('Semua field (Nama, Email, dan Password) wajib diisi.');
      return;
    }
    setFormError(null);

    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      password: newPassword,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    storage.updateUser(newUser);
    refreshList();
    setIsAddModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    showToast(`Akun ${newRole === 'kasir' ? 'Kasir' : 'Admin'} "${newUser.name}" berhasil dibuat!`);
  };

  const confirmDeleteUser = () => {
    if (!deletingUserTarget) return;
    const deletedName = deletingUserTarget.name;
    storage.deleteUser(deletingUserTarget.id);
    setUsers((prev) => prev.filter((u) => u.id !== deletingUserTarget.id));
    setDeletingUserTarget(null);
    showToast(`Akun "${deletedName}" berhasil dihapus secara real-time!`);
  };

  const handleUpdatePassword = () => {
    if (!editPasswordUser || !updatedPassword.trim()) return;
    const updated: UserAccount = {
      ...editPasswordUser,
      password: updatedPassword.trim(),
      updatedAt: new Date().toISOString(),
    };
    storage.updateUser(updated);
    refreshList();
    showToast(`Kata sandi akun "${editPasswordUser.name}" berhasil diperbarui!`);
    setEditPasswordUser(null);
    setUpdatedPassword('');
  };

  const handleToggleStatus = (targetUser: UserAccount) => {
    if (targetUser.id === currentUser?.id) {
      showToast('Anda tidak dapat menonaktifkan akun Anda sendiri.');
      return;
    }

    const newStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    const updated: UserAccount = {
      ...targetUser,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    storage.updateUser(updated);
    refreshList();
    showToast(newStatus === 'disabled' 
      ? `Akun "${targetUser.name}" dinonaktifkan (Force Logout seketika).`
      : `Akun "${targetUser.name}" berhasil diaktifkan kembali.`
    );
  };

  // REAL-TIME DELETE USER
  const handleDeleteUser = (targetUser: UserAccount) => {
    if (targetUser.id === currentUser?.id) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
      return;
    }
    setDeletingUserTarget(targetUser);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const kasirCount = users.filter((u) => u.role === 'kasir').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5 pb-24 lg:pb-6">
      
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-3 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Manajemen Pengguna &amp; Akun Kasir (Full Akses Admin)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tambah akun kasir baru, reset kata sandi, dan <strong>hapus akun secara real-time</strong> tanpa perlu reload halaman
          </p>
        </div>

        <button
          onClick={() => {
            setNewRole('kasir');
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Kasir</span>
        </button>
      </div>

      {/* Role Tabs & Search Controls */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterRole === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Akun ({users.length})
          </button>
          <button
            onClick={() => setFilterRole('kasir')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              filterRole === 'kasir' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Khusus Kasir ({kasirCount})</span>
          </button>
          <button
            onClick={() => setFilterRole('admin')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              filterRole === 'admin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Khusus Admin ({adminCount})</span>
          </button>
        </div>

        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau email akun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Nama Pengguna</th>
                <th className="py-3 px-3">Email / Username</th>
                <th className="py-3 px-3">Peran (Role)</th>
                <th className="py-3 px-3">Status Sesi</th>
                <th className="py-3 px-3">Terdaftar Sejak</th>
                <th className="py-3 px-4 text-right">Aksi Real-Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isCurrent = u.id === currentUser?.id;
                const isActive = u.status === 'active';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            Akun Anda
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{u.email}</td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 w-fit ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        <span className="uppercase">{u.role}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('id-ID')}
                    </td>

                    {/* Actions: Reset Password, Toggle Status, Hapus Real-Time */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Change Password Button */}
                        <button
                          onClick={() => {
                            setEditPasswordUser(u);
                            setUpdatedPassword('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                          title="Ganti Kata Sandi"
                        >
                          <Key className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Password</span>
                        </button>

                        {/* Disable / Enable Toggle Button */}
                        {!isCurrent && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              isActive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                            title={isActive ? 'Nonaktifkan Akun (Force Logout)' : 'Aktifkan Akun Kembali'}
                          >
                            {isActive ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Nonaktifkan</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Aktifkan</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* FITUR HAPUS REAL-TIME (Requirement 3) */}
                        {!isCurrent && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition active:scale-95"
                            title="Hapus Akun Real-Time dari Database"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">
              Tidak ada akun kasir/admin yang sesuai dengan pencarian.
            </div>
          )}
        </div>
      </div>

      {/* MODAL TAMBAH USER BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateUser();
            }}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Tambah Akun Kasir / Pengguna Baru</h3>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Kasir:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setFormError(null); }}
                  placeholder="Contoh: Rian Kasir Shift 2"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email / Username Kasir:</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => { setNewEmail(e.target.value); setFormError(null); }}
                  placeholder="Contoh: kasir2@pandirstore.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Peran (Role Akses):</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                >
                  <option value="kasir">Kasir (POS, Kas Operasional, Closing WhatsApp)</option>
                  <option value="admin">Admin (Pemilik Toko - Full Access)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kata Sandi (Password):</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setFormError(null); }}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-2 font-mono text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    title={showNewPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs active:scale-95 transition"
              >
                Simpan Akun
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL RESET KATA SANDI */}
      {editPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdatePassword();
            }}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Ganti Kata Sandi</h3>
                <p className="text-xs text-slate-400">{editPasswordUser.name} ({editPasswordUser.email})</p>
              </div>
              <button type="button" onClick={() => setEditPasswordUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kata Sandi Baru:</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={updatedPassword}
                    onChange={(e) => setUpdatedPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-2 font-mono font-bold text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    title={showResetPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setEditPasswordUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!updatedPassword.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs disabled:bg-slate-300"
              >
                Simpan Kata Sandi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL HAPUS USER REAL-TIME */}
      {deletingUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Hapus Akun Pengguna?</h3>
                <p className="text-xs text-slate-500">Tindakan ini menghapus akses secara permanen</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong>Nama:</strong> {deletingUserTarget.name}</div>
              <div><strong>Email:</strong> <span className="font-mono font-bold text-slate-800">{deletingUserTarget.email}</span></div>
              <div><strong>Role:</strong> <span className="uppercase font-bold text-purple-700">{deletingUserTarget.role}</span></div>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus akun <strong>"{deletingUserTarget.name}"</strong> secara permanen dari sistem?
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUserTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
