/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppUser, AppUserPermissions } from '../types';
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  Trash2, 
  Edit2, 
  Key, 
  Check, 
  X, 
  Search,
  User,
  ShieldCheck,
  Shield,
  Activity,
  Coins,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Crown
} from 'lucide-react';
import { showToast } from '../utils';

interface UserManagerProps {
  users: AppUser[];
  currentUser: AppUser | null;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (id: string) => void;
}

export const AVAILABLE_TABS = [
  { id: 'dashboard', name: 'Dashboard Ringkasan' },
  { id: 'invoice', name: 'Faktur Penjualan' },
  { id: 'surat_jalan', name: 'Surat Jalan (Pengiriman)' },
  { id: 'report', name: 'Laporan Penjualan' },
  { id: 'returns', name: 'Kelola Retur & Klaim' },
  { id: 'commissions', name: 'Komisi Pegawai' },
  { id: 'customers', name: 'Daftar Pelanggan' },
  { id: 'shoes', name: 'Master Sepatu / Produk' },
  { id: 'settings', name: 'Aturan & Konfigurasi' },
  { id: 'users', name: 'Kelola Akun Pengguna' },
  { id: 'history', name: 'History Kegiatan User' }
];

export const AVAILABLE_ACTIONS: { id: keyof AppUserPermissions; name: string; desc: string }[] = [
  { id: 'canCreateInvoice', name: 'Membuat Faktur Baru', desc: 'Mengizinkan pembuatan transaksi faktur penjualan baru.' },
  { id: 'canEditInvoice', name: 'Mengubah Faktur', desc: 'Mengizinkan pengubahan isi data faktur yang sudah terbit.' },
  { id: 'canDeleteInvoice', name: 'Menghapus/Membatalkan Faktur', desc: 'Mengizinkan penghapusan faktur dari sistem.' },
  { id: 'canPayInvoice', name: 'Melunasi & Input Pembayaran', desc: 'Mengizinkan pencatatan pelunasan atau angsuran tagihan.' },
  { id: 'canProcessReturn', name: 'Memproses Retur', desc: 'Mengizinkan pencatatan retur atau klaim barang cacat.' },
  { id: 'canManageMasterData', name: 'Mengelola Master Data', desc: 'Mengizinkan tambah/ubah/hapus data Pelanggan, Sepatu/Produk, & Pegawai.' },
  { id: 'canManageSalesman', name: 'Mengelola Pegawai Penerima Komisi', desc: 'Mengizinkan pendaftaran, pengubahan, & penghapusan database pegawai penerima komisi.' },
  { id: 'canPayCommission', name: 'Melunasi Komisi Pegawai', desc: 'Mengizinkan pencatatan pelunasan/pembayaran komisi pegawai.' },
  { id: 'canEditCommissionRate', name: 'Mengubah Tarif Komisi Pegawai', desc: 'Mengizinkan pengubahan nominal tarif komisi per pasang untuk pegawai.' },
  { id: 'canManageSuratJalan', name: 'Mengelola Surat Jalan', desc: 'Mengizinkan pengubahan supir/kendaraan & memproses pengiriman Surat Jalan.' },
  { id: 'canManagePaymentProof', name: 'Mengelola Bukti Pembayaran', desc: 'Mengizinkan upload foto bukti transfer, ambil kamera, & menghapus bukti.' },
  { id: 'canManageInstallments', name: 'Mengelola Riwayat Cicilan', desc: 'Mengizinkan pencatatan cicilan baru & menghapus riwayat cicilan faktur.' },
  { id: 'canEditSettings', name: 'Mengubah Aturan/Pengaturan', desc: 'Mengizinkan pengeditan identitas logo toko & syarat ketentuan surat jalan.' },
  { id: 'canClearLogs', name: 'Menghapus Log Kegiatan', desc: 'Mengizinkan pembersihan/penghapusan riwayat log kegiatan sistem.' }
];

export const TAB_ACTIONS_MAP: Record<string, (keyof AppUserPermissions)[]> = {
  invoice: [
    'canCreateInvoice',
    'canEditInvoice',
    'canDeleteInvoice',
    'canPayInvoice',
    'canManagePaymentProof',
    'canManageInstallments'
  ],
  surat_jalan: ['canManageSuratJalan'],
  returns: ['canProcessReturn'],
  commissions: ['canPayCommission', 'canEditCommissionRate', 'canManageSalesman'],
  customers: ['canManageMasterData'],
  shoes: ['canManageMasterData'],
  settings: ['canEditSettings'],
  history: ['canClearLogs']
};

