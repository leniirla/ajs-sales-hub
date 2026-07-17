/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ActivityLog, AppUserPermissions } from '../types';
import { 
  Clock, 
  Trash2, 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Layers,
  Activity,
  CheckCircle,
  FileText,
  Users,
  Package,
  Coins,
  Settings,
  XCircle,
  TrendingDown
} from 'lucide-react';
import { formatCurrency, exportToExcel, showConfirm, showToast } from '../utils';

interface HistoryManagerProps {
  logs: ActivityLog[];
  onClearLogs: () => void;
  onRefreshLogs: () => void;
  hasActionAccess?: (actionId: keyof AppUserPermissions) => boolean;
}

export default function HistoryManager({
  logs,
  onClearLogs,
  onRefreshLogs,
  hasActionAccess
}: HistoryManagerProps) {
  const canClear = hasActionAccess ? hasActionAccess('canClearLogs') : true;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter & Search Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchAction = selectedActionType === 'all' || log.actionType === selectedActionType;
      const matchCategory = selectedCategory === 'all' || log.category === selectedCategory;

      return matchSearch && matchAction && matchCategory;
    });
  }, [logs, searchTerm, selectedActionType, selectedCategory]);

  // Page Calculations
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const creates = logs.filter(l => l.actionType === 'create').length;
    const updates = logs.filter(l => l.actionType === 'update').length;
    const deletes = logs.filter(l => l.actionType === 'delete').length;
    const payments = logs.filter(l => l.actionType === 'payment').length;

    return { total, creates, updates, deletes, payments };
  }, [logs]);

  const handleExportExcel = () => {
    const exportData = filteredLogs.map((log, index) => ({
      'No': index + 1,
      'Waktu Kegiatan': log.timestamp,
      'Tipe Aksi': log.actionType.toUpperCase(),
      'Kategori': log.category.toUpperCase(),
      'Deskripsi': log.description,
      'Detail Tambahan': log.details || '-'
    }));

    exportToExcel(`History_Kegiatan_User_${new Date().toISOString().substring(0, 10)}`, [
      { name: 'History Kegiatan', data: exportData }
    ]);
  };

  // Helper for category icon and colors
  const getCategoryMeta = (category: ActivityLog['category']) => {
    switch (category) {
      case 'invoice':
        return { icon: FileText, bg: 'bg-blue-50 text-blue-700 border-blue-100', label: 'Faktur' };
      case 'customer':
        return { icon: Users, bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Pelanggan' };
      case 'product':
        return { icon: Package, bg: 'bg-amber-50 text-amber-700 border-amber-100', label: 'Produk/Sepatu' };
      case 'salesman':
        return { icon: Users, bg: 'bg-violet-50 text-violet-700 border-violet-100', label: 'Salesman' };
      case 'return':
        return { icon: TrendingDown, bg: 'bg-rose-50 text-rose-700 border-rose-100', label: 'Retur' };
      case 'commission':
        return { icon: Coins, bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', label: 'Komisi' };
      case 'settings':
        return { icon: Settings, bg: 'bg-slate-50 text-slate-700 border-slate-100', label: 'Pengaturan' };
      default:
        return { icon: Activity, bg: 'bg-slate-50 text-slate-700 border-slate-100', label: 'Sistem' };
    }
  };

  const getActionTypeMeta = (action: ActivityLog['actionType']) => {
    switch (action) {
      case 'create':
        return { label: 'Tambah Baru', badge: 'bg-green-100 text-green-800' };
      case 'update':
        return { label: 'Perubahan', badge: 'bg-amber-100 text-amber-800' };
      case 'delete':
        return { label: 'Penghapusan', badge: 'bg-rose-100 text-rose-800' };
      case 'payment':
        return { label: 'Pembayaran', badge: 'bg-emerald-100 text-emerald-800' };
      default:
        return { label: 'Lainnya', badge: 'bg-slate-100 text-slate-800' };
    }
  };

  return (
    <div id="history-manager-container" className="space-y-6 animate-fade-in">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            History Kegiatan User
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Mencatat seluruh aksi kegiatan user saat menginput data baru, mengubah data, melunasi tagihan, meretur pesanan, dan menghapus data.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            onClick={onRefreshLogs}
            className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 rounded-xl transition cursor-pointer"
            title="Muat Ulang History"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
          
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer border border-transparent shrink-0 shadow-xs"
          >
            <Download className="w-4 h-4" />
            Ekspor History
          </button>

          {canClear && (
            <button
              onClick={() => {
                showConfirm(
                  'Apakah Anda yakin ingin menghapus seluruh catatan history kegiatan user? Tindakan ini permanen.',
                  () => {
                    onClearLogs();
                    showToast('Catatan history kegiatan user berhasil dibersihkan!', 'success');
                  }
                );
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black transition cursor-pointer shrink-0 animate-in fade-in duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Bersihkan History
            </button>
          )}
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl">
          <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Total Kegiatan</span>
          <span className="block text-xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
            {stats.total}
          </span>
          <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Semua history terekam</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl">
          <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Input Data</span>
          <span className="block text-xl font-black text-green-700 font-mono tracking-tight mt-0.5">
            {stats.creates}
          </span>
          <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Aksi tambah data baru</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl">
          <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Ubah Data</span>
          <span className="block text-xl font-black text-amber-700 font-mono tracking-tight mt-0.5">
            {stats.updates}
          </span>
          <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Aksi edit/modifikasi</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl">
          <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Pelunasan / Bayar</span>
          <span className="block text-xl font-black text-emerald-700 font-mono tracking-tight mt-0.5">
            {stats.payments}
          </span>
          <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Transaksi lunas</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl col-span-2 md:col-span-1">
          <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Hapus Data</span>
          <span className="block text-xl font-black text-rose-700 font-mono tracking-tight mt-0.5">
            {stats.deletes}
          </span>
          <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Aksi penghapusan data</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari aktivitas, nama pelanggan, no faktur..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition"
            />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <select
              value={selectedActionType}
              onChange={(e) => { setSelectedActionType(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-indigo-600 focus:bg-white cursor-pointer"
            >
              <option value="all">Semua Tipe Aksi</option>
              <option value="create">Tambah Baru (Create)</option>
              <option value="update">Perubahan (Update)</option>
              <option value="delete">Penghapusan (Delete)</option>
              <option value="payment">Pembayaran (Payment)</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-indigo-600 focus:bg-white cursor-pointer"
            >
              <option value="all">Semua Modul / Kategori</option>
              <option value="invoice">Faktur Penjualan</option>
              <option value="customer">Database Pelanggan</option>
              <option value="product">Database Produk</option>
              <option value="salesman">Salesman / Agen</option>
              <option value="return">Retur Penjualan</option>
              <option value="commission">Sistem Komisi</option>
              <option value="settings">Pengaturan Sistem</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-extrabold">
                <th className="py-3 px-5 text-center w-12">No</th>
                <th className="py-3 px-4 w-44">Waktu Kegiatan</th>
                <th className="py-3 px-4 w-32">Kategori</th>
                <th className="py-3 px-4 w-32">Jenis Aksi</th>
                <th className="py-3 px-4">Deskripsi Kegiatan</th>
                <th className="py-3 px-4">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium font-serif">
                    {logs.length === 0 ? 'Belum ada history kegiatan user yang terekam.' : 'Tidak ada history kegiatan cocok dengan filter pencarian.'}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, idx) => {
                  const num = (currentPage - 1) * itemsPerPage + idx + 1;
                  const categoryMeta = getCategoryMeta(log.category);
                  const actionMeta = getActionTypeMeta(log.actionType);
                  const CatIcon = categoryMeta.icon;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/45 transition">
                      <td className="py-4 px-5 text-center font-bold font-mono text-slate-400">{num}</td>
                      <td className="py-4 px-4 font-mono text-slate-500 font-medium whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${categoryMeta.bg}`}>
                          <CatIcon className="w-3 h-3" />
                          {categoryMeta.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${actionMeta.badge}`}>
                          {actionMeta.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-black text-slate-900 leading-normal max-w-sm">
                        {log.description}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium leading-relaxed max-w-md">
                        {log.details ? (
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-150 font-mono text-[10px] max-h-24 overflow-y-auto whitespace-pre-line text-slate-600">
                            {log.details}
                          </div>
                        ) : (
                          <span className="text-slate-350 italic text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan {Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredLogs.length, currentPage * itemsPerPage)} dari {filteredLogs.length} history kegiatan
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-black px-2 text-slate-800">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
