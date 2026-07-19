/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Invoice, Customer, AppUserPermissions, InvoicePayment, PaymentProof, SystemSettings } from '../types';
import { formatCurrency, exportToExcel, showToast } from '../utils';
import { Download, Search, Eye, Filter, Trash2, TrendingUp, ShoppingBag, Box, ChevronRight, AlertTriangle, X, Pencil, Printer, ShieldAlert, RefreshCw, Inbox, History, CreditCard, Upload, Camera, Paperclip, Wallet } from 'lucide-react';
import { exportToPdf } from '../utils/pdfExport';
import { printViaBrowser } from '../utils/print';
import CameraModal from './CameraModal';

interface SalesReportProps {
  invoices: Invoice[];
  onViewInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onSetInvoiceStatus: (id: string, status: 'paid' | 'unpaid') => void;
  onUpdateInvoices: (invoices: Invoice[]) => void;
  onEditInvoice: (invoice: Invoice) => void;
  hasActionAccess?: (actionId: keyof AppUserPermissions) => boolean;
  settings?: SystemSettings;
}

export default function SalesReport({
  invoices,
  onViewInvoice,
  onDeleteInvoice,
  onSetInvoiceStatus,
  onUpdateInvoices,
  onEditInvoice,
  hasActionAccess = () => true,
  settings,
}: SalesReportProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoiceIdToDelete, setInvoiceIdToDelete] = useState<string | null>(null);
  const [historyInvoiceId, setHistoryInvoiceId] = useState<string | null>(null);
  const [historyModalTab, setHistoryModalTab] = useState<'riwayat' | 'bukti'>('riwayat');
  const [editingPayment, setEditingPayment] = useState<{ id: string; amount: string; date: string; note: string; proofs: PaymentProof[] } | null>(null);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState<string | null>(null);
  const [isPaymentCameraOpen, setIsPaymentCameraOpen] = useState(false);
  const [editingDpInvoiceId, setEditingDpInvoiceId] = useState<string | null>(null);
  const [editingDpProofs, setEditingDpProofs] = useState<PaymentProof[]>([]);
  const [isDpCameraOpen, setIsDpCameraOpen] = useState(false);
  const canManageInstallments = hasActionAccess('canManageInstallments');

  const openEditDpProof = (invoice: Invoice) => {
    setEditingDpInvoiceId(invoice.id);
    setEditingDpProofs(invoice.dpProofs || []);
  };

  const closeEditDpProof = () => {
    setEditingDpInvoiceId(null);
    setEditingDpProofs([]);
  };

  const handleAddDpProofFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = reader.result as string;
      setEditingDpProofs((prev) => [...prev, { url: img, description: '' }]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDpProof = (index: number) => {
    setEditingDpProofs((prev) => prev.filter((_, i) => i !== index));
  };

  const saveDpProof = () => {
    if (!editingDpInvoiceId) return;
    onUpdateInvoices(
      invoices.map((inv) =>
        inv.id === editingDpInvoiceId ? { ...inv, dpProofs: editingDpProofs } : inv
      )
    );
    showToast('Bukti Uang Muka (DP) berhasil diperbarui!', 'success');
    closeEditDpProof();
  };

  const openEditPayment = (p: InvoicePayment) => {
    setEditingPayment({ id: p.id, amount: String(p.amount), date: p.date, note: p.note || '', proofs: p.proofs || [] });
  };

  const closeEditPayment = () => setEditingPayment(null);

  const handleAddPaymentProofFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = reader.result as string;
      setEditingPayment((prev) => prev ? { ...prev, proofs: [...prev.proofs, { url: img, description: '' }] } : prev);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePaymentProof = (index: number) => {
    setEditingPayment((prev) => prev ? { ...prev, proofs: prev.proofs.filter((_, i) => i !== index) } : prev);
  };

  const saveEditPayment = () => {
    if (!editingPayment || !historyInvoiceId) return;
    const amt = parseFloat(editingPayment.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Jumlah pembayaran harus lebih besar dari 0!', 'error');
      return;
    }
    const targetInvoice = invoices.find((inv) => inv.id === historyInvoiceId);
    if (!targetInvoice) return;
    const updatedPayments = (targetInvoice.payments || []).map((p) =>
      p.id === editingPayment.id
        ? { ...p, amount: amt, date: editingPayment.date, note: editingPayment.note.trim(), proofs: editingPayment.proofs }
        : p
    );
    const newTotalPaid = (targetInvoice.dpAmount || 0) + updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = Math.max(0, targetInvoice.totalAmount - newTotalPaid);
    onUpdateInvoices(
      invoices.map((inv) =>
        inv.id === historyInvoiceId
          ? { ...inv, payments: updatedPayments, status: newRemaining <= 0 ? 'paid' : 'unpaid', remainingBalance: newRemaining }
          : inv
      )
    );
    showToast('Riwayat cicilan berhasil diperbarui!', 'success');
    closeEditPayment();
  };

  const confirmDeletePayment = () => {
    if (!paymentIdToDelete || !historyInvoiceId) return;
    const targetInvoice = invoices.find((inv) => inv.id === historyInvoiceId);
    if (!targetInvoice) return;
    const updatedPayments = (targetInvoice.payments || []).filter((p) => p.id !== paymentIdToDelete);
    const newTotalPaid = (targetInvoice.dpAmount || 0) + updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = Math.max(0, targetInvoice.totalAmount - newTotalPaid);
    onUpdateInvoices(
      invoices.map((inv) =>
        inv.id === historyInvoiceId
          ? { ...inv, payments: updatedPayments, status: newRemaining <= 0 ? 'paid' : 'unpaid', remainingBalance: newRemaining }
          : inv
      )
    );
    showToast('Riwayat cicilan berhasil dihapus!', 'success');
    setPaymentIdToDelete(null);
  };

  // States for formatted PDF Print Preview
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printLayout, setPrintLayout] = useState<'both' | 'summary' | 'detail' | 'piutang'>('both');
  const [isExporting, setIsExporting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfFormat, setPdfFormat] = useState<'a4' | 'a5' | 'letter' | 'legal' | 'f4'>('a4');
  const [pendingPrintLayout, setPendingPrintLayout] = useState<'both' | 'summary' | 'detail' | 'piutang'>('both');

  // Computations Metrics
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.notes && inv.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesType =
      filterType === 'all' || inv.customerType === filterType;

    const matchesStatus =
      filterStatus === 'all' || inv.status === filterStatus;

    const matchesDate =
      (!startDate || inv.date >= startDate) &&
      (!endDate || inv.date <= endDate);

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPairsSold = filteredInvoices.reduce((sum, inv) => sum + inv.totalPairs, 0);
  const totalPackingFees = filteredInvoices.reduce((sum, inv) => sum + inv.packingFee, 0);
  const totalKolis = filteredInvoices.reduce((sum, inv) => sum + inv.koliCount, 0);
  const totalPiutang = filteredInvoices.reduce((sum, inv) => {
    if (inv.status === 'paid') return sum;
    const remaining = inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.dpAmount || 0);
    return sum + Math.max(0, remaining);
  }, 0);
  const totalUangMasuk = totalRevenue - totalPiutang;

  // Bulk Excel Report Download containing complete broken down records
  const handleExportSalesReportExcel = () => {
    // Generate Flat report for Pivot tables (Row per Invoice Item)
    const flatItemsData = [];
    let itemId = 1;

    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        flatItemsData.push({
          'ID Faktur': inv.id,
          'Nomor Faktur': inv.invoiceNumber,
          'Tanggal': inv.date,
          'Nama Pelanggan': inv.customerName,
          'Nama Barang': item.productName,
          'Ukuran/Size': item.size,
          'Kuantitas (Pasang)': item.quantity,
          'Harga Dasar (Rp)': item.negotiatedBasePrice,
          'Tambahan Size Besar (Rp)': item.sizeSurcharge,
          'Harga Satuan (Rp)': item.unitPrice,
          'Total Penjualan Barang (Rp)': item.totalPrice,
          'Packing Kayu': inv.wantsPacking ? 'Ya' : 'Tidak',
          'Jumlah Koli': inv.koliCount,
          'Proporsi Biaya Packing (Rp)': inv.wantsPacking ? (inv.packingFee / inv.items.length) : 0,
          'Tarif Pajak PPN (%)': inv.taxRate || 0,
          'Jumlah Pajak PPN (Rp)': inv.ppnAmount || 0,
          'Ongkos Kirim/Ongkir (Rp)': inv.hasOngkir ? (inv.ongkirAmount || 0) : 0,
          'Uang Muka/DP (Rp)': inv.dpAmount || 0,
          'Sisa Tagihan (Rp)': inv.status === 'paid' ? 0 : (inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.dpAmount || 0))),
          'Status Pembayaran': inv.status === 'paid' ? 'Lunas' : 'Belum Lunas',
          'Catatan': inv.notes || '',
        });
      });
    });

    // Generate Invoice Summary Tab
    const summaryData = filteredInvoices.map((inv, index) => ({
      'No': index + 1,
      'Nomor Faktur': inv.invoiceNumber,
      'Tanggal': inv.date,
      'Nama Pelanggan': inv.customerName,
      'Total Pasang': inv.totalPairs,
      'Subtotal Sepatu (Rp)': inv.subtotal,
      'Biaya Packing (Rp)': inv.packingFee,
      'Biaya Ongkir (Rp)': inv.hasOngkir ? (inv.ongkirAmount || 0) : 0,
      'Tarif PPN (%)': inv.taxRate || 0,
      'Jumlah PPN (Rp)': inv.ppnAmount || 0,
      'Total Jumlah Akhir (Rp)': inv.totalAmount,
      'Uang Muka/DP (Rp)': inv.dpAmount || 0,
      'Sisa Tagihan (Rp)': inv.status === 'paid' ? 0 : (inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.dpAmount || 0))),
      'Status': inv.status === 'paid' ? 'Lunas' : 'Belum Lunas',
      'Koli Hantaran': inv.koliCount,
    }));

    exportToExcel('Laporan_Penjualan_Sepatu', [
      { name: 'Detail Transaksi Barang', data: flatItemsData },
      { name: 'Ringkasan Faktur Pajak', data: summaryData },
    ]);
  };

  const handlePrintPDF = () => {
    setShowPrintPreview(true);
  };

  const handlePerformPrint = (layoutToPrint: 'both' | 'summary' | 'detail' | 'piutang') => {
    setPendingPrintLayout(layoutToPrint);
    if (settings?.printMode === 'browser') {
      printViaBrowser('printing-report');
      return;
    }
    setShowPrintModal(true);
  };

  return (
    <div id="sales-report-container" className="space-y-6">
      
      {/* Metrics Card list */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Akumulasi Omset</span>
            <span className="p-1 px-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">IDR</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 font-mono">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Total pendapatan bersih terhitung</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Uang Masuk</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono">
            {formatCurrency(totalUangMasuk)}
          </div>
          <p className="text-[10px] text-rose-500 mt-1 font-semibold">Piutang: {formatCurrency(totalPiutang)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Pasang Terjual</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 font-mono">
            {totalPairsSold} Psg
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Total volume penyaluran logistik</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Koli Packing</span>
            <Box className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 font-mono">
            {totalKolis} Koli
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Karton koli boks didistribusikan</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Omset Packing</span>
            <span className="text-xs font-semibold text-slate-400">Total</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 font-mono">
            {formatCurrency(totalPackingFees)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Pendapatan sewa kayu per koli</p>
        </div>
      </div>

      {/* Controllers/Filters Board */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            Filter Laporan Penjualan
          </h3>

          <div className="flex flex-wrap gap-2 items-center print:hidden">
            <button
              type="button"
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak PDF Laporan</span>
            </button>

            <button
              onClick={handleExportSalesReportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {/* Text search */}
          <div className="sm:col-span-1 lg:col-span-2 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Nomor Faktur / Konsumen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Status dropdown */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="all">Semua Status Bayar</option>
              <option value="paid">Lunas</option>
              <option value="unpaid">Belum Lunas</option>
            </select>
          </div>

          {/* Date range picker */}
          <div className="sm:col-span-1 flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px]"
              title="Dari tanggal"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px]"
              title="Ke tanggal"
            />
          </div>
        </div>
      </div>

      <div className="sm:hidden text-center text-[10px] text-indigo-700 bg-indigo-50/50 py-1.5 px-2 rounded-lg font-semibold select-none">
        ← Geser ke samping untuk scroll riwayat transaksi lengkap →
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">No. Faktur</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-4">Konsumen</th>
                <th className="py-3 px-3 text-center">Volume (Psg)</th>
                <th className="py-3 px-3 text-center">Koli</th>
                <th className="py-3 px-4 text-right">Total Transaksi</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-semibold text-indigo-600 font-mono">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500">{inv.date}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{inv.customerName}</div>
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold">{inv.totalPairs} pasang</td>
                  <td className="py-3.5 px-3 text-center">
                    {inv.wantsPacking ? (
                      <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                        {inv.koliCount} Koli
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    <div className="font-bold text-slate-800">
                      {formatCurrency(inv.totalAmount)}
                    </div>
                    {inv.dpAmount !== undefined && inv.dpAmount > 0 && (
                      <div className="text-[10px] text-amber-700 font-medium">
                        DP: {formatCurrency(inv.dpAmount)} <span className="text-slate-300">|</span> Sisa: {formatCurrency(inv.status === 'paid' ? 0 : (inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - inv.dpAmount))}
                      </div>
                    )}
                  </td>
                   <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}
                    >
                      {inv.status === 'paid' ? 'Lunas' : 'Belum Lunas'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex justify-center gap-1.5">
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded text-[11px] transition cursor-pointer"
                        title="Tinjau Slip"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Slip
                      </button>
                      <button
                        onClick={() => {
                          setHistoryModalTab('riwayat');
                          setHistoryInvoiceId(inv.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-[11px] transition cursor-pointer"
                        title="Lihat Riwayat Pembayaran & Cicilan (Preview)"
                      >
                        <History className="w-3.5 h-3.5" />
                        Riwayat
                      </button>
                      {(() => {
                        const canEdit = hasActionAccess('canEditInvoice');
                        return (
                          <button
                            disabled={!canEdit}
                            onClick={() => {
                              if (canEdit) {
                                onEditInvoice(inv);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition ${
                              canEdit
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-750 font-medium cursor-pointer'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed font-medium'
                            }`}
                            title={canEdit ? 'Perbaiki / Edit Faktur' : 'Akses Dibatasi: Anda tidak memiliki izin mengubah faktur'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        );
                      })()}
                      {(() => {
                        const canDelete = hasActionAccess('canDeleteInvoice');
                        return (
                          <button
                            disabled={!canDelete}
                            onClick={() => {
                              if (canDelete) {
                                setInvoiceIdToDelete(inv.id);
                              }
                            }}
                            className={`p-1.5 rounded transition duration-150 ${
                              canDelete
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                                : 'text-slate-200 cursor-not-allowed'
                            }`}
                            title={canDelete ? 'Hapus Faktur' : 'Akses Dibatasi: Anda tidak memiliki izin menghapus faktur'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada data penjualan yang cocok dengan filter aktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
            </div>
          </div>

      {/* Delete Confirmation Modal */}
      {invoiceIdToDelete && invoices.find(inv => inv.id === invoiceIdToDelete) && (() => {
        const selectedInvoiceToDelete = invoices.find(inv => inv.id === invoiceIdToDelete)!;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Hapus Faktur Penjualan?</h3>
                    <p className="text-xs text-slate-500 font-medium">Ini adalah tindakan permanen</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-semibold">Nomor Faktur:</span>
                    <span className="font-mono font-bold text-indigo-600">{selectedInvoiceToDelete.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-semibold">Pelanggan:</span>
                    <span className="font-bold text-slate-800">{selectedInvoiceToDelete.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-semibold">Total Nilai:</span>
                    <span className="font-bold text-slate-950 font-mono">{formatCurrency(selectedInvoiceToDelete.totalAmount)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Apakah Anda benar-benar yakin ingin menghapus faktur ini? Semua data terkait transaksi ini akan dihapus secara permanen dari sistem serta laporan rekaman penjualan.
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setInvoiceIdToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition duration-150 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteInvoice(invoiceIdToDelete);
                    setInvoiceIdToDelete(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 hover:shadow-md transition duration-150 cursor-pointer"
                >
                  Ya, Hapus Permanen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Riwayat Pembayaran & Cicilan — preview modal (read-only) */}
      {historyInvoiceId && invoices.find(inv => inv.id === historyInvoiceId) && (() => {
        const historyInvoice = invoices.find(inv => inv.id === historyInvoiceId)!;
        const proofs = historyInvoice.paymentProofUrls || (historyInvoice.paymentProofUrl ? [historyInvoice.paymentProofUrl] : []);
        const payments = historyInvoice.payments || [];
        const totalPaidFromPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        // Status "Lunas" selalu jadi acuan utama — jaga-jaga untuk faktur lama yang belum punya
        // entri riwayat pembayaran yang cocok, supaya sisa tagihan tidak salah tampil.
        const totalPaid = historyInvoice.status === 'paid' ? historyInvoice.totalAmount : (historyInvoice.dpAmount || 0) + totalPaidFromPayments;
        const computedRemainingBalance = historyInvoice.status === 'paid' ? 0 : Math.max(0, historyInvoice.totalAmount - totalPaid);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in print:hidden">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Riwayat Pembayaran & Cicilan</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryInvoiceId(null)}
                  className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="flex border-b border-slate-100 px-5 pt-3 gap-1">
                <button
                  type="button"
                  onClick={() => setHistoryModalTab('riwayat')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition cursor-pointer flex items-center gap-1.5 ${
                    historyModalTab === 'riwayat'
                      ? 'bg-indigo-50 text-indigo-700 border border-b-0 border-slate-150'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Riwayat Pembayaran
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryModalTab('bukti')}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition cursor-pointer flex items-center gap-1.5 ${
                    historyModalTab === 'bukti'
                      ? 'bg-indigo-50 text-indigo-700 border border-b-0 border-slate-150'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Bukti Transaksi ({proofs.length})
                </button>
              </div>

              {historyModalTab === 'riwayat' ? (
                <div className="flex-1 overflow-auto p-5 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Jenis Pembayaran</th>
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3 text-right">Nominal</th>
                          <th className="py-2.5 px-3">Keterangan / Catatan</th>
                          {canManageInstallments && <th className="py-2.5 px-3 text-center">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-705 font-semibold">
                        {historyInvoice.dpAmount !== undefined && historyInvoice.dpAmount > 0 && (
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 text-indigo-700 font-extrabold uppercase text-[10px] tracking-wider">Uang Muka (DP)</td>
                            <td className="py-3 px-3 text-slate-500">{historyInvoice.date}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-800">{formatCurrency(historyInvoice.dpAmount)}</td>
                            <td className="py-3 px-3 text-slate-450 italic font-normal">
                              Uang muka saat pembuatan faktur
                              {historyInvoice.dpProofs && historyInvoice.dpProofs.length > 0 && (
                                <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold not-italic" title={`${historyInvoice.dpProofs.length} bukti pembayaran terlampir`}>
                                  <Paperclip className="w-2.5 h-2.5" />
                                  {historyInvoice.dpProofs.length}
                                </span>
                              )}
                            </td>
                            {canManageInstallments && (
                              <td className="py-3 px-3">
                                <div className="flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => openEditDpProof(historyInvoice)}
                                    className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                    title="Edit Bukti Uang Muka (DP)"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        )}

                        {(() => {
                          let installmentCount = 0;
                          return payments.map((p, index) => {
                            const isSettlement = p.type === 'settlement';
                            if (!isSettlement) installmentCount += 1;
                            return (
                              <tr key={p.id || index} className="hover:bg-slate-50/50">
                                <td className={`py-3 px-3 font-extrabold uppercase text-[10px] tracking-wider ${isSettlement ? 'text-rose-700' : 'text-emerald-700'}`}>
                                  {isSettlement ? 'Lunas' : `Cicilan #${installmentCount}`}
                                </td>
                                <td className="py-3 px-3 text-slate-500">{p.date}</td>
                                <td className="py-3 px-3 text-right font-mono text-slate-800">{formatCurrency(p.amount)}</td>
                                <td className="py-3 px-3 text-slate-700">
                                  {p.method && (
                                    <span className="inline-flex px-1.5 py-0.5 mr-1.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{p.method}</span>
                                  )}
                                  {p.note || (!p.method && <span className="text-slate-400 font-normal italic">-</span>)}
                                  {p.proofs && p.proofs.length > 0 && (
                                    <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold" title={`${p.proofs.length} bukti pembayaran terlampir`}>
                                      <Paperclip className="w-2.5 h-2.5" />
                                      {p.proofs.length}
                                    </span>
                                  )}
                                </td>
                                {canManageInstallments && (
                                  <td className="py-3 px-3">
                                    <div className="flex justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => openEditPayment(p)}
                                        className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                        title="Edit Riwayat Cicilan"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPaymentIdToDelete(p.id)}
                                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                        title="Hapus Riwayat Cicilan"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          });
                        })()}

                        {historyInvoice.status === 'paid' && Math.max(0, historyInvoice.totalAmount - (historyInvoice.dpAmount || 0) - totalPaidFromPayments) > 0 && (
                          <tr className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 text-rose-700 font-extrabold uppercase text-[10px] tracking-wider">Lunas</td>
                            <td className="py-3 px-3 text-slate-500">{historyInvoice.date}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-800">
                              {formatCurrency(Math.max(0, historyInvoice.totalAmount - (historyInvoice.dpAmount || 0) - totalPaidFromPayments))}
                            </td>
                            <td className="py-3 px-3 text-slate-450 italic font-normal">Faktur tercatat lunas</td>
                            {canManageInstallments && <td className="py-3 px-3"></td>}
                          </tr>
                        )}

                        {(!historyInvoice.dpAmount || historyInvoice.dpAmount === 0) && payments.length === 0 && historyInvoice.status !== 'paid' ? (
                          <tr>
                            <td colSpan={canManageInstallments ? 5 : 4} className="py-8 text-center text-slate-400 font-normal italic">
                              Belum ada riwayat pembayaran yang tercatat.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <div className="grid grid-cols-3 gap-6 text-center divide-x divide-slate-200 flex-1">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Transaksi</span>
                        <span className="text-xs font-black text-slate-900 font-mono">{formatCurrency(historyInvoice.totalAmount)}</span>
                      </div>
                      <div className="pl-4">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Terbayar</span>
                        <span className="text-xs font-black text-emerald-700 font-mono">{formatCurrency(totalPaid)}</span>
                      </div>
                      <div className="pl-4">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Sisa Tagihan</span>
                        <span className="text-xs font-black text-rose-700 font-mono">{formatCurrency(computedRemainingBalance)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center justify-center">
                      {computedRemainingBalance <= 0 ? (
                        <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Lunas (Terbayar Penuh)
                        </span>
                      ) : (
                        <span className="inline-flex px-3 py-1 bg-amber-50 text-amber-700 border border-amber-150 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Belum Lunas ({historyInvoice.totalAmount > 0 ? Math.round((totalPaid / historyInvoice.totalAmount) * 100) : 0}% Terbayar)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-5">
                  {proofs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {proofs.map((proof, index) => {
                        const p = typeof proof === 'string' ? { url: proof, description: '' } : proof;
                        return (
                          <div key={index} className="flex flex-col border border-slate-150 rounded-xl p-3 bg-slate-50/30 gap-2.5">
                            <div className="relative aspect-video w-full bg-slate-900 border border-slate-200 rounded-lg overflow-hidden shadow-3xs group">
                              <img
                                src={p.url}
                                alt={`Bukti Pembayaran #${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                              <span className="font-extrabold text-slate-500 uppercase tracking-wider">Bukti #{index + 1}</span>
                              {p.description && (
                                <span className="text-slate-500 italic text-[11px] truncate max-w-[60%]" title={p.description}>{p.description}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50 text-center">
                      <p className="text-xs text-slate-450 font-medium">Belum ada bukti transaksi yang diunggah untuk faktur ini.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-150 flex justify-end">
                <button
                  type="button"
                  onClick={() => setHistoryInvoiceId(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Riwayat Cicilan Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Edit Riwayat Cicilan</span>
              </div>
              <button
                type="button"
                onClick={closeEditPayment}
                className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-auto flex-1">
              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Jumlah Pembayaran</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingPayment.amount ? Number(editingPayment.amount).toLocaleString('id-ID') : ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value.replace(/\D/g, '') })}
                    placeholder="0"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Tanggal</label>
                <input
                  type="date"
                  value={editingPayment.date}
                  onChange={(e) => setEditingPayment({ ...editingPayment, date: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Catatan (Opsional)</label>
                <textarea
                  rows={2}
                  value={editingPayment.note}
                  onChange={(e) => setEditingPayment({ ...editingPayment, note: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 resize-none"
                />
              </div>

              <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-500 font-extrabold uppercase">
                    Bukti Pembayaran ({editingPayment.proofs.length})
                  </label>
                  <div className="flex gap-2">
                    <label className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition cursor-pointer shadow-3xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      Unggah
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAddPaymentProofFile(file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsPaymentCameraOpen(true)}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Kamera
                    </button>
                  </div>
                </div>

                {editingPayment.proofs.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {editingPayment.proofs.map((p, index) => (
                      <div key={index} className="relative aspect-video w-full bg-slate-900 border border-slate-200 rounded-lg overflow-hidden shadow-3xs group">
                        <img
                          src={p.url}
                          alt={`Bukti Pembayaran #${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePaymentProof(index)}
                            className="p-1.5 bg-white hover:bg-red-50 text-red-650 rounded-lg transition shadow cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-450 italic">Belum ada bukti pembayaran untuk cicilan ini (opsional).</p>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-150 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={closeEditPayment}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveEditPayment}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentCameraOpen && (
        <CameraModal
          onClose={() => setIsPaymentCameraOpen(false)}
          onCapture={(base64Image) => {
            setEditingPayment((prev) => prev ? { ...prev, proofs: [...prev.proofs, { url: base64Image, description: '' }] } : prev);
            setIsPaymentCameraOpen(false);
          }}
        />
      )}

      {/* Edit Bukti Uang Muka (DP) Modal */}
      {editingDpInvoiceId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" />
                <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Edit Bukti Uang Muka (DP)</span>
              </div>
              <button
                type="button"
                onClick={closeEditDpProof}
                className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
            </div>

            <div className="p-5 overflow-auto flex-1">
              <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-500 font-extrabold uppercase">
                    Bukti Pembayaran ({editingDpProofs.length})
                  </label>
                  <div className="flex gap-2">
                    <label className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition cursor-pointer shadow-3xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      Unggah
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAddDpProofFile(file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDpCameraOpen(true)}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Kamera
                    </button>
                  </div>
                </div>

                {editingDpProofs.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {editingDpProofs.map((p, index) => (
                      <div key={index} className="relative aspect-video w-full bg-slate-900 border border-slate-200 rounded-lg overflow-hidden shadow-3xs group">
                        <img
                          src={p.url}
                          alt={`Bukti DP #${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveDpProof(index)}
                            className="p-1.5 bg-white hover:bg-red-50 text-red-650 rounded-lg transition shadow cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-450 italic">Belum ada bukti pembayaran untuk Uang Muka (DP) ini (opsional).</p>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-150 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={closeEditDpProof}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveDpProof}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {isDpCameraOpen && (
        <CameraModal
          onClose={() => setIsDpCameraOpen(false)}
          onCapture={(base64Image) => {
            setEditingDpProofs((prev) => [...prev, { url: base64Image, description: '' }]);
            setIsDpCameraOpen(false);
          }}
        />
      )}

      {/* Hapus Riwayat Cicilan Confirmation Modal */}
      {paymentIdToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Hapus Riwayat Cicilan?</h3>
                  <p className="text-xs text-slate-500 font-medium">Total terbayar & sisa tagihan akan dihitung ulang</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus entri riwayat pembayaran ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPaymentIdToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition duration-150 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeletePayment}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 hover:shadow-md transition duration-150 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE PRINT PREVIEW MODAL */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 flex flex-col xl:flex-row bg-slate-900/80 backdrop-blur-md overflow-hidden print:hidden">
          {/* Sidebar Panel for Options */}
          <div className="w-full xl:w-96 bg-white border-b xl:border-b-0 xl:border-r border-slate-200 p-6 flex flex-col justify-between shadow-xl shrink-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Pratinjau Cetak Laporan</h3>
                    <p className="text-[10px] text-slate-500 font-medium font-sans">Format & Periksa PDF Laporan</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="p-1 text-slate-450 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Layout Mode Selector Cards */}
              <div className="space-y-2.5">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Format Tampilan Laporan</span>
                
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPrintLayout('both')}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      printLayout === 'both'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-350 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Laporan Lengkap (Terpadu)</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${printLayout === 'both' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}`}>
                        {printLayout === 'both' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">Mencetak Ringkasan Faktur & Detail Item Barang (2 bagian dengan jeda halaman otomatis).</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintLayout('summary')}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      printLayout === 'summary'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-350 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Ringkasan Faktur Pajak Saja</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${printLayout === 'summary' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}`}>
                        {printLayout === 'summary' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">Hanya mencetak rekapitulasi summary faktur utama, total koli, DP, sisa tagihan & total omset umum.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintLayout('detail')}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      printLayout === 'detail'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-350 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Rincian Transaksi Barang Saja</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${printLayout === 'detail' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}`}>
                        {printLayout === 'detail' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">Hanya mencetak mutasi kuantitas sepatu secara terperinci per nomor ukuran (size) dan per faktur.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintLayout('piutang')}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      printLayout === 'piutang'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-350 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Uang Masuk & Piutang</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${printLayout === 'piutang' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}`}>
                        {printLayout === 'piutang' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">Laporan penagihan per faktur: status lunas/belum, nominal uang masuk, dan sisa piutang.</p>
                  </button>
                </div>
              </div>

              {/* Statistics Panel for Active Filter */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Cakupan Data Terfilter</span>
                
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded-lg border border-slate-150">
                    <span className="text-[8px] text-slate-400 block font-medium uppercase font-sans">Jumlah Faktur</span>
                    <span className="font-extrabold text-slate-900 font-mono text-xs">{filteredInvoices.length} Faktur</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-150">
                    <span className="text-[8px] text-slate-400 block font-medium uppercase font-sans">Volume Barang</span>
                    <span className="font-extrabold text-slate-900 font-mono text-xs">{totalPairsSold} Pgs</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-150">
                    <span className="text-[8px] text-slate-400 block font-medium uppercase font-sans">Total Omset</span>
                    <span className="font-extrabold text-indigo-900 font-mono text-[10px]">{formatCurrency(totalRevenue)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-150">
                    <span className="text-[8px] text-slate-400 block font-medium uppercase font-sans">Total Koli</span>
                    <span className="font-extrabold text-slate-900 font-mono text-xs">{totalKolis} Koli</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-150">
                    <span className="text-[8px] text-slate-400 block font-medium uppercase font-sans">Uang Masuk</span>
                    <span className="font-extrabold text-emerald-700 font-mono text-[10px]">{formatCurrency(totalUangMasuk)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-150">
                    <span className="text-[8px] text-slate-400 block font-medium uppercase font-sans">Piutang</span>
                    <span className="font-extrabold text-rose-700 font-mono text-[10px]">{formatCurrency(totalPiutang)}</span>
                  </div>
                </div>
                
                {/* Active Criteria Text */}
                <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 leading-relaxed font-sans space-y-1">
                  <div>• Kata Kunci: <span className="font-bold text-slate-700">{search ? `"${search}"` : 'Semua'}</span></div>
                  <div>• Status: <span className="font-bold text-slate-700">{filterStatus === 'all' ? 'Semua' : filterStatus === 'paid' ? 'Lunas' : 'Belum Lunas'}</span></div>
                  <div>• Rentang Tanggal: <span className="font-bold text-slate-700">{startDate || endDate ? `${startDate || 'Mulai'} s/d ${endDate || 'Selesai'}` : 'Seluruh Riwayat'}</span></div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 mt-6 xl:mt-0 space-y-2">
              <button
                type="button"
                onClick={() => handlePerformPrint(printLayout)}
                disabled={isExporting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Mengekspor PDF...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    Cetak ke PDF / Printer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPrintPreview(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>

          {/* Virtual Paper Sheet Area in Preview Workspace */}
          <div className="flex-1 bg-slate-800 p-4 md:p-8 overflow-y-auto flex justify-center shadow-inner">
            <div className="w-full max-w-[850px] space-y-8 my-auto min-h-max scale-95 sm:scale-100 origin-top">
              <div className="text-center text-[11px] text-white/50 mb-1 font-mono uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Pratinjau Layout Kertas A4 (Tampilan Sesuai Hasil Cetak)
              </div>

              {/* 1. VIRTUAL PAGE FOR REKAPITULASI SUMMARY */}
              {(printLayout === 'both' || printLayout === 'summary') && (
                <div className="bg-white border border-slate-300 shadow-2xl rounded-sm p-[10mm] sm:p-[15mm] text-slate-900 font-serif leading-normal relative">
                  {/* Decorative stamp/watermark */}
                  <div className="absolute top-10 right-10 text-[10px] border-2 border-indigo-200 text-indigo-300 rounded px-1.5 py-0.5 tracking-wider font-mono font-bold select-none uppercase rotate-6">
                    Materi Laporan Rekap
                  </div>

                  <div className="space-y-5">
                    <div className="text-center space-y-1.5 pb-4 border-b-2 border-double border-slate-400">
                      <h2 className="text-lg font-extrabold tracking-tight font-sans text-slate-900 uppercase">LAPORAN REKAPITULASI PENJUALAN</h2>
                      <p className="text-[12px] font-bold text-slate-700 font-sans tracking-wide">ANGKASA JAYA SHOES</p>
                      <p className="text-[9px] text-slate-500 font-mono font-sans">
                        Sistem Penjualan Sepatu • Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Filter info on Paper */}
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-2 text-[9px] rounded-lg font-sans">
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[7px] tracking-wider mb-0.5">Kriteria Pencarian</span>
                        <span className="font-bold text-slate-800">{search ? `"${search}"` : 'Semua Transaksi'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[7px] tracking-wider mb-0.5">Periode Transaksi</span>
                        <span className="font-bold text-slate-800">
                          {startDate || endDate ? `${startDate || 'Mulai'} s/d ${endDate || 'Selesai'}` : 'Seluruh Rentang Tanggal'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[7px] tracking-wider mb-0.5">Filter Klasifikasi</span>
                        <span className="font-bold text-slate-800">
                          Status: {filterStatus === 'all' ? 'Semua' : filterStatus === 'paid' ? 'Lunas' : 'Belum Lunas'} | Tipe: {filterType === 'all' ? 'Semua' : filterType}
                        </span>
                      </div>
                    </div>

                    {/* Simple summary analytics cards on page */}
                    <div className="grid grid-cols-3 gap-2.5 font-sans">
                      <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/20">
                        <span className="block text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Omset Pendapatan</span>
                        <span className="text-xs font-extrabold text-indigo-950 font-mono">{formatCurrency(totalRevenue)}</span>
                      </div>
                      <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/20">
                        <span className="block text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Uang Masuk</span>
                        <span className="text-xs font-extrabold text-emerald-800 font-mono">{formatCurrency(totalUangMasuk)}</span>
                      </div>
                      <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/20">
                        <span className="block text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Piutang</span>
                        <span className="text-xs font-extrabold text-rose-800 font-mono">{formatCurrency(totalPiutang)}</span>
                      </div>
                      <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/20">
                        <span className="block text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Total Volume</span>
                        <span className="text-xs font-extrabold text-slate-900 font-mono">{totalPairsSold} Psg</span>
                      </div>
                      <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/20">
                        <span className="block text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Koli</span>
                        <span className="text-xs font-extrabold text-slate-900 font-mono">{totalKolis} Koli</span>
                      </div>
                      <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/20">
                        <span className="block text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Biaya Packing</span>
                        <span className="text-xs font-extrabold text-slate-900 font-mono">{formatCurrency(totalPackingFees)}</span>
                      </div>
                    </div>

                    {/* Document main table inside preview */}
                    <table className="w-full text-left text-[8.5px] border-collapse border border-slate-350 font-sans">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-350 font-extrabold uppercase text-[7.5px] text-slate-800 tracking-wider">
                          <th className="py-1.5 px-1 bg-slate-100 text-center w-5 border-r border-slate-300">No</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300">No. Faktur</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300">Tanggal</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300">Konsumen</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300 text-center">Volume</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300 text-center">Koli</th>
                          <th className="py-1.5 px-1.5 text-right border-r border-slate-300">Sewa Packing</th>
                          {invoices.some(i => i.ppnAmount !== undefined && i.ppnAmount > 0) && (
                            <th className="py-1.5 px-1.5 text-right border-r border-slate-300">PPN</th>
                          )}
                          <th className="py-1.5 px-1.5 text-right border-r border-slate-300">Uang Muka / DP</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300 text-right">Sisa Tagihan</th>
                          <th className="py-1.5 px-1.5 text-right">Total Transaksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[8px]">
                        {filteredInvoices.map((inv, idx) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-1 border-r border-slate-200 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 font-bold text-indigo-900 font-mono">{inv.invoiceNumber}</td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 font-mono text-slate-550">{inv.date}</td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 font-semibold text-slate-800">
                              <div>{inv.customerName}</div>
                              <span className="text-[6.5px] text-slate-450 uppercase block tracking-tight font-mono">Tipe: {inv.customerType}</span>
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-semibold">{inv.totalPairs} pasang</td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-center font-mono font-medium">
                              {inv.wantsPacking ? `${inv.koliCount} Koli` : '-'}
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-mono">
                              {inv.wantsPacking ? formatCurrency(inv.packingFee) : 'Rp 0'}
                            </td>
                            {invoices.some(i => i.ppnAmount !== undefined && i.ppnAmount > 0) && (
                              <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-mono text-slate-650">
                                {inv.ppnAmount ? formatCurrency(inv.ppnAmount) : 'Rp 0'}
                              </td>
                            )}
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-mono text-amber-800 font-semibold">
                              {inv.dpAmount ? formatCurrency(inv.dpAmount) : 'Rp 0'}
                            </td>
                            <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-mono text-rose-800 font-semibold">
                              {formatCurrency(inv.status === 'paid' ? 0 : (inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.dpAmount || 0)))}
                            </td>
                            <td className="py-1.5 px-1.5 text-right font-bold font-mono bg-slate-50/50">
                              {formatCurrency(inv.totalAmount)}
                            </td>
                          </tr>
                        ))}

                        {/* Cumulated statistics total row */}
                        <tr className="bg-slate-100 font-bold border-t border-slate-350 text-slate-900">
                          <td className="py-1.5 px-1.5 text-right align-middle text-[7.5px] font-extrabold uppercase" colSpan={4}>TOTAL KESELURUHAN:</td>
                          <td className="py-1.5 px-1.5 text-center font-mono font-extrabold">{totalPairsSold} Pgs</td>
                          <td className="py-1.5 px-1.5 text-center font-mono font-extrabold">{totalKolis} Koli</td>
                          <td className="py-1.5 px-1.5 text-right font-mono font-extrabold">{formatCurrency(totalPackingFees)}</td>
                          {invoices.some(i => i.ppnAmount !== undefined && i.ppnAmount > 0) && (
                            <td className="py-1.5 px-1.5 text-right font-mono font-extrabold">
                              {formatCurrency(filteredInvoices.reduce((sum, i) => sum + (i.ppnAmount || 0), 0))}
                            </td>
                          )}
                          <td className="py-1.5 px-1.5 text-right font-mono font-extrabold text-amber-900">
                            {formatCurrency(filteredInvoices.reduce((sum, i) => sum + (i.dpAmount || 0), 0))}
                          </td>
                          <td className="py-1.5 px-1.5 text-right font-mono font-extrabold text-rose-900">
                            {formatCurrency(filteredInvoices.reduce((sum, i) => sum + (i.status === 'paid' ? 0 : (i.remainingBalance !== undefined ? i.remainingBalance : i.totalAmount - (i.dpAmount || 0))), 0))}
                          </td>
                          <td className="py-1.5 px-1.5 text-right font-extrabold text-[8.5px] bg-indigo-50 text-indigo-950 font-mono">
                            {formatCurrency(totalRevenue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Signatures Panel */}
                    <div className="pt-8 flex justify-between text-[10px] text-slate-700 px-4 font-sans">
                      <div className="w-1/3 text-center space-y-12">
                        <span>Staff Keuangan,</span>
                        <span className="block border-b border-slate-400 w-32 mx-auto" />
                        <span className="text-[8px] text-slate-450 block -mt-10 font-bold uppercase tracking-wider">&nbsp;</span>
                      </div>
                      <div className="w-1/3 text-center space-y-12">
                        <span>Mengetahui,</span>
                        <span className="block border-b border-slate-400 w-32 mx-auto" />
                        <span className="text-[8px] text-slate-450 block -mt-10 font-bold uppercase tracking-wider">&nbsp;</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. VIRTUAL PAGE FOR REKAPITULASI DETAIL ITEMS */}
              {(printLayout === 'both' || printLayout === 'detail') && (
                <div className="bg-white border border-slate-300 shadow-2xl rounded-sm p-[10mm] sm:p-[15mm] text-slate-900 font-serif leading-normal relative">
                  {/* Decorative stamp/watermark */}
                  <div className="absolute top-10 right-10 text-[10px] border-2 border-emerald-200 text-emerald-300 rounded px-1.5 py-0.5 tracking-wider font-mono font-bold select-none uppercase rotate-6">
                    Mutasi Mutu Barang
                  </div>

                  <div className="space-y-5">
                    <div className="text-center space-y-1.5 pb-4 border-b-2 border-double border-slate-400">
                      <h2 className="text-lg font-extrabold tracking-tight font-sans text-slate-900 uppercase">LAPORAN MUTASI DETAIL TRANSAKSI BARANG</h2>
                      <p className="text-[12px] font-bold text-slate-700 font-sans tracking-wide">ANGKASA JAYA SHOES</p>
                      <p className="text-[9px] text-slate-500 font-mono font-sans">
                        Faktur Rincian Ukuran & Qty Sepatu • Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Filter info on Paper */}
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-2 text-[9px] rounded-lg font-sans">
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[7px] tracking-wider mb-0.5">Kriteria Pencarian</span>
                        <span className="font-bold text-slate-800">{search ? `"${search}"` : 'Semua Transaksi'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[7px] tracking-wider mb-0.5">Rentang Tanggal</span>
                        <span className="font-bold text-slate-800">
                          {startDate || endDate ? `${startDate || 'Mulai'} s/d ${endDate || 'Selesai'}` : 'Seluruh Riwayat'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[7px] tracking-wider mb-0.5">Filter Klasifikasi</span>
                        <span className="font-bold text-slate-800">
                          Tipe: {filterType === 'all' ? 'Semua' : filterType} | Status: {filterStatus === 'all' ? 'Semua' : filterStatus === 'paid' ? 'Lunas' : 'Belum Lunas'}
                        </span>
                      </div>
                    </div>

                    {/* Document details table inside preview */}
                    <table className="w-full text-left text-[8px] border-collapse border border-slate-350 font-sans">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-350 font-extrabold uppercase text-[7px] text-slate-800 tracking-wider">
                          <th className="py-1.5 px-0.5 bg-slate-100 text-center w-5 border-r border-slate-300">No</th>
                          <th className="py-1.5 px-1 border-r border-slate-300">No. Faktur</th>
                          <th className="py-1.5 px-1 border-r border-slate-300">Tanggal</th>
                          <th className="py-1.5 px-1 border-r border-slate-300">Konsumen</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300">Nama Barang / Sepatu</th>
                          <th className="py-1.5 px-0.5 text-center border-r border-slate-300 w-10">Size</th>
                          <th className="py-1.5 px-0.5 text-center border-r border-slate-300 w-12">Qty (Psg)</th>
                          <th className="py-1.5 px-1 text-right border-r border-slate-300">Harga Dasar</th>
                          <th className="py-1.5 px-1 text-right border-r border-slate-300 font-sans">Tambahan Size</th>
                          <th className="py-1.5 px-0.5 text-center border-r border-slate-300">Packing</th>
                          <th className="py-1.5 px-0.5 text-center border-r border-slate-300">Bayar</th>
                          <th className="py-1.5 px-1.5 text-right font-sans">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[7.5px]">
                        {(() => {
                          let itemIndex = 1;
                          const elements = [];
                          filteredInvoices.forEach((inv) => {
                            inv.items.forEach((item, itIdx) => {
                              elements.push(
                                <tr key={`preview-${inv.id}-${item.id || itIdx}-${item.size}`} className="hover:bg-slate-50/50">
                                  <td className="py-1.5 px-0.5 border-r border-slate-200 text-center font-mono text-slate-400">{itemIndex++}</td>
                                  <td className="py-1.5 px-1 border-r border-slate-200 font-bold text-indigo-900 font-mono text-[7px]">{inv.invoiceNumber}</td>
                                  <td className="py-1.5 px-1 border-r border-slate-200 font-mono text-slate-500">{inv.date}</td>
                                  <td className="py-1.5 px-1 border-r border-slate-200 font-semibold text-slate-800 text-[7.5px]">
                                    <div>{inv.customerName}</div>
                                  </td>
                                  <td className="py-1.5 px-1.5 border-r border-slate-200 text-slate-755 font-medium">{item.productName}</td>
                                  <td className="py-1.5 px-0.5 border-r border-slate-200 text-center font-bold text-indigo-950 font-mono text-[8px]">{item.size}</td>
                                  <td className="py-1.5 px-0.5 border-r border-slate-200 text-center font-bold font-mono text-[8px]">{item.quantity} pasang</td>
                                  <td className="py-1.5 px-1 border-r border-slate-200 text-right font-mono">{formatCurrency(item.negotiatedBasePrice)}</td>
                                  <td className="py-1.5 px-1 border-r border-slate-200 text-right font-mono text-slate-450">
                                    {item.sizeSurcharge > 0 ? formatCurrency(item.sizeSurcharge) : 'Rp 0'}
                                  </td>
                                  <td className="py-1.5 px-0.5 border-r border-slate-200 text-center text-[7px] text-slate-500 font-mono">
                                    {inv.wantsPacking ? `Ya` : '-'}
                                  </td>
                                  <td className="py-1.5 px-0.5 border-r border-slate-200 text-center text-[7px] font-bold">
                                    {inv.status === 'paid' ? (
                                      <span className="text-emerald-700 font-bold">LUNAS</span>
                                    ) : (
                                      <span className="text-rose-700 font-medium">BELUM</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-right font-extrabold font-mono text-slate-900">
                                    {formatCurrency(item.totalPrice)}
                                  </td>
                                </tr>
                              );
                            });
                          });

                          if (elements.length === 0) {
                            return (
                              <tr>
                                <td colSpan={12} className="py-8 text-center text-slate-450 italic">
                                  Tidak ada rincian sepatu untuk kriteria filter aktif.
                                </td>
                              </tr>
                            );
                          }
                          return elements;
                        })()}

                        {/* Cumulated statistics total details row */}
                        <tr className="bg-slate-100 font-bold border-t border-slate-350 text-slate-900 text-[8px]">
                          <td className="py-2 px-1.5 text-right align-middle font-extrabold uppercase" colSpan={6}>TOTAL QUANTITY TERKARYAKAN:</td>
                          <td className="py-2 px-1 text-center font-mono font-extrabold text-[8.5px] text-indigo-950 bg-indigo-50/40">
                            {totalPairsSold} Pgs
                          </td>
                          <td className="py-2 px-1.5 text-right font-mono font-extrabold text-indigo-950" colSpan={5}>
                            {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.subtotal, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Signatures Panel details */}
                    <div className="pt-8 flex justify-between text-[10px] text-slate-700 px-4 font-sans">
                      <div className="w-1/3 text-center space-y-12">
                        <span>Staff Keuangan,</span>
                        <span className="block border-b border-slate-400 w-32 mx-auto" />
                        <span className="text-[8px] text-slate-450 block -mt-10 font-bold uppercase tracking-wider">&nbsp;</span>
                      </div>
                      <div className="w-1/3 text-center space-y-12">
                        <span>Mengetahui,</span>
                        <span className="block border-b border-slate-400 w-32 mx-auto" />
                        <span className="text-[8px] text-slate-450 block -mt-10 font-bold uppercase tracking-wider">&nbsp;</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. VIRTUAL PAGE FOR UANG MASUK & PIUTANG */}
              {printLayout === 'piutang' && (
                <div className="bg-white border border-slate-300 shadow-2xl rounded-sm p-[10mm] sm:p-[15mm] text-slate-900 font-serif leading-normal relative">
                  {/* Decorative stamp/watermark */}
                  <div className="absolute top-10 right-10 text-[10px] border-2 border-emerald-200 text-emerald-300 rounded px-1.5 py-0.5 tracking-wider font-mono font-bold select-none uppercase rotate-6">
                    Laporan Penagihan
                  </div>

                  <div className="space-y-5">
                    <div className="text-center space-y-1.5 pb-4 border-b-2 border-double border-slate-400">
                      <h2 className="text-lg font-extrabold tracking-tight font-sans text-slate-900 uppercase">LAPORAN UANG MASUK & PIUTANG</h2>
                      <p className="text-[12px] font-bold text-slate-700 font-sans tracking-wide">ANGKASA JAYA SHOES</p>
                      <p className="text-[9px] text-slate-500 font-mono font-sans">
                        Rekapitulasi Penagihan per Faktur • Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Highlight Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                        <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Omset</span>
                        <span className="text-xs font-extrabold text-indigo-950 font-mono">{formatCurrency(totalRevenue)}</span>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                        <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Uang Masuk</span>
                        <span className="text-xs font-extrabold text-emerald-800 font-mono">{formatCurrency(totalUangMasuk)}</span>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                        <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Piutang</span>
                        <span className="text-xs font-extrabold text-rose-800 font-mono">{formatCurrency(totalPiutang)}</span>
                      </div>
                    </div>

                    {/* Filter info on Paper */}
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-2 text-[9px] rounded-lg font-sans">
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[7px] tracking-wider mb-0.5">Kriteria Pencarian</span>
                        <span className="font-bold text-slate-800">{search ? `"${search}"` : 'Semua Transaksi'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[7px] tracking-wider mb-0.5">Rentang Tanggal</span>
                        <span className="font-bold text-slate-800">
                          {startDate || endDate ? `${startDate || 'Mulai'} s/d ${endDate || 'Selesai'}` : 'Seluruh Riwayat'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 block uppercase text-[7px] tracking-wider mb-0.5">Filter Klasifikasi</span>
                        <span className="font-bold text-slate-800">
                          Tipe: {filterType === 'all' ? 'Semua' : filterType} | Status: {filterStatus === 'all' ? 'Semua' : filterStatus === 'paid' ? 'Lunas' : 'Belum Lunas'}
                        </span>
                      </div>
                    </div>

                    {/* Penagihan table inside preview */}
                    <table className="w-full text-left text-[8.5px] border-collapse border border-slate-350 font-sans">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-350 font-extrabold uppercase text-[7.5px] text-slate-800 tracking-wider">
                          <th className="py-1.5 px-1 bg-slate-100 text-center w-5 border-r border-slate-300">No</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300">No. Faktur</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300">Tanggal</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-300">Konsumen</th>
                          <th className="py-1.5 px-1.5 text-right border-r border-slate-300">Total Transaksi</th>
                          <th className="py-1.5 px-1.5 text-right border-r border-slate-300">Uang Masuk</th>
                          <th className="py-1.5 px-1.5 text-right border-r border-slate-300">Piutang</th>
                          <th className="py-1.5 px-1.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[8px]">
                        {filteredInvoices.map((inv, idx) => {
                          const piutangInv = inv.status === 'paid' ? 0 : Math.max(0, inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.dpAmount || 0));
                          const uangMasukInv = inv.totalAmount - piutangInv;
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/50">
                              <td className="py-1.5 px-1 border-r border-slate-200 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                              <td className="py-1.5 px-1.5 border-r border-slate-200 font-bold text-indigo-900 font-mono">{inv.invoiceNumber}</td>
                              <td className="py-1.5 px-1.5 border-r border-slate-200 font-mono text-slate-550">{inv.date}</td>
                              <td className="py-1.5 px-1.5 border-r border-slate-200 font-semibold text-slate-800">{inv.customerName}</td>
                              <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-bold font-mono">{formatCurrency(inv.totalAmount)}</td>
                              <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-mono text-emerald-800 font-semibold">{formatCurrency(uangMasukInv)}</td>
                              <td className="py-1.5 px-1.5 border-r border-slate-200 text-right font-mono text-rose-800 font-semibold">{formatCurrency(piutangInv)}</td>
                              <td className="py-1.5 px-1.5 text-center font-bold">
                                {inv.status === 'paid' ? (
                                  <span className="text-emerald-700">LUNAS</span>
                                ) : (
                                  <span className="text-rose-700">BELUM</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {filteredInvoices.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-450 italic">
                              Tidak ada faktur untuk kriteria filter aktif.
                            </td>
                          </tr>
                        )}

                        {/* Cumulated statistics total row */}
                        <tr className="bg-slate-100 font-bold border-t border-slate-350 text-slate-900">
                          <td className="py-1.5 px-1.5 text-right align-middle text-[7.5px] font-extrabold uppercase" colSpan={4}>TOTAL KESELURUHAN:</td>
                          <td className="py-1.5 px-1.5 text-right font-mono font-extrabold">{formatCurrency(totalRevenue)}</td>
                          <td className="py-1.5 px-1.5 text-right font-mono font-extrabold text-emerald-900">{formatCurrency(totalUangMasuk)}</td>
                          <td className="py-1.5 px-1.5 text-right font-mono font-extrabold text-rose-900">{formatCurrency(totalPiutang)}</td>
                          <td className="py-1.5 px-1.5"></td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Signatures Panel */}
                    <div className="pt-8 flex justify-between text-[10px] text-slate-700 px-4 font-sans">
                      <div className="w-1/3 text-center space-y-12">
                        <span>Staff Keuangan,</span>
                        <span className="block border-b border-slate-400 w-32 mx-auto" />
                        <span className="text-[8px] text-slate-450 block -mt-10 font-bold uppercase tracking-wider">&nbsp;</span>
                      </div>
                      <div className="w-1/3 text-center space-y-12">
                        <span>Mengetahui,</span>
                        <span className="block border-b border-slate-400 w-32 mx-auto" />
                        <span className="text-[8px] text-slate-450 block -mt-10 font-bold uppercase tracking-wider">&nbsp;</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div id="printable-report" className="hidden print:block w-[100%] max-w-[100%] text-slate-900 bg-white p-2 select-none">
        {(printLayout === 'both' || printLayout === 'summary') && (
          <div className="space-y-6 mb-8">
            <div className="text-center space-y-1 py-4 border-b border-slate-300">
              <h2 className="text-xl font-extrabold tracking-tight">LAPORAN REKAPITULASI PENJUALAN</h2>
              <p className="text-[14px] font-bold text-slate-800">ANGKASA JAYA SHOES</p>
              <p className="text-[10px] text-slate-500">
                Dicetak pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Filter metadata info */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[9px] my-4">
              <div>
                <span className="font-bold text-slate-500 block uppercase text-[7px] tracking-wider mb-0.5">Kriteria Kata Kunci</span>
                <span className="font-semibold text-slate-800">{search ? `"${search}"` : 'Semua Transaksi'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block uppercase text-[7px] tracking-wider mb-0.5">Rentang Waktu</span>
                <span className="font-semibold text-slate-800">
                  {startDate || endDate ? `${startDate || 'Mulai'} s/d ${endDate || 'Selesai'}` : 'Seluruh Riwayat'}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block uppercase text-[7px] tracking-wider mb-0.5">Klasifikasi Status</span>
                <span className="font-semibold text-slate-800">
                  Status: {filterStatus === 'all' ? 'Semua' : filterStatus === 'paid' ? 'Lunas' : 'Belum Lunas'} | Tipe: {filterType === 'all' ? 'Semua' : filterType}
                </span>
              </div>
            </div>

            {/* Highlight Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Omset</span>
                <span className="text-xs font-extrabold text-indigo-950 font-mono">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Uang Masuk</span>
                <span className="text-xs font-extrabold text-emerald-800 font-mono">{formatCurrency(totalUangMasuk)}</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Piutang</span>
                <span className="text-xs font-extrabold text-rose-800 font-mono">{formatCurrency(totalPiutang)}</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Pasang Terjual</span>
                <span className="text-xs font-extrabold text-indigo-950 font-mono">{totalPairsSold} Pgs</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Jumlah Koli</span>
                <span className="text-xs font-extrabold text-indigo-950 font-mono">{totalKolis} Koli</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Sewa Packing</span>
                <span className="text-xs font-extrabold text-indigo-950 font-mono">{formatCurrency(totalPackingFees)}</span>
              </div>
            </div>

            {/* Main printable table */}
            <table className="w-full text-left text-[8.5px] border-collapse border border-slate-355">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-355 font-bold uppercase tracking-wider text-slate-800 whitespace-nowrap">
                  <th className="py-1.5 px-1 bg-slate-100 text-center w-5 border-r border-slate-350">No</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">No. Faktur</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">Tanggal</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">Konsumen</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350 text-center">Volume</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350 text-center">Koli</th>
                  <th className="py-1.5 px-1.5 text-right border-r border-slate-350">Biaya Packing</th>
                  {invoices.some(i => i.ppnAmount !== undefined && i.ppnAmount > 0) && (
                    <th className="py-1.5 px-1.5 text-right border-r border-slate-350">PPN</th>
                  )}
                  {invoices.some(i => i.hasOngkir) && (
                    <th className="py-1.5 px-1.5 text-right border-r border-slate-350">Ongkir</th>
                  )}
                  <th className="py-1.5 px-1.5 text-right border-r border-slate-350">DP / Uang Muka</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350 text-right">Sisa Tagihan</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350 text-center">Status</th>
                  <th className="py-1.5 px-1.5 text-right">Total Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredInvoices.map((inv, idx) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-1 border-r border-slate-300 text-center font-mono font-bold">{idx + 1}</td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 font-bold text-indigo-900 font-mono text-[8px]">{inv.invoiceNumber}</td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 font-mono text-[7.5px]">{inv.date}</td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 font-medium">
                      <div>{inv.customerName}</div>
                      <div className="text-[6.5px] text-slate-450 font-mono tracking-tight uppercase">Tipe: {inv.customerType}</div>
                    </td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-semibold">{inv.totalPairs} pasang</td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-mono font-medium">
                      {inv.wantsPacking ? `${inv.koliCount} Koli` : '-'}
                    </td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 text-right font-mono text-[8px]">
                      {inv.wantsPacking ? formatCurrency(inv.packingFee) : 'Rp 0'}
                    </td>
                    {invoices.some(i => i.ppnAmount !== undefined && i.ppnAmount > 0) && (
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-right font-mono text-[8px]">
                        {inv.ppnAmount ? formatCurrency(inv.ppnAmount) : 'Rp 0'}
                      </td>
                    )}
                    {invoices.some(i => i.hasOngkir) && (
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-right font-mono text-[8px]">
                        {inv.hasOngkir && inv.ongkirAmount ? formatCurrency(inv.ongkirAmount) : 'Rp 0'}
                      </td>
                    )}
                    <td className="py-1.5 px-1.5 border-r border-slate-300 text-right font-mono text-[8px] text-amber-800">
                      {inv.dpAmount ? formatCurrency(inv.dpAmount) : 'Rp 0'}
                    </td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 text-right font-mono text-[8px] text-rose-800">
                      {formatCurrency(inv.status === 'paid' ? 0 : (inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.dpAmount || 0)))}
                    </td>
                    <td className="py-1.5 px-1.5 border-r border-slate-300 text-center font-bold text-[7.5px]">
                      {inv.status === 'paid' ? (
                        <span className="text-emerald-700">Lunas</span>
                      ) : (
                        <span className="text-rose-700">Belum Lunas</span>
                      )}
                    </td>
                    <td className="py-1.5 px-1.5 text-right font-bold font-mono text-[8px] bg-slate-50/50">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                  </tr>
                ))}
                
                {/* Total recap row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td className="py-2 px-1.5 text-right align-middle text-[7.5px] font-extrabold uppercase" colSpan={4}>TOTAL KESELURUHAN:</td>
                  <td className="py-2 px-1.5 text-center align-middle font-mono font-extrabold text-[8px]">{totalPairsSold} Pgs</td>
                  <td className="py-2 px-1.5 text-center align-middle font-mono font-extrabold text-[8px]">{totalKolis} Koli</td>
                  <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8px]">{formatCurrency(totalPackingFees)}</td>
                  {invoices.some(i => i.ppnAmount !== undefined && i.ppnAmount > 0) && (
                    <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8px]">
                      {formatCurrency(filteredInvoices.reduce((sum, i) => sum + (i.ppnAmount || 0), 0))}
                    </td>
                  )}
                  {invoices.some(i => i.hasOngkir) && (
                    <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8px] text-slate-900">
                      {formatCurrency(filteredInvoices.reduce((sum, i) => sum + (i.hasOngkir ? (i.ongkirAmount || 0) : 0), 0))}
                    </td>
                  )}
                  <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8px] text-amber-900">
                    {formatCurrency(filteredInvoices.reduce((sum, i) => sum + (i.dpAmount || 0), 0))}
                  </td>
                  <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8px] text-rose-900">
                    {formatCurrency(filteredInvoices.reduce((sum, i) => sum + (i.status === 'paid' ? 0 : (i.remainingBalance !== undefined ? i.remainingBalance : i.totalAmount - (i.dpAmount || 0))), 0))}
                  </td>
                  <td className="py-2 px-1.5 border-r border-slate-300"></td>
                  <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8.5px] bg-indigo-50 text-indigo-950">
                    {formatCurrency(totalRevenue)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signature Box */}
            <div className="mt-12 flex justify-between text-[10px] text-slate-700 px-6 font-medium">
              <div className="w-1/3 text-center space-y-12 animate-none">
                <span>Staff Keuangan,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8px] text-slate-400 block -mt-10">&nbsp;</span>
              </div>
              <div className="w-1/3 text-center space-y-12 animate-none">
                <span>Mengetahui,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8px] text-slate-400 block -mt-10">&nbsp;</span>
              </div>
            </div>
          </div>
        )}

        {(printLayout === 'both' || printLayout === 'detail') && (
          <div className={`${printLayout === 'both' ? 'mt-12 pt-8 border-t border-slate-350' : 'space-y-6'}`} style={printLayout === 'both' ? { pageBreakBefore: 'always', breakBefore: 'page' } : undefined}>
            <div className="text-center space-y-1 py-4 border-b border-slate-300 mb-4">
              <h2 className="text-xl font-extrabold tracking-tight">LAPORAN DETAIL TRANSAKSI BARANG</h2>
              <p className="text-[14px] font-bold text-slate-800">ANGKASA JAYA SHOES</p>
              <p className="text-[10px] text-slate-500">
                Dicetak pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • Detail Transaksi
              </p>
            </div>

            {/* Filter metadata info */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[9px] my-4">
              <div>
                <span className="font-bold text-slate-500 block uppercase text-[7px] tracking-wider mb-0.5">Kriteria Kata Kunci</span>
                <span className="font-semibold text-slate-800">{search ? `"${search}"` : 'Semua Transaksi'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block uppercase text-[7px] tracking-wider mb-0.5">Rentang Waktu</span>
                <span className="font-semibold text-slate-800">
                  {startDate || endDate ? `${startDate || 'Mulai'} s/d ${endDate || 'Selesai'}` : 'Seluruh Riwayat'}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block uppercase text-[7px] tracking-wider mb-0.5">Klasifikasi Status</span>
                <span className="font-semibold text-slate-800">
                  Status: {filterStatus === 'all' ? 'Semua' : filterStatus === 'paid' ? 'Lunas' : 'Belum Lunas'} | Tipe: {filterType === 'all' ? 'Semua' : filterType}
                </span>
              </div>
            </div>

            {/* Main printable table for detailed items */}
            <table className="w-full text-left text-[8px] border-collapse border border-slate-350">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-355 font-bold uppercase tracking-wider text-slate-800 whitespace-nowrap">
                  <th className="py-1.5 px-1 bg-slate-100 text-center w-5 border-r border-slate-350">No</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">No. Faktur</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">Tanggal</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">Konsumen</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">Barang / Sepatu</th>
                  <th className="py-1.5 px-1 text-center border-r border-slate-350">Size</th>
                  <th className="py-1.5 px-1 text-center border-r border-slate-350">Qty</th>
                  <th className="py-1.5 px-1 text-right border-r border-slate-350">Harga Satuan</th>
                  <th className="py-1.5 px-1 text-right border-r border-slate-350">Tambahan Size</th>
                  <th className="py-1.5 px-1 border-r border-slate-350 text-center">Packing</th>
                  <th className="py-1.5 px-1 border-r border-slate-350 text-center">Status</th>
                  <th className="py-1.5 px-1 text-right">Subtotal Item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {(() => {
                  let itemIndex = 1;
                  const itemRows = [];
                  filteredInvoices.forEach((inv) => {
                    inv.items.forEach((item, itIdx) => {
                      itemRows.push(
                        <tr key={`${inv.id}-${item.id || itIdx}-${item.size}`} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-1 border-r border-slate-300 text-center font-mono font-bold">{itemIndex++}</td>
                          <td className="py-1.5 px-1.5 border-r border-slate-300 font-bold text-indigo-900 font-mono text-[7px]">{inv.invoiceNumber}</td>
                          <td className="py-1.5 px-1.5 border-r border-slate-300 font-mono text-[6.5px]">{inv.date}</td>
                          <td className="py-1.5 px-1.5 border-r border-slate-300 font-medium">
                            <div>{inv.customerName}</div>
                            <div className="text-[6.0px] text-slate-450 font-mono tracking-tight uppercase">Tipe: {inv.customerType}</div>
                          </td>
                          <td className="py-1.5 px-1.5 border-r border-slate-300 font-medium">{item.productName}</td>
                          <td className="py-1.5 px-1 border-r border-slate-300 text-center font-bold text-indigo-950 font-mono">{item.size}</td>
                          <td className="py-1.5 px-1 border-r border-slate-300 text-center font-semibold font-mono text-[8.5px]">{item.quantity} psg</td>
                          <td className="py-1.5 px-1 border-r border-slate-300 text-right font-mono text-[7.5px]">{formatCurrency(item.negotiatedBasePrice)}</td>
                          <td className="py-1.5 px-1 border-r border-slate-300 text-right font-mono text-[7.5px] text-slate-500">
                            {item.sizeSurcharge > 0 ? formatCurrency(item.sizeSurcharge) : 'Rp 0'}
                          </td>
                          <td className="py-1.5 px-1 border-r border-slate-300 text-center font-mono text-[6.5px] text-slate-500">
                            {inv.wantsPacking ? `Ya (${inv.koliCount} K)` : '-'}
                          </td>
                          <td className="py-1.5 px-1 border-r border-slate-300 text-center font-bold text-[6.5px]">
                            {inv.status === 'paid' ? (
                              <span className="text-emerald-700">LUNAS</span>
                            ) : (
                              <span className="text-rose-700">BELUM</span>
                            )}
                          </td>
                          <td className="py-1.5 px-1 text-right font-extrabold font-mono text-[7.5px]">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      );
                    });
                  });
                  return itemRows;
                })()}

                {/* Detailed cumulative recap row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td className="py-2 px-1.5 text-right align-middle text-[7.5px] font-extrabold uppercase" colSpan={6}>TOTAL UNIT TERKARYAKAN:</td>
                  <td className="py-2 px-1 text-center align-middle font-mono font-extrabold text-[8.5px] text-indigo-950 bg-indigo-50/40">
                    {totalPairsSold} Pgs
                  </td>
                  <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8.5px] text-indigo-950" colSpan={5}>
                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.subtotal, 0))}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signature Box for Details */}
            <div className="mt-12 flex justify-between text-[10px] text-slate-700 px-6 font-medium">
              <div className="w-1/3 text-center space-y-12">
                <span>Staff Keuangan,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8px] text-slate-400 block -mt-10">&nbsp;</span>
              </div>
              <div className="w-1/3 text-center space-y-12">
                <span>Mengetahui,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8px] text-slate-400 block -mt-10">&nbsp;</span>
              </div>
            </div>
          </div>
        )}

        {printLayout === 'piutang' && (
          <div className="space-y-6 mb-8">
            <div className="text-center space-y-1 py-4 border-b border-slate-300">
              <h2 className="text-xl font-extrabold tracking-tight">LAPORAN UANG MASUK & PIUTANG</h2>
              <p className="text-[14px] font-bold text-slate-800">ANGKASA JAYA SHOES</p>
              <p className="text-[10px] text-slate-500">
                Rekapitulasi Penagihan per Faktur • Dicetak pada: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Filter metadata info */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[9px] my-4">
              <div>
                <span className="font-bold text-slate-500 block uppercase text-[7px] tracking-wider mb-0.5">Kriteria Kata Kunci</span>
                <span className="font-semibold text-slate-800">{search ? `"${search}"` : 'Semua Transaksi'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block uppercase text-[7px] tracking-wider mb-0.5">Rentang Waktu</span>
                <span className="font-semibold text-slate-800">
                  {startDate || endDate ? `${startDate || 'Mulai'} s/d ${endDate || 'Selesai'}` : 'Seluruh Riwayat'}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block uppercase text-[7px] tracking-wider mb-0.5">Klasifikasi Status</span>
                <span className="font-semibold text-slate-800">
                  Status: {filterStatus === 'all' ? 'Semua' : filterStatus === 'paid' ? 'Lunas' : 'Belum Lunas'} | Tipe: {filterType === 'all' ? 'Semua' : filterType}
                </span>
              </div>
            </div>

            {/* Highlight Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Omset</span>
                <span className="text-xs font-extrabold text-indigo-950 font-mono">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Uang Masuk</span>
                <span className="text-xs font-extrabold text-emerald-800 font-mono">{formatCurrency(totalUangMasuk)}</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 text-center bg-slate-50/20">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Piutang</span>
                <span className="text-xs font-extrabold text-rose-800 font-mono">{formatCurrency(totalPiutang)}</span>
              </div>
            </div>

            {/* Main printable table */}
            <table className="w-full text-left text-[8.5px] border-collapse border border-slate-355">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-355 font-bold uppercase tracking-wider text-slate-800 whitespace-nowrap">
                  <th className="py-1.5 px-1 bg-slate-100 text-center w-5 border-r border-slate-350">No</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">No. Faktur</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">Tanggal</th>
                  <th className="py-1.5 px-1.5 border-r border-slate-350">Konsumen</th>
                  <th className="py-1.5 px-1.5 text-right border-r border-slate-350">Total Transaksi</th>
                  <th className="py-1.5 px-1.5 text-right border-r border-slate-350">Uang Masuk</th>
                  <th className="py-1.5 px-1.5 text-right border-r border-slate-350">Piutang</th>
                  <th className="py-1.5 px-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredInvoices.map((inv, idx) => {
                  const piutangInv = inv.status === 'paid' ? 0 : Math.max(0, inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.dpAmount || 0));
                  const uangMasukInv = inv.totalAmount - piutangInv;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-1 border-r border-slate-300 text-center font-mono font-bold">{idx + 1}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 font-bold text-indigo-900 font-mono text-[8px]">{inv.invoiceNumber}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 font-mono text-[7.5px]">{inv.date}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 font-medium">{inv.customerName}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-right font-bold font-mono text-[8px]">{formatCurrency(inv.totalAmount)}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-right font-mono text-[8px] text-emerald-800">{formatCurrency(uangMasukInv)}</td>
                      <td className="py-1.5 px-1.5 border-r border-slate-300 text-right font-mono text-[8px] text-rose-800">{formatCurrency(piutangInv)}</td>
                      <td className="py-1.5 px-1.5 text-center font-bold text-[7.5px]">
                        {inv.status === 'paid' ? (
                          <span className="text-emerald-700">LUNAS</span>
                        ) : (
                          <span className="text-rose-700">BELUM LUNAS</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-450 italic">
                      Tidak ada faktur untuk kriteria filter aktif.
                    </td>
                  </tr>
                )}

                {/* Total recap row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td className="py-2 px-1.5 text-right align-middle text-[7.5px] font-extrabold uppercase" colSpan={4}>TOTAL KESELURUHAN:</td>
                  <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8px]">{formatCurrency(totalRevenue)}</td>
                  <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8px] text-emerald-900">{formatCurrency(totalUangMasuk)}</td>
                  <td className="py-2 px-1.5 text-right align-middle font-mono font-extrabold text-[8px] text-rose-900">{formatCurrency(totalPiutang)}</td>
                  <td className="py-2 px-1.5"></td>
                </tr>
              </tbody>
            </table>

            {/* Signature Box */}
            <div className="mt-12 flex justify-between text-[10px] text-slate-700 px-6 font-medium">
              <div className="w-1/3 text-center space-y-12">
                <span>Staff Keuangan,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8px] text-slate-400 block -mt-10">&nbsp;</span>
              </div>
              <div className="w-1/3 text-center space-y-12">
                <span>Mengetahui,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8px] text-slate-400 block -mt-10">&nbsp;</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Print Configuration Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-left font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl w-full max-w-sm animate-scale-in">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Pengaturan Cetak PDF</h3>
            
            <div className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 mb-1">Ukuran Kertas</label>
                <select
                  value={pdfFormat}
                  onChange={(e) => setPdfFormat(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="a4">A4 (210 x 297 mm)</option>
                  <option value="a5">A5 (148 x 210 mm)</option>
                  <option value="f4">F4 / Folio (215 x 330 mm)</option>
                  <option value="letter">Letter (8.5 x 11 in)</option>
                  <option value="legal">Legal (8.5 x 14 in)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Orientasi Kertas</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPdfOrientation('portrait')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer transition ${
                      pdfOrientation === 'portrait'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Potret (Portrait)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfOrientation('landscape')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer transition ${
                      pdfOrientation === 'landscape'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Lanskap (Landscape)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer border-none"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowPrintModal(false);
                  setIsExporting(true);
                  const dateStr = new Date().toISOString().split('T')[0];
                  const modeText = pendingPrintLayout === 'both' ? 'Lengkap' : pendingPrintLayout === 'summary' ? 'Ringkasan' : pendingPrintLayout === 'piutang' ? 'Uang_Masuk_Piutang' : 'Detail_Barang';
                  const filename = `Laporan_Penjualan_${modeText}_${dateStr}.pdf`;
                  await exportToPdf('printable-report', { 
                    forceSinglePage: false, 
                    filename,
                    orientation: pdfOrientation,
                    format: pdfFormat
                  });
                  setIsExporting(false);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-xs border-none"
              >
                Cetak PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