export default function UserManager({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}: UserManagerProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<AppUser['role']>('operator');
  const [selectedTabs, setSelectedTabs] = useState<string[]>(AVAILABLE_TABS.map(t => t.id));
  
  const getDefaultPermissionsForRole = (r: AppUser['role']): AppUserPermissions => {
    switch (r) {
      case 'super_admin':
      case 'director':
      case 'admin':
        return {
          canCreateInvoice: true,
          canEditInvoice: true,
          canDeleteInvoice: true,
          canPayInvoice: true,
          canProcessReturn: true,
          canManageMasterData: true,
          canManageSalesman: true,
          canPayCommission: true,
          canEditCommissionRate: true,
          canManageSuratJalan: true,
          canManagePaymentProof: true,
          canManageInstallments: true,
          canEditSettings: true,
          canClearLogs: true,
        };
      case 'finance':
        return {
          canCreateInvoice: false,
          canEditInvoice: false,
          canDeleteInvoice: false,
          canPayInvoice: true,
          canProcessReturn: true,
          canManageMasterData: false,
          canManageSalesman: false,
          canPayCommission: true,
          canEditCommissionRate: true,
          canManageSuratJalan: false,
          canManagePaymentProof: true,
          canManageInstallments: true,
          canEditSettings: false,
          canClearLogs: false,
        };
      case 'operator':
      default:
        return {
          canCreateInvoice: true,
          canEditInvoice: true,
          canDeleteInvoice: false,
          canPayInvoice: false,
          canProcessReturn: false,
          canManageMasterData: true,
          canManageSalesman: true,
          canPayCommission: false,
          canEditCommissionRate: false,
          canManageSuratJalan: true,
          canManagePaymentProof: false,
          canManageInstallments: false,
          canEditSettings: false,
          canClearLogs: false,
        };
    }
  };

  const [actionPermissions, setActionPermissions] = useState<AppUserPermissions>(getDefaultPermissionsForRole('operator'));
  const [formError, setFormError] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setName('');
    setRole('operator');
    setSelectedTabs(['dashboard', 'invoice', 'customers', 'shoes']); // Default operator tabs
    setActionPermissions(getDefaultPermissionsForRole('operator'));
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(user.password || '');
    setShowPassword(false);
    setName(user.name);
    setRole(user.role);
    setSelectedTabs(user.allowedTabs || AVAILABLE_TABS.map(t => t.id));
    setActionPermissions(user.permissions || getDefaultPermissionsForRole(user.role));
    setFormError('');
    setIsFormOpen(true);
  };

  const handleRoleChange = (newRole: AppUser['role']) => {
    setRole(newRole);
    // Auto-update default tabs and default permissions
    const defaultPerms = getDefaultPermissionsForRole(newRole);
    setActionPermissions(defaultPerms);
    
    // Auto-update tabs
    if (newRole === 'super_admin' || newRole === 'admin' || newRole === 'director') {
      setSelectedTabs(AVAILABLE_TABS.map(t => t.id));
    } else if (newRole === 'finance') {
      setSelectedTabs(['dashboard', 'returns', 'commissions', 'report']);
    } else {
      // operator
      setSelectedTabs(['dashboard', 'invoice', 'customers', 'shoes']);
    }
  };

  const handleToggleTabPermission = (tabId: string) => {
    if (selectedTabs.includes(tabId)) {
      setSelectedTabs(selectedTabs.filter(id => id !== tabId));
      // Auto-turn off all action permissions under this tab
      const actionsToDisable = TAB_ACTIONS_MAP[tabId] || [];
      setActionPermissions(prev => {
        const next = { ...prev };
        actionsToDisable.forEach(act => {
          next[act] = false;
        });
        return next;
      });
    } else {
      setSelectedTabs([...selectedTabs, tabId]);
      // Auto-turn on all action permissions under this tab to make configuration easy
      const actionsToEnable = TAB_ACTIONS_MAP[tabId] || [];
      setActionPermissions(prev => {
        const next = { ...prev };
        actionsToEnable.forEach(act => {
          next[act] = true;
        });
        return next;
      });
    }
  };

  const handleToggleActionPermission = (actionId: keyof AppUserPermissions) => {
    setActionPermissions(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));
  };

  const handleSelectAllEverything = () => {
    setSelectedTabs(AVAILABLE_TABS.map(t => t.id));
    setActionPermissions({
      canCreateInvoice: true,
      canEditInvoice: true,
      canDeleteInvoice: true,
      canPayInvoice: true,
      canProcessReturn: true,
      canManageMasterData: true,
      canManageSalesman: true,
      canPayCommission: true,
      canEditCommissionRate: true,
      canManageSuratJalan: true,
      canManagePaymentProof: true,
      canManageInstallments: true,
      canEditSettings: true,
      canClearLogs: true,
    });
  };

  const handleClearAllEverything = () => {
    setSelectedTabs([]);
    setActionPermissions({
      canCreateInvoice: false,
      canEditInvoice: false,
      canDeleteInvoice: false,
      canPayInvoice: false,
      canProcessReturn: false,
      canManageMasterData: false,
      canManageSalesman: false,
      canPayCommission: false,
      canEditCommissionRate: false,
      canManageSuratJalan: false,
      canManagePaymentProof: false,
      canManageInstallments: false,
      canEditSettings: false,
      canClearLogs: false,
    });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedName) {
      setFormError('Username dan Nama harus diisi.');
      return;
    }

    if (!editingUser && !trimmedPassword) {
      setFormError('Password harus diisi untuk pengguna baru.');
      return;
    }

    // Check for duplicate username
    const duplicate = users.find(u => u.username.toLowerCase() === trimmedUsername && (!editingUser || u.id !== editingUser.id));
    if (duplicate) {
      setFormError('Username sudah digunakan oleh akun lain.');
      return;
    }

    if (editingUser) {
      // Prevent editing yourself to remove super_admin status
      if (editingUser.id === currentUser?.id && role !== 'super_admin') {
        setFormError('Anda tidak bisa menurunkan status role Super Admin Anda sendiri.');
        return;
      }

      onUpdateUser({
        ...editingUser,
        username: trimmedUsername,
        password: trimmedPassword || editingUser.password, // Keep old if empty
        name: trimmedName,
        role,
        allowedTabs: selectedTabs,
        permissions: actionPermissions
      });
      showToast("Data akun pengguna berhasil diperbarui!", "success");
    } else {
      onAddUser({
        id: `user-${Date.now()}`,
        username: trimmedUsername,
        password: trimmedPassword,
        name: trimmedName,
        role,
        allowedTabs: selectedTabs,
        permissions: actionPermissions,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      });
      showToast("Akun pengguna berhasil dibuat!", "success");
    }

    setIsFormOpen(false);
  };

  const getRoleBadge = (userRole: AppUser['role']) => {
    switch (userRole) {
      case 'director':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-100">
            <Crown className="w-3 h-3 text-purple-500" />
            Direktur / Bos
          </span>
        );
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-100">
            <ShieldAlert className="w-3 h-3 text-rose-500" />
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">
            <ShieldCheck className="w-3 h-3 text-indigo-500" />
            Admin
          </span>
        );
      case 'finance':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100">
            <Coins className="w-3 h-3 text-amber-500" />
            Bagian Keuangan
          </span>
        );
      case 'operator':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
            <User className="w-3 h-3 text-slate-400" />
            Operator/Staff
          </span>
        );
    }
  };

  return (
    <div id="user-manager-container" className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5.5 h-5.5 text-indigo-600" />
            Kelola Pengguna Aplikasi
          </h2>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Buat, ubah, dan kelola kredensial login akun pengguna untuk operasional sistem secara terpusat.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-sm shadow-indigo-100"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Pengguna Baru
        </button>
      </div>

      {/* Main List Box */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Search Bar / Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-9 pr-4 py-1.5 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 font-medium"
            />
          </div>
          
          <div className="text-right text-[11px] text-slate-400 font-bold">
            Total terdaftar: <b className="text-slate-800 font-mono text-xs">{users.length}</b> user
          </div>
        </div>

        {/* User List Grid/Cards */}
        <div className="p-5">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              Tidak ada data pengguna yang ditemukan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => {
                const isActiveUser = user.id === currentUser?.id;
                const isPrimaryAdmin = user.username === 'admin';

                return (
                  <div 
                    key={user.id}
                    className={`border p-5 rounded-2xl relative flex flex-col justify-between transition ${
                      isActiveUser 
                        ? 'border-indigo-200 bg-indigo-50/10' 
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      {/* Top status */}
                      <div className="flex items-center justify-between mb-3">
                        {getRoleBadge(user.role)}
                        {isActiveUser && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-bold">
                            Akun Anda
                          </span>
                        )}
                      </div>

                      {/* Info Block */}
                      <h3 className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                        {user.name}
                      </h3>
                      
                      <div className="text-[11px] text-slate-500 space-y-1 mt-2.5 pt-2.5 border-t border-slate-100 font-medium">
                        <p className="flex justify-between">
                          <span>Username:</span> 
                          <b className="text-slate-800 font-mono text-xs font-bold">{user.username}</b>
                        </p>
                        <p className="flex justify-between">
                          <span>Password:</span> 
                          <span className="text-slate-800 font-mono text-xs font-black">••••••••</span>
                        </p>
                        <p className="flex justify-between text-[10px]">
                          <span>Terdaftar:</span> 
                          <span className="text-slate-400 font-mono">{user.createdAt}</span>
                        </p>
                      </div>

                      {/* Menu Permissions list */}
                      <div className="mt-3.5 pt-3 border-t border-dashed border-slate-100">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Akses Menu Diizinkan:</span>
                        {user.role === 'super_admin' ? (
                          <span className="inline-flex text-[10px] bg-rose-50/50 text-rose-700 font-bold px-2 py-0.5 rounded-md border border-rose-100/50">
                            Semua Menu Utama (Akses Penuh)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                            {(!user.allowedTabs || user.allowedTabs.length === 0) ? (
                              <span className="text-[10px] text-slate-400 italic font-bold">Tidak ada menu diizinkan</span>
                            ) : user.allowedTabs.length === AVAILABLE_TABS.length ? (
                              <span className="inline-flex text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                                Semua Menu Diizinkan
                              </span>
                            ) : (
                              AVAILABLE_TABS.filter(t => user.allowedTabs?.includes(t.id)).map(t => (
                                <span key={t.id} className="inline-flex text-[9px] bg-slate-100 text-slate-600 font-black px-1.5 py-0.5 rounded-md border border-slate-200/40">
                                  {t.name}
                                </span>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action-level Permissions list */}
                      <div className="mt-3 pt-3 border-t border-dashed border-slate-100">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Aksi Diizinkan:</span>
                        {user.role === 'super_admin' ? (
                          <span className="inline-flex text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                            Semua Tindakan Utama Diizinkan
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                            {(() => {
                              const allowedActions = AVAILABLE_ACTIONS.filter(action => {
                                return user.permissions 
                                  ? user.permissions[action.id] 
                                  : getDefaultPermissionsForRole(user.role)[action.id];
                              });

                              if (allowedActions.length === 0) {
                                return (
                                  <span className="text-[10px] text-rose-500 italic font-bold">Seluruh aksi dilarang</span>
                                );
                              }

                              return allowedActions.map(action => (
                                <span key={action.id} className="inline-flex text-[9px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded-md border border-indigo-150/40">
                                  {action.name}
                                </span>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center justify-end gap-1.5 mt-5 pt-3.5 border-t border-slate-50">
                      {deletingUserId === user.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-xl animate-pulse w-full justify-between">
                          <span className="text-[9px] text-rose-700 font-black">Hapus permanen?</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                onDeleteUser(user.id);
                                setDeletingUserId(null);
                                showToast("Akun pengguna berhasil dihapus!", "success");
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black cursor-pointer border-none shadow-xs"
                            >
                              Ya
                            </button>
                            <button
                              onClick={() => setDeletingUserId(null)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-black cursor-pointer border-none"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50/50 rounded-xl transition cursor-pointer font-bold border-none"
                          >
                            <Edit2 className="w-3 h-3" />
                            Ubah
                          </button>

                          {/* Primary Admin & Active logged-in user cannot be deleted */}
                          {!isPrimaryAdmin && !isActiveUser ? (
                            <button
                              onClick={() => setDeletingUserId(user.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50/50 rounded-xl transition cursor-pointer font-bold border-none"
                            >
                              <Trash2 className="w-3 h-3" />
                              Hapus
                            </button>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-300 bg-slate-50 rounded-xl font-bold cursor-not-allowed border-none"
                              title={isPrimaryAdmin ? 'Super Admin utama tidak dapat dihapus.' : 'Anda sedang menggunakan akun ini.'}
                            >
                              <Trash2 className="w-3 h-3" />
                              Hapus
                            </span>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Add / Edit Dialog Modal Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                {editingUser ? 'Ubah Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
              
              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-black uppercase tracking-wider">Nama Lengkap <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Andi Wijaya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-black uppercase tracking-wider">Username Login <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  disabled={!!editingUser && editingUser.username === 'admin'}
                  placeholder="Contoh: andiwijaya"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 text-sm font-bold font-mono"
                />
                {editingUser && editingUser.username === 'admin' && (
                  <span className="text-[10px] text-slate-400 mt-1 block">Username admin utama bersifat permanen.</span>
                )}
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-black uppercase tracking-wider">
                  Password {editingUser && <span className="text-slate-400 font-medium">(Isi hanya jika ingin mengubah)</span>} {!editingUser && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Min. 4 karakter'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 pl-3.5 pr-10 py-2 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 text-sm font-bold font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer border-none bg-transparent"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[11px] font-black uppercase tracking-wider">Hak Akses / Role <span className="text-rose-500">*</span></label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as any)}
                  disabled={editingUser?.id === currentUser?.id}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 text-sm font-bold"
                >
                  <option value="operator">Operator / Staff Input</option>
                  <option value="finance">Bagian Keuangan (Finance)</option>
                  <option value="admin">Administrator</option>
                  <option value="director">Direktur / Bos</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                {editingUser?.id === currentUser?.id && (
                  <span className="text-[10px] text-amber-600 mt-1 block font-bold">Anda tidak dapat mengubah status role Anda sendiri saat ini.</span>
                )}
              </div>

              {role !== 'super_admin' && (
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-500 text-[11px] font-black uppercase tracking-wider">
                      Hak Akses Per Fitur & Menu <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={handleSelectAllEverything}
                        className="text-[10px] text-indigo-600 hover:underline font-bold bg-none border-none p-0 cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300 text-[10px]">|</span>
                      <button 
                        type="button" 
                        onClick={handleClearAllEverything}
                        className="text-[10px] text-slate-500 hover:underline font-bold bg-none border-none p-0 cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-3 space-y-3 max-h-80 overflow-y-auto">
                    {AVAILABLE_TABS.map((tab) => {
                      const isTabChecked = selectedTabs.includes(tab.id);
                      const tabActionIds = TAB_ACTIONS_MAP[tab.id] || [];
                      const associatedActions = AVAILABLE_ACTIONS.filter(act => tabActionIds.includes(act.id));
                      
                      return (
                        <div key={tab.id} className="space-y-1.5 pb-2 last:pb-0 border-b border-slate-150/40 last:border-b-0">
                          {/* Tab Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleTabPermission(tab.id)}
                            className="w-full text-left flex items-center gap-2.5 hover:bg-slate-100 p-1 rounded-lg transition group border-none bg-transparent cursor-pointer"
                          >
                            {isTabChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                            )}
                            <span className={`text-xs font-black uppercase tracking-wider ${isTabChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                              {tab.name}
                            </span>
                          </button>

                          {/* Indented Action Checkboxes */}
                          {associatedActions.length > 0 && (
                            <div className={`pl-6 ml-2 pt-1 space-y-1.5 border-l-2 border-slate-200 transition-all ${isTabChecked ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                              {associatedActions.map((action) => {
                                const isActionChecked = !!actionPermissions[action.id];
                                return (
                                  <button
                                    key={action.id}
                                    type="button"
                                    disabled={!isTabChecked}
                                    onClick={() => handleToggleActionPermission(action.id)}
                                    className="w-full text-left flex items-start gap-2 hover:bg-slate-100/80 p-1.5 rounded-lg transition group border-none bg-transparent cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    {isActionChecked && isTabChecked ? (
                                      <CheckSquare className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 mt-0.5 text-slate-350 shrink-0" />
                                    )}
                                    <div className="flex flex-col">
                                      <span className={`text-xs font-bold ${isActionChecked && isTabChecked ? 'text-slate-800' : 'text-slate-450'}`}>
                                        {action.name}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                                        {action.desc}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed font-medium">
                    Atur izin menu utama beserta aksi-aksi spesifik di dalamnya. Menonaktifkan menu utama akan otomatis menonaktifkan seluruh aksi di dalam menu tersebut.
                  </span>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-bold">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition cursor-pointer border-none"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition cursor-pointer border-none shadow-xs"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat Pengguna'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
