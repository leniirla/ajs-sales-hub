/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Invoice, SystemSettings, AppUserPermissions, PaymentProof } from '../types';
import { formatCurrency, exportToExcel, showToast } from '../utils';
import { Printer, Download, ArrowLeft, Send, Check, Truck, RefreshCw, Upload, Camera, CreditCard, History, Trash2, Pencil } from 'lucide-react';
import { CompanyLogo } from './Logo';
import { exportToPdf } from '../utils/pdfExport';
import CameraModal from './CameraModal';

interface InvoiceViewerProps {
  invoice: Invoice;
  onBack: () => void;
  onMarkPaid?: (id: string) => void;
  onViewSuratJalan?: (invoiceId: string) => void;
  onUpdateInvoice?: (updatedInvoice: Invoice) => void;
  settings?: SystemSettings;
  hasActionAccess?: (actionId: keyof AppUserPermissions) => boolean;
}

export default function InvoiceViewer({ invoice, onBack, onMarkPaid, onViewSuratJalan, onUpdateInvoice, settings, hasActionAccess }: InvoiceViewerProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  const canPayInvoice = hasActionAccess ? hasActionAccess('canPayInvoice') : true;
  const canManageInstallments = hasActionAccess ? hasActionAccess('canManageInstallments') : true;

  const [isExporting, setIsExporting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activeProofZoomUrl, setActiveProofZoomUrl] = useState<string | null>(null);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfFormat, setPdfFormat] = useState<'a4' | 'a5' | 'letter' | 'legal' | 'f4'>('a4');

  // "Riwayat Pembayaran & Cicilan" preview modal â€” read-only, no add/edit
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalTab, setHistoryModalTab] = useState<'riwayat' | 'bukti'>('riwayat');

  // Edit / delete individual installment entries (requires canManageInstallments)
  const [editingPayment, setEditingPayment] = useState<{ id: string; amount: string; date: string; note: string } | null>(null);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState<string | null>(null);

  // "Tandai Pembayaran" modal â€” 2-step: (1) detail pembayaran, (2) upload bukti transaksi
  const [showPayModal, setShowPayModal] = useState(false);
  const [payModalStep, setPayModalStep] = useState<1 | 2>(1);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payModalProofs, setPayModalProofs] = useState<PaymentProof[]>([]);
  const [isPayCameraOpen, setIsPayCameraOpen] = useState(false);

  const openPayModal = () => {
    setPayModalStep(1);
    setPayAmount(computedRemainingBalance > 0 ? String(computedRemainingBalance) : '');
    setPayNote('');
    setPayModalProofs([]);
    setShowPayModal(true);
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setPayModalStep(1);
    setPayAmount('');
    setPayNote('');
    setPayModalProofs([]);
    setIsPayCameraOpen(false);
  };

  const handlePayFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = reader.result as string;
      setPayModalProofs((prev) => [...prev, { url: img, description: '' }]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePayProof = (index: number) => {
    setPayModalProofs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGoToProofStep = () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Jumlah pembayaran harus lebih besar dari 0!', 'error');
      return;
    }
    if (amt > computedRemainingBalance) {
      showToast(`Jumlah pembayaran melebihi sisa tagihan (${formatCurrency(computedRemainingBalance)})!`, 'error');
      return;
    }
    setPayModalStep(2);
  };

  const handleConfirmPayment = () => {
    if (payModalProofs.length === 0) {
      showToast('Unggah minimal 1 bukti transaksi sebelum menyimpan pembayaran.', 'error');
      return;
    }
    if (!onUpdateInvoice) return;

    const amt = parseFloat(payAmount);
    const isSettlement = amt >= computedRemainingBalance;
    const newPayment: { id: string; amount: number; date: string; note: string; type: 'installment' | 'settlement' } = {
      id: Math.random().toString(36).substring(2, 9),
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      note: payNote.trim(),
      type: isSettlement ? 'settlement' : 'installment',
    };

    const existingProofs = proofs.map((p) => (typeof p === 'string' ? { url: p, description: '' } : p));
    const mergedProofs = [...existingProofs, ...payModalProofs];
    const newRemaining = Math.max(0, computedRemainingBalance - amt);

    onUpdateInvoice({
      ...invoice,
      paymentProofUrls: mergedProofs,
      paymentProofUrl: mergedProofs[0]?.url,
      payments: [...payments, newPayment],
      status: newRemaining <= 0 ? 'paid' : 'unpaid',
      remainingBalance: newRemaining,
    });
    showToast(newRemaining <= 0 ? 'Faktur berhasil ditandai lunas!' : 'Pembayaran berhasil dicatat!', 'success');
    closePayModal();
  };

  const proofs = invoice.paymentProofUrls || (invoice.paymentProofUrl ? [invoice.paymentProofUrl] : []);
  const payments = invoice.payments || [];
  const totalPaidFromPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  // Status "Lunas" selalu jadi acuan utama — jaga-jaga untuk faktur lama yang belum punya
  // entri riwayat pembayaran yang cocok, supaya sisa tagihan tidak salah tampil.
  const totalPaid = invoice.status === 'paid' ? invoice.totalAmount : (invoice.dpAmount || 0) + totalPaidFromPayments;
  const computedRemainingBalance = invoice.status === 'paid' ? 0 : Math.max(0, invoice.totalAmount - totalPaid);

  const openEditPayment = (p: { id: string; amount: number; date: string; note?: string }) => {
    setEditingPayment({ id: p.id, amount: String(p.amount), date: p.date, note: p.note || '' });
  };

  const closeEditPayment = () => setEditingPayment(null);

  const saveEditPayment = () => {
    if (!onUpdateInvoice || !editingPayment) return;
    const amt = parseFloat(editingPayment.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Jumlah pembayaran harus lebih besar dari 0!', 'error');
      return;
    }
    const updatedPayments = payments.map((p) =>
      p.id === editingPayment.id
        ? { ...p, amount: amt, date: editingPayment.date, note: editingPayment.note.trim() }
        : p
    );
    const newTotalPaid = (invoice.dpAmount || 0) + updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = Math.max(0, invoice.totalAmount - newTotalPaid);
    onUpdateInvoice({
      ...invoice,
      payments: updatedPayments,
      status: newRemaining <= 0 ? 'paid' : 'unpaid',
      remainingBalance: newRemaining,
    });
    showToast('Riwayat cicilan berhasil diperbarui!', 'success');
    closeEditPayment();
  };

  const confirmDeletePayment = () => {
    if (!onUpdateInvoice || !paymentIdToDelete) return;
    const updatedPayments = payments.filter((p) => p.id !== paymentIdToDelete);
    const newTotalPaid = (invoice.dpAmount || 0) + updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = Math.max(0, invoice.totalAmount - newTotalPaid);
    onUpdateInvoice({
      ...invoice,
      payments: updatedPayments,
      status: newRemaining <= 0 ? 'paid' : 'unpaid',
      remainingBalance: newRemaining,
    });
    showToast('Riwayat cicilan berhasil dihapus!', 'success');
    setPaymentIdToDelete(null);
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowPrintModal(true);
  };

  // Export specific invoice to Excel format as requested!
  const handleExportSingleExcel = () => {
    const sheetData = invoice.items.map((item, index) => ({
      'No': index + 1,
      'Nama Barang': item.productName,
      'Ukuran/Size': item.size,
      'Unit Tambahan Size': item.sizeSurcharge,
      'Jumlah (Pasang)': item.quantity,
      'Harga Dasar': item.negotiatedBasePrice,
      'Harga Satuan (Net)': item.unitPrice,
      'Subtotal': item.totalPrice,
    }));

    // Add extra row for packing if checked
    if (invoice.wantsPacking) {
      const label = 'Jasa Packing Koli';
      const unitPackingFee = 20000;
      sheetData.push({
        'No': sheetData.length + 1,
        'Nama Barang': `${label} (${invoice.koliCount} Koli)`,
        'Ukuran/Size': 0,
        'Unit Tambahan Size': 0,
        'Jumlah (Pasang)': invoice.koliCount,
        'Harga Dasar': unitPackingFee,
        'Harga Satuan (Net)': unitPackingFee,
        'Subtotal': invoice.packingFee,
      });
    }

    if (invoice.hasOngkir && invoice.ongkirAmount) {
      sheetData.push({
        'No': sheetData.length + 1,
        'Nama Barang': 'Biaya Ongkos Kirim (Ongkir)',
        'Ukuran/Size': 0,
        'Unit Tambahan Size': 0,
        'Jumlah (Pasang)': 1,
        'Harga Dasar': invoice.ongkirAmount,
        'Harga Satuan (Net)': invoice.ongkirAmount,
        'Subtotal': invoice.ongkirAmount,
      });
    }

    const docName = `Faktur_${invoice.invoiceNumber.replace(/\//g, '_')}`;
    const summaryMeta = [
      { 'Metrik': 'Nomor Faktur', 'Detail': invoice.invoiceNumber },
      { 'Metrik': 'Penerima', 'Detail': invoice.customerName },
      { 'Metrik': 'Tanggal', 'Detail': invoice.date },
      { 'Metrik': 'Mata Uang', 'Detail': 'IDR' },
      { 'Metrik': 'Jumlah Pasang', 'Detail': invoice.totalPairs },
      { 'Metrik': 'Subtotal Sepatu', 'Detail': invoice.subtotal },
    ];
    if (invoice.wantsPacking) {
      summaryMeta.push({ 'Metrik': 'Biaya Packing', 'Detail': invoice.packingFee });
    }
    if (invoice.hasOngkir && invoice.ongkirAmount) {
      summaryMeta.push({ 'Metrik': 'Biaya Ongkos Kirim (Ongkir)', 'Detail': invoice.ongkirAmount });
    }
    if (invoice.ppnAmount !== undefined && invoice.ppnAmount > 0) {
      summaryMeta.push({ 'Metrik': `Pajak PPN (${invoice.taxRate}%)`, 'Detail': invoice.ppnAmount });
    }
    summaryMeta.push({ 'Metrik': 'Total Pembayaran', 'Detail': invoice.totalAmount });

    exportToExcel(docName, [
      { name: 'Detail Faktur', data: sheetData },
      {
        name: 'Ringkasan',
        data: summaryMeta
      }
    ]);
  };

  return (
    <div id="invoice-viewer-workspace" className="space-y-6">

      {/* Action Controller */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-xl shadow-xs print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 font-medium transition self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Laporan
        </button>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          {invoice.status === 'unpaid' && onUpdateInvoice && (
            <button
              disabled={!canPayInvoice}
              onClick={() => {
                if (canPayInvoice) openPayModal();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition ${
                canPayInvoice
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              title={canPayInvoice ? 'Catat Pembayaran & Unggah Bukti Transaksi' : 'Akses Dibatasi: Anda tidak memiliki izin melunasi faktur'}
            >
              <Check className="w-3.5 h-3.5" />
              Tandai Pembayaran
            </button>
          )}

          <button
            onClick={() => {
              setHistoryModalTab('riwayat');
              setShowHistoryModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Lihat Riwayat Pembayaran & Cicilan (Preview)"
          >
            <History className="w-3.5 h-3.5" />
            Riwayat
          </button>

          <button
            onClick={handleExportSingleExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700/90 rounded-lg text-sm font-medium transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Ekspor Excel
          </button>

          {onViewSuratJalan && (
            <button
              onClick={() => onViewSuratJalan(invoice.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              Surat Jalan
            </button>
          )}

          <button
            onClick={handlePrint}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Mengekspor PDF...
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Cetak Faktur (PDF)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Printable Invoice Card */}
      <div className="bg-white border border-slate-300 rounded-2xl max-w-4xl mx-auto shadow-sm overflow-hidden print:border-0 print:shadow-none">
        
        {/* Render area captured for printers */}
        <div ref={invoiceRef} id="printable-invoice" className="p-8 sm:p-12 space-y-8 text-slate-800 bg-white print:p-0 select-none">
          
          <div className="pdf-page bg-white space-y-8 pb-4">
            {/* Invoice Paper Header */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch gap-6 border-b-2 border-slate-200 pb-6">
            <div className="space-y-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-indigo-50 text-indigo-700 uppercase print:hidden">
                Official Invoice
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none">FAKTUR PENJUALAN</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-450 font-medium">Nomor Faktur:</span>
                <span className="font-mono text-sm text-indigo-600 font-bold tracking-wide">{invoice.invoiceNumber}</span>
              </div>
              <div className="text-xs text-slate-500">Tanggal Faktur: <b className="text-slate-700">{invoice.date}</b></div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right space-y-1">
                <div className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-tight uppercase">
                  {settings?.companyName || 'ANGKASA JAYA SHOES'}
                </div>
                <p className="text-xs text-slate-500 max-w-xs leading-normal ml-auto">
                  {settings?.companyAddress || 'Jl. Angkasa Mekar I No.59, Cangkuang Kulon, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat 40239'}
                </p>
                <p className="text-xs text-slate-450 font-medium">
                  {settings?.companyPhone || 'Telp: (022) 540-39423 | WA: 0812-1122-3344'}
                </p>
              </div>
              <CompanyLogo size={72} className="shrink-0 text-slate-800" logoUrl={settings?.companyLogoUrl} />
            </div>
          </div>

          {/* Customer / Consignee Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-150 p-6 rounded-xl">
            <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-6">
              <span className="block text-[10px] uppercase tracking-wider font-extrabold text-indigo-500">Penerima Faktur / Pelanggan</span>
              <div className="font-extrabold text-slate-850 text-lg leading-snug">{invoice.customerName}</div>
              {invoice.customerPhone && (
                <div className="flex items-center gap-1.5 text-xs text-slate-650">
                  <span className="font-medium text-slate-400">Telp:</span>
                  <span className="font-semibold text-slate-700">{invoice.customerPhone}</span>
                </div>
              )}
              {invoice.customerAddress ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Alamat Pelanggan:</span>
                  <p className="leading-relaxed text-slate-705 bg-white p-2.5 rounded-lg border border-slate-150 shadow-2xs">
                    {invoice.customerAddress}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic block">Tanpa alamat pelanggan</span>
              )}
            </div>

            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="block text-[10px] uppercase tracking-wider font-extrabold text-indigo-500">Informasi Pembayaran & Pengiriman</span>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">STATUS TRANSAKSI</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase mt-1 ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-850 border border-emerald-250' : 'bg-rose-100 text-rose-850 border border-rose-250'}`}>
                      {invoice.status === 'paid' ? 'LUNAS / SELESAI' : 'BELUM LUNAS'}
                    </span>
                  </div>
                  {invoice.wantsPacking && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">VOLUME PACKING</span>
                      <span className="font-bold text-slate-750 block mt-1">
                        {invoice.koliCount} Koli
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {invoice.notes && (
                <div className="text-xs bg-amber-50/50 p-2.5 rounded-lg border border-amber-150/60">
                  <span className="font-extrabold block text-amber-800 text-[10px] uppercase tracking-wider">Catatan Pengiriman:</span>
                  <p className="text-amber-900 mt-0.5 italic">"{invoice.notes}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Table List */}
          <div className="sm:hidden text-center text-[10px] text-indigo-700 bg-indigo-50/50 py-1.5 px-2 rounded-lg font-semibold select-none mb-1 print:hidden">
            â† Geser tabel ke samping untuk rincian selengkapnya â†’
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-350 bg-slate-100/50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-4 w-5/12 rounded-l-lg">Model Sepatu</th>
                  <th className="py-3 px-2 text-center w-1/12">Size</th>
                  <th className="py-3 px-2 text-center w-2/12">Kuantitas</th>
                  <th className="py-3 px-3 text-right w-2/12">Harga Satuan</th>
                  <th className="py-3 px-3 text-right w-1/12">Surcharge</th>
                  <th className="py-3 px-4 text-right w-2/12 rounded-r-lg">Total Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {invoice.items.map((item) => (
                  <tr key={item.id} className="text-slate-800 hover:bg-slate-50/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.productName}</td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                        {item.size}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-700">{item.quantity} pasang</td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-slate-600">{formatCurrency(item.negotiatedBasePrice)}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      {item.sizeSurcharge > 0 ? (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                          +{formatCurrency(item.sizeSurcharge)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-slate-905">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}

                {/* Additional services - Packing rows if checked */}
                {invoice.wantsPacking && (
                  <tr className="text-slate-800 bg-indigo-50/25">
                    <td className="py-3.5 px-4 italic font-semibold text-indigo-900" colSpan={2}>
                      âœ“ Jasa Packing Koli ({invoice.koliCount} koli @ {formatCurrency(20000)})
                    </td>
                    <td className="py-3.5 px-2 text-center font-bold text-indigo-950">{invoice.koliCount} koli</td>
                    <td className="py-3.5 px-3 text-right font-mono text-xs text-indigo-900">{formatCurrency(20000)}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-400">-</td>
                    <td className="py-3.5 px-4 text-right font-bold font-mono text-indigo-950">{formatCurrency(invoice.packingFee)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Computations totals on the invoice foot */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-end sm:items-start gap-4 pt-4 border-t border-slate-200">
            
            {/* Guarantee / Signature */}
            <div className="text-xs text-slate-500 max-w-sm space-y-1 print:text-[10px]">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">Syarat & Ketentuan:</span>
              {settings?.warehouseTerms && settings.warehouseTerms.length > 0 ? (
                settings.warehouseTerms.map((term, i) => {
                  if (term.includes("131-00-1122-3344")) {
                    const parts = term.split("131-00-1122-3344");
                    return (
                      <p key={i}>
                        â€¢ {parts[0]}<b>131-00-1122-3344</b>{parts[1]}
                      </p>
                    );
                  }
                  return <p key={i}>â€¢ {term}</p>;
                })
              ) : (
                <>
                  <p>â€¢ Barang yang sudah dibeli dengan invoice ini tidak dapat ditukar kecuali ada reject produksi dalam 7 hari.</p>
                  <p>â€¢ Pembayaran transfer resmi ditujukan ke Rek. Mandiri: <b>131-00-1122-3344</b> a.n PT Sentra Angkasa Jaya.</p>
                </>
              )}
            </div>

            {/* Calculations summaries */}
            <div className="w-full sm:w-85 bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2.5 text-xs shadow-2xs">
              <div className="flex justify-between text-slate-550">
                <span>Total Volume Order:</span>
                <span className="font-bold text-slate-800">{invoice.totalPairs} Pasang</span>
              </div>
              <div className="flex justify-between text-slate-550">
                <span>Subtotal Sepatu:</span>
                <span className="font-mono font-semibold text-slate-850">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.wantsPacking && (
                <div className="flex justify-between text-slate-550">
                  <span>Biaya Rental Packing:</span>
                  <span className="font-mono font-semibold text-slate-850">{formatCurrency(invoice.packingFee)}</span>
                </div>
              )}
              {invoice.ppnAmount !== undefined && invoice.ppnAmount > 0 && (
                <div className="flex justify-between text-slate-550">
                  <span>Pajak PPN ({invoice.taxRate}%):</span>
                  <span className="font-mono font-semibold text-slate-850">{formatCurrency(invoice.ppnAmount)}</span>
                </div>
              )}
              {invoice.hasOngkir && invoice.ongkirAmount !== undefined && invoice.ongkirAmount > 0 && (
                <div className="flex justify-between text-slate-550">
                  <span>Ongkos Kirim (Biaya Ongkir):</span>
                  <span className="font-mono font-semibold text-slate-850">{formatCurrency(invoice.ongkirAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xs font-extrabold border-t border-slate-200 pt-2.5 text-slate-800">
                <span>TOTAL AKHIR (NETTO):</span>
                <span className="font-mono text-sm text-indigo-700">{formatCurrency(invoice.totalAmount)}</span>
              </div>

              {/* Payment Summary breakdown on printed invoice */}
              <div className="border-t border-slate-200 pt-2 space-y-1 text-[11px] text-slate-600">
                {invoice.dpAmount !== undefined && invoice.dpAmount > 0 && (
                  <div className="flex justify-between bg-amber-50/30 p-1 rounded border border-amber-100/50">
                    <span className="font-semibold text-amber-800">Uang Muka (DP):</span>
                    <span className="font-mono font-bold text-amber-850">-{formatCurrency(invoice.dpAmount)}</span>
                  </div>
                )}
                
                {payments.map((p, idx) => (
                  <div key={p.id || idx} className="flex justify-between bg-emerald-50/20 p-1 rounded border border-emerald-100/40">
                    <span className="font-semibold text-emerald-800">Bayar ({p.date}) {p.note ? `[${p.note}]` : ''}:</span>
                    <span className="font-mono font-bold text-emerald-850">-{formatCurrency(p.amount)}</span>
                  </div>
                ))}

                <div className="flex justify-between text-sm font-extrabold border-t-2 border-indigo-200 pt-2.5 text-slate-900">
                  <span>SISA TAGIHAN FAKTUR:</span>
                  <span className={`font-mono ${computedRemainingBalance <= 0 ? 'text-emerald-600 text-base' : 'text-rose-600 text-base'}`}>
                    {computedRemainingBalance <= 0 ? 'Rp 0 (LUNAS)' : formatCurrency(computedRemainingBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

                  {/* Signature fields */}
          <div className="grid grid-cols-2 text-center text-xs text-slate-500 pt-12 gap-4 border-t border-slate-100">
            <div className="space-y-12">
              <p className="font-medium text-slate-450 uppercase tracking-wider text-[10px]">Tanda Terima Pembeli,</p>
              <div className="space-y-1">
                <div className="w-32 mx-auto border-b border-dashed border-slate-300"></div>
                <p className="font-semibold text-slate-850">({invoice.customerName})</p>
              </div>
            </div>
            <div className="space-y-12">
              <p className="font-medium text-slate-450 uppercase tracking-wider text-[10px]">Hormat Kami,</p>
              <div className="space-y-1">
                <div className="w-32 mx-auto border-b border-dashed border-slate-300"></div>
                <p className="font-semibold text-slate-850 hover:text-slate-900 transition">(Staff Keuangan)</p>
              </div>
            </div>
          </div>

          </div> {/* Closing pdf-page wrapper */}

          {/* Section: Printed Payment Proof Lampiran (visible on prints/PDFs) */}
          {proofs.map((proof, index) => {
            const p = typeof proof === 'string' ? { url: proof, description: '' } : proof;
            return (
              <div key={index} className="pdf-page bg-white pt-8 border-t-2 border-dashed border-slate-200 break-before-page page-break-before">
                <div className="text-center space-y-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-indigo-50 text-indigo-700 uppercase">
                    Lampiran Bukti Transaksi #{index + 1}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-805">BUKTI TRANSFER / PEMBAYARAN RESMI</h3>
                  
                  {p.description ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-w-md mx-auto text-xs text-slate-700 font-medium italic mt-2 leading-relaxed">
                      Keterangan: "{p.description}"
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Dokumen gambar di bawah ini terlampir secara otomatis sebagai bukti pembayaran sah dari nomor faktur {invoice.invoiceNumber}.
                    </p>
                  )}

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-w-md mx-auto shadow-2xs mt-4 bg-slate-50 p-2">
                    <img
                      src={p.url}
                      alt={`Lampiran Bukti Pembayaran ${index + 1}`}
                      className="w-full object-contain max-h-[500px] rounded-lg"
                    />
                  </div>
                </div>
              </div>
            );
          })}
 
        </div>
 
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
                  const filename = `Faktur_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`;
                  await exportToPdf('printable-invoice', { 
                    forceSinglePage: proofs.length > 0 ? false : true, 
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

      {/* Riwayat Pembayaran & Cicilan — preview modal (read-only) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Riwayat Pembayaran & Cicilan</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
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
                    {invoice.dpAmount !== undefined && invoice.dpAmount > 0 && (
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-indigo-700 font-extrabold uppercase text-[10px] tracking-wider">Uang Muka (DP)</td>
                        <td className="py-3 px-3 text-slate-500">{invoice.date}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">{formatCurrency(invoice.dpAmount)}</td>
                        <td className="py-3 px-3 text-slate-450 italic font-normal">Uang muka saat pembuatan faktur</td>
                        {canManageInstallments && <td className="py-3 px-3"></td>}
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

                    {invoice.status === 'paid' && Math.max(0, invoice.totalAmount - (invoice.dpAmount || 0) - totalPaidFromPayments) > 0 && (
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-rose-700 font-extrabold uppercase text-[10px] tracking-wider">Lunas</td>
                        <td className="py-3 px-3 text-slate-500">{invoice.date}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">
                          {formatCurrency(Math.max(0, invoice.totalAmount - (invoice.dpAmount || 0) - totalPaidFromPayments))}
                        </td>
                        <td className="py-3 px-3 text-slate-450 italic font-normal">Faktur tercatat lunas</td>
                        {canManageInstallments && <td className="py-3 px-3"></td>}
                      </tr>
                    )}

                    {(!invoice.dpAmount || invoice.dpAmount === 0) && payments.length === 0 && invoice.status !== 'paid' ? (
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
                    <span className="text-xs font-black text-slate-900 font-mono">{formatCurrency(invoice.totalAmount)}</span>
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
                      Belum Lunas ({invoice.totalAmount > 0 ? Math.round((totalPaid / invoice.totalAmount) * 100) : 0}% Terbayar)
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
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveProofZoomUrl(p.url)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold rounded-lg transition shadow cursor-pointer"
                            >
                              Lihat Fullscreen
                            </button>
                          </div>
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
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Riwayat Cicilan Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
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

            <div className="p-5 space-y-4">
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
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-150 flex justify-end gap-2">
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

      {/* Tandai Pembayaran — 2-step modal: (1) detail pembayaran, (2) bukti transaksi */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {payModalStep === 1 ? (
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Upload className="w-5 h-5 text-indigo-600" />
                )}
                <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  {payModalStep === 1
                    ? 'Tandai Pembayaran — Detail Pembayaran'
                    : `Bukti Transaksi (${payModalProofs.length} Foto Pembayaran)`}
                </span>
              </div>
              <button
                type="button"
                onClick={closePayModal}
                className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
            </div>

            <div className="px-5 pt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${payModalStep === 1 ? 'bg-indigo-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>1</span>
              <span className={payModalStep === 1 ? 'text-indigo-700' : 'text-emerald-700'}>Detail Pembayaran</span>
              <span className="flex-1 h-px bg-slate-200" />
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${payModalStep === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
              <span className={payModalStep === 2 ? 'text-indigo-700' : 'text-slate-400'}>Bukti Transaksi</span>
            </div>

            {payModalStep === 1 ? (
              <div className="flex-1 overflow-auto p-5 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wide">Sisa Tagihan Saat Ini</span>
                  <span className="font-black text-rose-700 font-mono text-sm">{formatCurrency(computedRemainingBalance)}</span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Jumlah Pembayaran</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={payAmount ? Number(payAmount).toLocaleString('id-ID') : ''}
                      onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className={`w-full bg-white border rounded-xl pl-9 pr-3.5 py-2.5 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 ${
                        parseFloat(payAmount) > computedRemainingBalance
                          ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-650'
                      }`}
                    />
                  </div>
                  {parseFloat(payAmount) > computedRemainingBalance && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">
                      Jumlah pembayaran tidak boleh lebih dari sisa tagihan ({formatCurrency(computedRemainingBalance)}).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-extrabold uppercase mb-1">Catatan (Opsional)</label>
                  <textarea
                    rows={2}
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="Contoh: Transfer Mandiri / Cash Toko"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <label className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-3xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    Unggah Slip (File)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePayFileUpload(file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsPayCameraOpen(true)}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Ambil Foto Kamera
                  </button>
                </div>

                {payModalProofs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {payModalProofs.map((p, index) => (
                      <div key={index} className="flex flex-col border border-slate-150 rounded-xl p-3 bg-slate-50/30 gap-2.5">
                        <div className="relative aspect-video w-full bg-slate-900 border border-slate-200 rounded-lg overflow-hidden shadow-3xs group">
                          <img
                            src={p.url}
                            alt={`Bukti Pembayaran #${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveProofZoomUrl(p.url)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold rounded-lg transition shadow cursor-pointer"
                            >
                              Lihat Fullscreen
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Keterangan Manual:</label>
                          <textarea
                            rows={2}
                            value={p.description || ''}
                            placeholder="Contoh: DP 50% via Mandiri / Pelunasan Cash..."
                            onChange={(e) => {
                              setPayModalProofs((prev) => prev.map((item, i) =>
                                i === index ? { ...item, description: e.target.value } : item
                              ));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none leading-normal"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <span className="font-extrabold text-slate-500 uppercase tracking-wider">Bukti #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePayProof(index)}
                            className="text-red-650 hover:text-red-800 font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50 text-center">
                    <p className="text-xs text-slate-450 font-medium">Belum ada bukti transaksi yang diunggah. Unggah minimal 1 foto untuk menyimpan pembayaran.</p>
                  </div>
                )}
              </div>
            )}

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-150 flex justify-end gap-2">
              {payModalStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={closePayModal}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={parseFloat(payAmount) > computedRemainingBalance}
                    onClick={handleGoToProofStep}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
                  >
                    Lanjut ke Bukti Transaksi
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPayModalStep(1)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
                  >
                    Simpan Pembayaran
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isPayCameraOpen && (
        <CameraModal
          onClose={() => setIsPayCameraOpen(false)}
          onCapture={(img) => {
            setPayModalProofs((prev) => [...prev, { url: img, description: '' }]);
            setIsPayCameraOpen(false);
            showToast("Foto bukti transaksi berhasil diambil!", "success");
          }}
        />
      )}

      {/* Proof zoom popup modal */}
      {activeProofZoomUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-xs p-4 animate-fade-in print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Tinjau Bukti Transaksi</span>
              <button
                type="button"
                onClick={() => setActiveProofZoomUrl(null)}
                className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Kembali
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 bg-slate-950 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              <img
                src={activeProofZoomUrl}
                alt="Bukti Pembayaran Zoom"
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveProofZoomUrl(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup / Kembali
              </button>
            </div>
          </div>
        </div>
      )}
 
    </div>
  );
}
