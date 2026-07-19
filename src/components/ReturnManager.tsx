import React, { useState, useEffect } from 'react';
import { Customer, Invoice, ProductReturn, ProductReturnItem, SystemSettings, AppUserPermissions } from '../types';
import ReturnViewer from './ReturnViewer';
import { formatCurrency, exportToExcel, showToast, showConfirm } from '../utils';
import { 
  PlusCircle, 
  Search, 
  Trash2, 
  FileSpreadsheet, 
  Printer, 
  X, 
  Receipt, 
  ArrowLeft, 
  AlertCircle, 
  Check, 
  Calendar, 
  DollarSign, 
  CornerDownRight,
  Filter,
  Tag,
  Briefcase,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { exportToPdf } from '../utils/pdfExport';
import { printViaBrowser } from '../utils/print';
import * as returnsApi from '../api/returns';

interface ReturnManagerProps {
  customers: Customer[];
  invoices: Invoice[];
  onUpdateInvoices: (invoices: Invoice[]) => void;
  settings: SystemSettings;
  onAddActivity?: (
    actionType: 'create' | 'update' | 'delete' | 'payment' | 'other',
    category: 'invoice' | 'customer' | 'product' | 'salesman' | 'return' | 'commission' | 'settings',
    description: string,
    details?: string
  ) => void;
  hasActionAccess?: (actionId: keyof AppUserPermissions) => boolean;
}

export default function ReturnManager({ 
  customers, 
  invoices, 
  onUpdateInvoices,
  settings,
  onAddActivity,
  hasActionAccess = () => true,
}: ReturnManagerProps) {
  
  // Local returns state with persistence
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'potong_tagihan' | 'tunai_kredit'>('all');
  
  // Create Form State
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<{
    customerId: string;
    invoiceId: string;
    date: string;
    refundType: 'potong_tagihan' | 'tunai_kredit';
    notes: string;
    items: {
      invoiceItemId: string;
      productName: string;
      size: number;
      returnedQuantity: number;
      originalQuantity: number;
      unitRefundPrice: number;
      reason: 'rusak_defect' | 'salah_ukuran' | 'salah_model' | 'kelebihan_kirim' | 'lainnya';
      customReasonText: string;
    }[];
  }>({
    customerId: '',
    invoiceId: '',
    date: new Date().toISOString().split('T')[0],
    refundType: 'potong_tagihan',
    notes: '',
    items: []
  });

  // Printer & layout states
  const [selectedReturnForPrint, setSelectedReturnForPrint] = useState<ProductReturn | null>(null);
  const [selectedReturnForView, setSelectedReturnForView] = useState<ProductReturn | null>(null);
  const [showBulkPrintPreview, setShowBulkPrintPreview] = useState(false);
  const [isExportingNota, setIsExportingNota] = useState(false);
  const [isExportingBulk, setIsExportingBulk] = useState(false);

  // Load existing returns from the API
  useEffect(() => {
    returnsApi.listReturns().then(setReturns).catch(() => null);
  }, []);

  // Helper map customer details
  const currentCustomerInvoices = invoices.filter(inv => inv.customerId === formData.customerId);
  const selectedInvoice = invoices.find(inv => inv.id === formData.invoiceId);

  // Handle customer choice inside creation
  const handleSelectCustomer = (custId: string) => {
    setFormData(prev => ({
      ...prev,
      customerId: custId,
      invoiceId: '', // Reset invoice
      items: []
    }));
  };

  // Handle invoice choice inside creation
  const handleSelectInvoice = (invId: string) => {
    const inv = invoices.find(i => i.id === invId);
    if (!inv) return;

    // Prefill form items based on the original invoice contents
    const prefilledItems = inv.items.map(item => ({
      invoiceItemId: item.id,
      productName: item.productName,
      size: item.size,
      returnedQuantity: 0, // start with zero
      originalQuantity: item.quantity,
      unitRefundPrice: item.unitPrice, // match original unitPrice
      reason: 'rusak_defect' as const,
      customReasonText: ''
    }));

    setFormData(prev => ({
      ...prev,
      invoiceId: invId,
      items: prefilledItems,
      // Suggest potong_tagihan if original invoice is unpaid, otherwise tunai_kredit
      refundType: inv.status === 'unpaid' ? 'potong_tagihan' : 'tunai_kredit'
    }));
  };

  const handleItemReturnQtyChange = (idx: number, qty: number) => {
    const originalQty = formData.items[idx].originalQuantity;
    const validatedQty = Math.max(0, Math.min(originalQty, qty));
    
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[idx] = {
        ...updatedItems[idx],
        returnedQuantity: validatedQty
      };
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const handleItemReasonChange = (idx: number, reason: ProductReturnItem['reason']) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[idx] = {
        ...updatedItems[idx],
        reason
      };
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const handleItemCustomReasonTextChange = (idx: number, text: string) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[idx] = {
        ...updatedItems[idx],
        customReasonText: text
      };
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  // Calculation for total return valuation
  const draftTotalRefundAmount = formData.items.reduce((sum, item) => {
    return sum + (item.returnedQuantity * item.unitRefundPrice);
  }, 0);

  // Submit return
  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasActionAccess('canProcessReturn')) {
      showToast('Akses Dibatasi: Anda tidak memiliki izin memproses transaksi retur.', 'error');
      return;
    }

    if (!formData.customerId || !formData.invoiceId) {
      showToast('Pilih Pelanggan dan Faktur Penjualan terlebih dahulu.', 'warning');
      return;
    }

    const activeReturnItems = formData.items
      .filter(it => it.returnedQuantity > 0)
      .map((it, idx) => ({
        id: `retitem-${Date.now()}-${idx}`,
        productName: it.productName,
        size: it.size,
        returnedQuantity: it.returnedQuantity,
        originalQuantity: it.originalQuantity,
        unitRefundPrice: it.unitRefundPrice,
        reason: it.reason,
        customReasonText: it.reason === 'lainnya' ? it.customReasonText : undefined,
        totalRefundValue: it.returnedQuantity * it.unitRefundPrice
      }));

    if (activeReturnItems.length === 0) {
      showToast('Silakan masukkan kuantitas barang yang diretur (minimal 1 pasang sepatu).', 'warning');
      return;
    }

    // Generate Return Serial Number
    const dateSlug = formData.date.replace(/-/g, '');
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const returnNumber = `RET/${dateSlug}/${randSuffix}`;

    const newReturn: ProductReturn = {
      id: `ret-${Date.now()}`,
      returnNumber,
      date: formData.date,
      invoiceId: formData.invoiceId,
      invoiceNumber: selectedInvoice?.invoiceNumber || '',
      customerId: formData.customerId,
      customerName: customers.find(c => c.id === formData.customerId)?.name || '',
      items: activeReturnItems,
      totalRefundAmount: draftTotalRefundAmount,
      refundType: formData.refundType,
      notes: formData.notes,
      status: 'completed'
    };

    returnsApi.createReturn(newReturn).then((created) => {
      setReturns((prev) => [created, ...prev]);

      if (onAddActivity) {
        const itemSummaries = created.items.map(it => `${it.productName} (S:${it.size}) x${it.returnedQuantity}`).join(', ');
        onAddActivity(
          'create',
          'return',
          `Memproses Retur Baru: ${created.returnNumber}`,
          `Pelanggan: ${created.customerName}\nFaktur: ${created.invoiceNumber}\nBarang: ${itemSummaries}\nNilai Retur: Rp ${created.totalRefundAmount.toLocaleString('id-ID')}\nTipe Refund: ${created.refundType === 'potong_tagihan' ? 'Potong sisa tagihan' : 'Tunai/Kredit'}`
        );
      }

      // Dynamic balance adjustment if "Potong Tagihan" selected
      if (formData.refundType === 'potong_tagihan') {
        const updatedInvoices = invoices.map(inv => {
          if (inv.id === formData.invoiceId) {
            const currentBalance = inv.status === 'paid' ? 0 : (inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.dpAmount || 0)));
            // Subtract the return value safely
            const newRemaining = Math.max(0, currentBalance - draftTotalRefundAmount);
            return {
              ...inv,
              remainingBalance: newRemaining
            };
          }
          return inv;
        });
        onUpdateInvoices(updatedInvoices);
      }

      // Reset Form
      setIsCreating(false);
      setFormData({
        customerId: '',
        invoiceId: '',
        date: new Date().toISOString().split('T')[0],
        refundType: 'potong_tagihan',
        notes: '',
        items: []
      });

      showToast(`Retur barang ${returnNumber} berhasil diproses dan disimpan!`, 'success');
    }).catch(() => showToast('Gagal menyimpan retur.', 'error'));
  };

  // Delete return and safely revert the balance changes
  const handleDeleteReturn = (retId: string) => {
    const retToDestroy = returns.find(r => r.id === retId);
    if (!retToDestroy) return;

    showConfirm(
      `Apakah Anda yakin ingin menghapus catatan retur ${retToDestroy.returnNumber}? Tindakan ini akan mengembalikan tagihan sebelumnya.`,
      () => {
        // Safely reinstate the outstanding balance on reference invoice if return type was potong_tagihan
        if (retToDestroy.refundType === 'potong_tagihan') {
          const updatedInvoices = invoices.map(inv => {
            if (inv.id === retToDestroy.invoiceId) {
              const currentBalance = inv.status === 'paid' ? 0 : (inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.dpAmount || 0)));
              const revertedBalance = currentBalance + retToDestroy.totalRefundAmount;
              return {
                ...inv,
                remainingBalance: revertedBalance
              };
            }
            return inv;
          });
          onUpdateInvoices(updatedInvoices);
        }

        returnsApi.deleteReturn(retId).then(() => {
          setReturns((prev) => prev.filter(r => r.id !== retId));
          showToast("Catatan retur berhasil dihapus dan tagihan dipulihkan!", "success");

          if (onAddActivity) {
            onAddActivity(
              'delete',
              'return',
              `Menghapus Catatan Retur: ${retToDestroy.returnNumber}`,
              `Pelanggan: ${retToDestroy.customerName}\nFaktur: ${retToDestroy.invoiceNumber}\nNilai: Rp ${retToDestroy.totalRefundAmount.toLocaleString('id-ID')}`
            );
          }
        }).catch(() => showToast('Gagal menghapus retur.', 'error'));
      }
    );
  };

  // Filter returns based on search query and status selections
  const filteredReturns = returns.filter(ret => {
    const matchesSearch = 
      ret.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      ret.customerName.toLowerCase().includes(search.toLowerCase()) ||
      ret.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (ret.notes && ret.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ? true : ret.status === statusFilter;
    const matchesType = typeFilter === 'all' ? true : ret.refundType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Export spreadsheet using xlsx helper
  const handleExportExcel = () => {
    const summaryData = filteredReturns.map((ret, index) => ({
      'No': index + 1,
      'No. Retur': ret.returnNumber,
      'Tanggal Retur': ret.date,
      'No. Faktur Asal': ret.invoiceNumber,
      'Nama Pelanggan': ret.customerName,
      'Total Item Retur (Pasang)': ret.items.reduce((sum, item) => sum + item.returnedQuantity, 0),
      'Total Refund (Rp)': ret.totalRefundAmount,
      'Metode Pengembalian': ret.refundType === 'potong_tagihan' ? 'Potong Tagihan Unpaid' : 'Tunai / Kredit Manual',
      'Status': ret.status === 'completed' ? 'Selesai' : 'Pending',
      'Catatan': ret.notes || ''
    }));

    // Generate detailed sheet breakdown
    const detailData: any[] = [];
    let dIdx = 1;
    filteredReturns.forEach(ret => {
      ret.items.forEach(it => {
        detailData.push({
          'No': dIdx++,
          'No. Retur': ret.returnNumber,
          'Tanggal Retur': ret.date,
          'No. Faktur': ret.invoiceNumber,
          'Pelanggan': ret.customerName,
          'Nama Sepatu': it.productName,
          'Size': it.size,
          'Original Qty': it.originalQuantity,
          'Returned Qty': it.returnedQuantity,
          'Refund Price Per Pair': it.unitRefundPrice,
          'Line Refund Total': it.totalRefundValue,
          'Alasan Retur': it.reason === 'rusak_defect' ? 'Rusak / Defect' : 
                          it.reason === 'salah_ukuran' ? 'Salah Ukuran' :
                          it.reason === 'salah_model' ? 'Salah Model' :
                          it.reason === 'kelebihan_kirim' ? 'Kelebihan Kirim' : 'Lainnya',
          'Rincian Alasan': it.customReasonText || ''
        });
      });
    });

    exportToExcel(`Laporan_Retur_Sepatu_${new Date().toISOString().split('T')[0]}`, [
      { name: 'Summary Retur', data: summaryData },
      { name: 'Detail Item Retur', data: detailData }
    ]);
  };

  // Launch browser native print dialog with special classes
  const handlePrintNota = (ret: ProductReturn) => {
    setIsExportingNota(true);
    setSelectedReturnForPrint(ret);
    setTimeout(async () => {
      if (settings?.printMode === 'browser') {
        printViaBrowser('printing-report', () => {
          setSelectedReturnForPrint(null);
          setIsExportingNota(false);
        });
        return;
      }
      const filename = `Nota-Retur-${ret.returnNumber.replace(/\//g, '-')}.pdf`;
      await exportToPdf('printable-slip', { forceSinglePage: true, filename });
      setSelectedReturnForPrint(null);
      setIsExportingNota(false);
    }, 100);
  };

  const handlePrintBulkReport = () => {
    setIsExportingBulk(true);
    setShowBulkPrintPreview(true);
    setTimeout(async () => {
      if (settings?.printMode === 'browser') {
        printViaBrowser('printing-report', () => {
          setShowBulkPrintPreview(false);
          setIsExportingBulk(false);
        });
        return;
      }
      const filename = `Laporan-Rekapitulasi-Retur-${new Date().toISOString().split('T')[0]}.pdf`;
      await exportToPdf('printable-bulk-report', { forceSinglePage: false, filename });
      setShowBulkPrintPreview(false);
      setIsExportingBulk(false);
    }, 100);
  };

  // Calculations for page KPI cards
  const totalRefundGranted = filteredReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
  const totalVolumeReturned = filteredReturns.reduce((sum, r) => {
    return sum + r.items.reduce((iSum, it) => iSum + it.returnedQuantity, 0);
  }, 0);
  const potongTagihanTotal = filteredReturns
    .filter(r => r.refundType === 'potong_tagihan')
    .reduce((sum, r) => sum + r.totalRefundAmount, 0);
  const cashRefundTotal = filteredReturns
    .filter(r => r.refundType === 'tunai_kredit')
    .reduce((sum, r) => sum + r.totalRefundAmount, 0);

  return (
    <div className="space-y-6">
      {selectedReturnForView ? (
        <ReturnViewer
          returnItem={selectedReturnForView}
          onBack={() => setSelectedReturnForView(null)}
          onPrint={() => handlePrintNota(selectedReturnForView)}
          isPrinting={isExportingNota}
          settings={settings}
        />
      ) : (
        <>
          {/* 1. BUTTON HEADER WITH OVERVIEW TEXT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            Sistem Retur Produk & Pengembalian Dana
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Proses pengembalian produk cacat (defect), salah ukuran, atau penyesuaian tagihan faktur secara terperinci.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold leading-normal">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Ekspor Excel (XLSX)
          </button>
          <button
            onClick={handlePrintBulkReport}
            disabled={isExportingBulk}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isExportingBulk ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Mengekspor PDF...
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Cetak Laporan (PDF)
              </>
            )}
          </button>
          {(() => {
            const canReturn = hasActionAccess('canProcessReturn');
            return (
              <button
                disabled={!canReturn}
                onClick={() => {
                  if (canReturn) {
                    setIsCreating(true);
                  }
                }}
                className={`px-4 py-2 text-white rounded-xl transition shadow-md flex items-center gap-1.5 ${
                  canReturn
                    ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-80'
                }`}
                title={canReturn ? 'Proses Retur Baru' : 'Akses Dibatasi: Anda tidak memiliki izin memproses retur'}
              >
                <PlusCircle className="w-4 h-4" />
                {canReturn ? 'Buat Retur Baru' : 'Akses Terbatas'}
              </button>
            );
          })()}
        </div>
      </div>

      {/* 2. STATISTIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Total Nilai Refund</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-indigo-950 font-mono">{formatCurrency(totalRefundGranted)}</span>
          </div>
          <p className="text-[9px] text-slate-500 font-sans mt-1">Akumulasi kredit penyusutan</p>
          <div className="absolute top-2 right-2 p-1 text-indigo-600 bg-indigo-50 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Barang Diretur (Volume)</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-slate-900 font-mono">{totalVolumeReturned}</span>
            <span className="text-xs text-slate-500 font-bold font-sans">pasang</span>
          </div>
          <p className="text-[9px] text-slate-500 font-sans mt-1">Sepatu ditarik kembali ke gudang</p>
          <div className="absolute top-2 right-2 p-1 text-amber-600 bg-amber-50 rounded-lg">
            <Tag className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase font-sans">Pemotongan Tagihan</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-rose-850 font-mono">{formatCurrency(potongTagihanTotal)}</span>
          </div>
          <p className="text-[9px] text-slate-500 font-sans mt-1">Dieduksikan dari sisa faktur unpaid</p>
          <div className="absolute top-2 right-2 p-1 text-rose-600 bg-rose-50 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Kembalian Tunai/Kredit</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-emerald-850 font-mono">{formatCurrency(cashRefundTotal)}</span>
          </div>
          <p className="text-[9px] text-slate-500 font-sans mt-1">Tunai langsung / kredit simpanan</p>
          <div className="absolute top-2 right-2 p-1 text-emerald-600 bg-emerald-50 rounded-lg">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. NEW RETURN WIZARD MODAL FORM */}
      {isCreating && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Title Banner */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Pemrosesan Retur Produk Baru</h3>
                  <p className="text-[10px] text-slate-450 font-sans">Silakan pilih konsumen dan nomor faktur referensi</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition text-slate-350 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Working Body */}
            <form onSubmit={handleSubmitReturn} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Form Row 1: Select Customer & Invoice */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Choose Customer */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">1. Pilih Pelanggan</label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Hubungkan Pelanggan --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'khusus' ? 'Grosir' : 'Umum'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Choose Invoice based on Customer selection */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">2. Hubungkan No. Faktur</label>
                  <select
                    required
                    disabled={!formData.customerId}
                    value={formData.invoiceId}
                    onChange={(e) => handleSelectInvoice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 font-medium focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">
                      {!formData.customerId ? 'Pilih pelanggan dahulu' : '-- Pilih Faktur --'}
                    </option>
                    {currentCustomerInvoices.map(inv => {
                      const balance = inv.status === 'paid' ? 0 : (inv.remainingBalance !== undefined ? inv.remainingBalance : (inv.totalAmount - (inv.dpAmount || 0)));
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} (Tgl: {inv.date} | Sisa: {formatCurrency(balance)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Return trans. date */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Tanggal Retur</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 font-mono font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

              </div>

              {/* Form Row 2: Table detail list of returns */}
              {selectedInvoice ? (
                <div className="space-y-3.5 pt-4 border-t border-slate-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">3. Isi Rincian Kuantitas Retur Sepatu</h4>
                      <p className="text-[10px] text-slate-500 font-medium font-sans">
                        Faktur Rujukan: <span className="font-bold text-indigo-900">{selectedInvoice.invoiceNumber}</span> • Total volume asli: {selectedInvoice.totalPairs} pasang.
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Produk Sepatu</th>
                          <th className="py-2.5 px-3 text-center w-20">Size</th>
                          <th className="py-2.5 px-3 text-center w-28">Kuantitas Asli</th>
                          <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                          <th className="py-2.5 px-3 w-40 text-center">Jumlah Retur (Psg)</th>
                          <th className="py-2.5 px-3">Alasan Kerusakan / Retur</th>
                          <th className="py-2.5 px-3 text-right w-36">Total Refund</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 bg-white">
                        {formData.items.map((item, idx) => {
                          const isRetSelected = item.returnedQuantity > 0;
                          return (
                            <tr key={item.invoiceItemId} className={`transition ${isRetSelected ? 'bg-indigo-50/15' : 'hover:bg-slate-50/40'}`}>
                              <td className="py-3 px-3 font-semibold text-slate-800 text-xs">
                                {item.productName}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-indigo-950 font-mono">
                                {item.size}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                                {item.originalQuantity} psg
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-600">
                                {formatCurrency(item.unitRefundPrice)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mx-auto max-w-[120px]">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.originalQuantity}
                                    value={item.returnedQuantity || ''}
                                    placeholder="0"
                                    onChange={(e) => handleItemReturnQtyChange(idx, parseInt(e.target.value) || 0)}
                                    className="w-16 p-1.5 text-center text-xs font-bold rounded-lg border border-slate-250 bg-slate-50 focus:ring-1 focus:ring-indigo-500 font-mono"
                                  />
                                  <span className="text-[10px] text-slate-400 font-bold block">psg</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 space-y-1.5">
                                <select
                                  disabled={item.returnedQuantity === 0}
                                  value={item.reason}
                                  onChange={(e) => handleItemReasonChange(idx, e.target.value as any)}
                                  className="w-full p-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-semibold focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                  <option value="rusak_defect">Rusak / Defect Cacat</option>
                                  <option value="salah_ukuran">Salah Ukuran (Size)</option>
                                  <option value="salah_model">Salah Kirim Model</option>
                                  <option value="kelebihan_kirim">Kelebihan Kirim Qty</option>
                                  <option value="lainnya">Lainnya (Catatan)</option>
                                </select>
                                {item.reason === 'lainnya' && item.returnedQuantity > 0 && (
                                  <input
                                    type="text"
                                    required
                                    placeholder="Tulis alasan khusus..."
                                    value={item.customReasonText || ''}
                                    onChange={(e) => handleItemCustomReasonTextChange(idx, e.target.value)}
                                    className="w-full p-1.5 border border-slate-200 text-[10px] rounded focus:ring-1 focus:ring-indigo-500 font-medium"
                                  />
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-black font-mono text-indigo-950 text-xs">
                                {formatCurrency(item.returnedQuantity * item.unitRefundPrice)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>

                  {/* Calculations & Refund Methods */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-150">
                    <div className="space-y-4">
                      
                      {/* Refund Type Configuration */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">4. Metode Pengembalian Dana</label>
                        <div className="grid grid-cols-2 gap-3.5">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, refundType: 'potong_tagihan' }))}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                              formData.refundType === 'potong_tagihan' 
                              ? 'border-indigo-600 bg-indigo-50/20' 
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-xs font-bold text-slate-800">Potong Tagihan Unpaid</span>
                            <span className="block text-[9.5px] text-slate-450 leading-normal font-sans mt-0.5">Dieduksikan langsung dari sisa tagihan Faktur referensi ini.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, refundType: 'tunai_kredit' }))}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                              formData.refundType === 'tunai_kredit' 
                              ? 'border-indigo-600 bg-indigo-50/20' 
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-xs font-bold text-slate-800">Tunai / Kredit Manual</span>
                            <span className="block text-[9.5px] text-slate-450 leading-normal font-sans mt-0.5">Pengembalian manual menggunakan kas fisik, transfer bank, atau store credit.</span>
                          </button>
                        </div>
                      </div>

                      {/* Notes input */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Catatan Tambahan (Kronologi)</label>
                        <textarea
                          rows={2}
                          value={formData.notes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Contoh: Dus sepatu hancur di jalan, 5 pasang diganti cash, sisa dicairkan ke invoice..."
                          className="w-full p-2 border border-slate-205 text-xs rounded-xl focus:ring-1 focus:ring-indigo-500 font-medium"
                        />
                      </div>

                    </div>

                    {/* Detailed Math Display panel */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 font-sans">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Perhitungan Detail Penyesuaian</span>
                      
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Total Harga Faktur {selectedInvoice.invoiceNumber}:</span>
                          <span className="font-semibold text-slate-800 font-mono">{formatCurrency(selectedInvoice.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Sisa Tagihan Unpaid Saat Ini:</span>
                          <span className="font-extrabold text-slate-850 font-mono">
                            {formatCurrency(selectedInvoice.status === 'paid' ? 0 : (selectedInvoice.remainingBalance !== undefined ? selectedInvoice.remainingBalance : (selectedInvoice.totalAmount - (selectedInvoice.dpAmount || 0))))}
                          </span>
                        </div>
                        
                        <div className="flex justify-between pt-1.5 border-t border-slate-200 text-indigo-750">
                          <div className="flex items-center gap-1 font-semibold">
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>Total Taksiran Retur Refund:</span>
                          </div>
                          <span className="font-black font-mono text-xs">-{formatCurrency(draftTotalRefundAmount)}</span>
                        </div>

                        {formData.refundType === 'potong_tagihan' && (
                          <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 flex justify-between text-xs font-bold text-indigo-950 mt-2">
                            <span>Sisa Tagihan Akhir Baru:</span>
                            <span className="font-mono font-black">
                              {(() => {
                                const activeBalance = selectedInvoice.status === 'paid' ? 0 : (selectedInvoice.remainingBalance !== undefined ? selectedInvoice.remainingBalance : (selectedInvoice.totalAmount - (selectedInvoice.dpAmount || 0)));
                                return formatCurrency(Math.max(0, activeBalance - draftTotalRefundAmount));
                              })()}
                            </span>
                          </div>
                        )}
                        {formData.refundType === 'potong_tagihan' && (selectedInvoice.status === 'paid' ? 0 : (selectedInvoice.remainingBalance !== undefined ? selectedInvoice.remainingBalance : (selectedInvoice.totalAmount - (selectedInvoice.dpAmount || 0)))) < draftTotalRefundAmount && (
                          <div className="p-2 bg-yellow-50 text-[9.5px] rounded border border-yellow-250 text-yellow-800 flex items-start gap-1 pb-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p><strong>Awas:</strong> Nilai refund melebihi sisa sisa tagihan Faktur. Sisa tagihan akan dipotong menjadi Rp 0, dan selisih sebesar <strong>{formatCurrency(draftTotalRefundAmount - (selectedInvoice.status === 'paid' ? 0 : (selectedInvoice.remainingBalance !== undefined ? selectedInvoice.remainingBalance : (selectedInvoice.totalAmount - (selectedInvoice.dpAmount || 0)))))}</strong> disarankan dikembalikan secara Tunai.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-400" />
                  <span className="text-xs font-bold text-slate-550">Silakan hubungkan konsumen dan faktur rujukan terlebih dahulu untuk memuat rincian sepatu</span>
                </div>
              )}

            </form>

            {/* Modal Controls footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                disabled={draftTotalRefundAmount <= 0}
                onClick={handleSubmitReturn}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Proses & Simpan Retur
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. MAIN RETURNS RECORD TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        
        {/* Table Filters Panel */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search text */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Retur dsb. (No. Retur, Konsumen, No. Faktur)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Selector filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="p-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="completed">Selesai</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Metode:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="p-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Semua Metode</option>
                <option value="potong_tagihan">Potong Tagihan</option>
                <option value="tunai_kredit">Tunai / Kredit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Real table list */}
        <div className="overflow-x-auto">
          {filteredReturns.length > 0 ? (
            <table className="w-full min-w-[950px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]/none">
                  <th className="py-3 px-4 w-10 text-center">No</th>
                  <th className="py-3 px-4">No. Retur</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Faktur Referensi</th>
                  <th className="py-3 px-4">Konsumen</th>
                  <th className="py-3 px-4 text-center">Fisik (Pasang)</th>
                  <th className="py-3 px-4 text-right">Nilai Refund</th>
                  <th className="py-3 px-4 text-center">Metode Pengembalian</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white">
                {filteredReturns.map((ret, idx) => {
                  const itemsVol = ret.items.reduce((sum, item) => sum + item.returnedQuantity, 0);
                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/40 transition">
                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-950 font-sans">
                        <button
                          type="button"
                          onClick={() => setSelectedReturnForView(ret)}
                          className="hover:text-indigo-600 transition font-bold text-left underline decoration-dotted underline-offset-4 cursor-pointer"
                        >
                          {ret.returnNumber}
                        </button>
                      </td>
                      <td className="py-4 px-4 font-mono font-medium text-slate-550">
                        {ret.date}
                      </td>
                      <td className="py-4 px-4 font-semibold text-indigo-900 font-mono">
                        {ret.invoiceNumber}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {ret.customerName}
                      </td>
                      <td className="py-4 px-4 text-center font-bold font-mono">
                        {itemsVol} pasang
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-extrabold text-rose-800">
                        {formatCurrency(ret.totalRefundAmount)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {ret.refundType === 'potong_tagihan' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[9.5px] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-100">
                            Potong Faktur
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-[9.5px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                            Tunai/Kredit
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded uppercase">
                          Selesai
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReturnForView(ret)}
                            title="Tampilkan & Cetak Nota Retur"
                            className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-lg transition font-extrabold flex items-center gap-1 text-[10.5px] cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Nota
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReturn(ret.id)}
                            title="Hapus Retur & Pulihkan Tagihan"
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-350 mx-auto" />
              <p className="text-xs font-bold text-slate-500">
                Tidak ada data penarikan/retur barang yang cocok dengan kriteria filter saat ini.
              </p>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* 5. PRINT-ONLY ELEMENTS (HIDDEN FROM WEB WORKSPACE, ACTIVATES IN PRINT VIEW) */}
      
      {/* 5A. PRINT SLIP NOTA RETUR (FOR SINGLE RETURN) */}
      {selectedReturnForPrint && (
        <div id="printable-slip" className="hidden print:block w-[100%] max-w-[100%] text-slate-900 bg-white p-2 text-serif font-sans">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-1.5 py-4 border-b-2 border-double border-slate-400">
              <h2 className="text-xl font-extrabold tracking-tight">BUKTI RETUR SEPATU</h2>
              <p className="text-[13px] font-bold text-slate-800">ANGKASA JAYA SHOES</p>
              <p className="text-[9px] text-slate-500 font-mono">Penerimaan & Rekonsiliasi Mutu Barang • Tanggal Dokumen: {selectedReturnForPrint.date}</p>
            </div>

            {/* Meta Rows split */}
            <div className="grid grid-cols-2 gap-4 text-[11px] pb-3 border-b border-slate-250">
              <div className="space-y-1">
                <div>No. Retur: <span className="font-bold underline">{selectedReturnForPrint.returnNumber}</span></div>
                <div>Tanggal Proses: <span className="font-medium">{selectedReturnForPrint.date}</span></div>
                <div>Status Transaksi: <span className="font-extrabold text-slate-700">TERKOMPILASI SELESAI</span></div>
              </div>
              <div className="space-y-1 text-right">
                <div>Hubungan Konsumen: <span className="font-bold">{selectedReturnForPrint.customerName}</span></div>
                <div>Faktur Referensi: <span className="font-bold font-mono">{selectedReturnForPrint.invoiceNumber}</span></div>
                <div>Metode Refund: <span className="font-bold uppercase text-[9.5px]">{selectedReturnForPrint.refundType === 'potong_tagihan' ? 'POTONG SISA PIUTANG FAKTUR' : 'DANA TUNAI / CREDIT SYSTEM'}</span></div>
              </div>
            </div>

            {/* Product list Table */}
            <table className="w-full text-left text-[10px] border-collapse border border-slate-350">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-350 font-bold uppercase text-[9px] tracking-wide">
                  <th className="py-2 px-2 text-center w-8">No</th>
                  <th className="py-2 px-2">Keterangan Barang / Kelompok Sepatu</th>
                  <th className="py-2 px-2 text-center w-16">Size</th>
                  <th className="py-2 px-2 text-center w-24">Kuantitas Retur</th>
                  <th className="py-2 px-2 text-right">Nilai Harga Satuan</th>
                  <th className="py-2 px-2 text-right">Alasan Kerusakan</th>
                  <th className="py-2 px-2 text-right w-24">Jumlah Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedReturnForPrint.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-2 px-2 text-center font-mono">{idx + 1}</td>
                    <td className="py-2 px-2 font-semibold">{item.productName}</td>
                    <td className="py-2 px-2 text-center font-bold font-mono">{item.size}</td>
                    <td className="py-2 px-2 text-center font-bold">{item.returnedQuantity} pasang</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.unitRefundPrice)}</td>
                    <td className="py-2 px-2 text-right capitalize text-[9px]">
                      {item.reason === 'rusak_defect' ? 'Rusak / Defect' : 
                       item.reason === 'salah_ukuran' ? 'Salah Ukuran' :
                       item.reason === 'salah_model' ? 'Salah Model' :
                       item.reason === 'kelebihan_kirim' ? 'Kelebihan Kirim' : 'Lainnya'}
                       {item.customReasonText ? ` (${item.customReasonText})` : ''}
                    </td>
                    <td className="py-2 px-2 text-right font-bold font-mono">{formatCurrency(item.totalRefundValue)}</td>
                  </tr>
                ))}
                
                {/* Total row slip */}
                <tr className="bg-slate-50 font-extrabold border-t border-slate-350">
                  <td colSpan={3} className="py-2 px-2 text-right">TOTAL PENGEMBALIAN VOL & DANA:</td>
                  <td className="py-2 px-2 text-center font-mono font-black">{selectedReturnForPrint.items.reduce((sum, it) => sum + it.returnedQuantity, 0)} Pgs</td>
                  <td colSpan={2} />
                  <td className="py-2 px-2 text-right font-mono underline text-[11px] font-black">{formatCurrency(selectedReturnForPrint.totalRefundAmount)}</td>
                </tr>
              </tbody>
            </table>

            {/* Note row */}
            {selectedReturnForPrint.notes && (
              <div className="bg-slate-55 p-3 rounded border border-slate-200 text-[10px]">
                <strong className="block text-[8.5px] text-slate-500 uppercase tracking-tight">Keterangan Kronologi Serah Terima:</strong>
                <p className="mt-1 leading-relaxed italic text-slate-850">"{selectedReturnForPrint.notes}"</p>
              </div>
            )}

            {/* Signatures Panel */}
            <div className="pt-12 flex justify-between text-[11px] px-4 font-sans">
              <div className="w-1/3 text-center space-y-12">
                <span>Dipersiapkan Oleh,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8.5px] text-slate-500 block -mt-10 font-bold uppercase">Staf Administrasi</span>
              </div>
              <div className="w-1/3 text-center space-y-12">
                <span>Konsumen Penyerah,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8.5px] font-bold text-slate-700 block -mt-10 uppercase">{selectedReturnForPrint.customerName}</span>
              </div>
              <div className="w-1/3 text-center space-y-12">
                <span>Pemeriksa Gudang,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8.5px] text-slate-500 block -mt-10 font-bold uppercase">Supervisor Logistik</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5B. PRINT BULK REKAPITULASI RETURNS (FOR GENERAL MANAGEMENT REPORT) */}
      {showBulkPrintPreview && (
        <div id="printable-bulk-report" className="hidden print:block w-[100%] max-w-[100%] text-slate-900 bg-white p-2 font-serif font-sans">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-1.5 py-4 border-b-2 border-double border-slate-400">
              <h2 className="text-xl font-extrabold tracking-tight">LAPORAN REKAPITULASI RETUR BARANG</h2>
              <p className="text-[13px] font-bold text-slate-800">ANGKASA JAYA SHOES</p>
              <p className="text-[9px] text-slate-500 font-mono">Daftar Nota Rekonsiliasi & Refund • Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
            </div>

            {/* Table rekap */}
            <table className="w-full text-left text-[9px] border-collapse border border-slate-350">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-350 font-bold uppercase text-[8px] tracking-wide">
                  <th className="py-2 px-2 text-center w-8">No</th>
                  <th className="py-2 px-2">No. Retur</th>
                  <th className="py-2 px-2">Tanggal</th>
                  <th className="py-2 px-2">Faktur Terkait</th>
                  <th className="py-2 px-2">Nama Konsumen</th>
                  <th className="py-2 px-2 text-center">Volume (Psg)</th>
                  <th className="py-2 px-2 text-center">Metode Refund</th>
                  <th className="py-2 px-2 text-right">Nilai Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReturns.map((ret, idx) => (
                  <tr key={ret.id}>
                    <td className="py-2 px-2 text-center font-mono">{idx + 1}</td>
                    <td className="py-2 px-2 font-bold">{ret.returnNumber}</td>
                    <td className="py-2 px-2 font-mono">{ret.date}</td>
                    <td className="py-2 px-2 font-mono font-medium">{ret.invoiceNumber}</td>
                    <td className="py-2 px-2 font-semibold">{ret.customerName}</td>
                    <td className="py-2 px-2 text-center font-mono font-bold">{ret.items.reduce((sum, i) => sum + i.returnedQuantity, 0)} Pgs</td>
                    <td className="py-2 px-2 text-center capitalize text-[8.5px]">{ret.refundType === 'potong_tagihan' ? 'Potong Faktur' : 'Tunai / Kredit'}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold">{formatCurrency(ret.totalRefundAmount)}</td>
                  </tr>
                ))}

                {/* Aggregation */}
                <tr className="bg-slate-100 font-extrabold border-t border-slate-350">
                  <td colSpan={5} className="py-2 px-2 text-right">GRAND TOTAL RETUR:</td>
                  <td className="py-2 px-2 text-center font-mono font-black">{totalVolumeReturned} Pgs</td>
                  <td className="py-2 px-2" />
                  <td className="py-2 px-2 text-right font-mono text-[11px] font-black">{formatCurrency(totalRefundGranted)}</td>
                </tr>
              </tbody>
            </table>

            {/* Note audit */}
            <p className="text-[9.5px] font-medium text-slate-500 italic">
              * Laporan ini ditarik berdasarkan data terfilter pada tanggal {new Date().toLocaleDateString('id-ID')}. Data mutasi fisik sepatu di atas dicocokkan dengan ketersediaan fisik stok di gudang utama.
            </p>

            {/* Signatures Panel */}
            <div className="pt-12 flex justify-between text-[11px] px-4 font-sans">
              <div className="w-1/3 text-center space-y-12">
                <span>Dipersiapkan Oleh,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8.5px] text-slate-500 block -mt-10 font-bold uppercase">Staf Piutang Dagang</span>
              </div>
              <div className="w-1/3 text-center space-y-12">
                <span>Diverifikasi Oleh,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8.5px] text-slate-500 block -mt-10 font-bold uppercase">Supervisor Logistik</span>
              </div>
              <div className="w-1/3 text-center space-y-12">
                <span>Menyetujui,</span>
                <span className="block border-b border-slate-400 w-32 mx-auto" />
                <span className="text-[8.5px] text-slate-500 block -mt-10 font-bold uppercase">Kepala Gudang Utama</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
