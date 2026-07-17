/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, Salesman, AppUserPermissions, SystemSettings } from '../types';
import { formatCurrency, exportToExcel, showToast } from '../utils';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Download, 
  X, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Coins,
  FileSpreadsheet,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldAlert,
  Printer,
  RefreshCw
} from 'lucide-react';
import { exportToPdf } from '../utils/pdfExport';
import { CompanyLogo } from './Logo';
import * as commissionsApi from '../api/commissions';

interface CommissionManagerProps {
  salesmen: Salesman[];
  invoices: Invoice[];
  onAddSalesman: (s: Salesman) => void;
  onUpdateSalesman: (s: Salesman) => void;
  onDeleteSalesman: (id: string) => void;
  onUpdateInvoices: (invoices: Invoice[]) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onAddActivity?: (
    actionType: 'create' | 'update' | 'delete' | 'payment' | 'other',
    category: 'invoice' | 'customer' | 'product' | 'salesman' | 'return' | 'commission' | 'settings',
    description: string,
    details?: string
  ) => void;
  hasActionAccess?: (actionId: keyof AppUserPermissions) => boolean;
  settings?: SystemSettings;
}

export default function CommissionManager({
  salesmen,
  invoices,
  onAddSalesman,
  onUpdateSalesman,
  onDeleteSalesman,
  onUpdateInvoices,
  onViewInvoice,
  onAddActivity,
  hasActionAccess = () => true,
  settings,
}: CommissionManagerProps) {
  // Navigation tabs: 'monthly_summary' | 'salesmen'
  const [subTab, setSubTab] = useState<'monthly_summary' | 'salesmen'>('monthly_summary');
  const [isExporting, setIsExporting] = useState(false);

  // Date Range selection state
  const [startDate, setStartDate] = useState<string>('2026-06-01');
  const [endDate, setEndDate] = useState<string>('2026-06-30');

  // Salesmen Form State
  const [showSalesmanForm, setShowSalesmanForm] = useState(false);
  const [editingSalesmanId, setEditingSalesmanId] = useState<string | null>(null);
  const [deletingSalesmanId, setDeletingSalesmanId] = useState<string | null>(null);
  const [salesmanName, setSalesmanName] = useState('');
  const [salesmanPhone, setSalesmanPhone] = useState('');
  const [salesmanComm, setSalesmanComm] = useState<number>(2000);
  const [formError, setFormError] = useState('');

  // Expand contributor invoice list toggle
  const [showContributors, setShowContributors] = useState(false);

  // Monthly payment status, key format: [salesmanId_YYYY-MM-DD_YYYY-MM-DD]: 'paid' | 'unpaid'
  const [monthlyPayments, setMonthlyPayments] = useState<Record<string, 'paid' | 'unpaid'>>({});

  // Monthly custom commission rates, key format: [salesmanId_YYYY-MM-DD_YYYY-MM-DD]: number
  const [monthlyRates, setMonthlyRates] = useState<Record<string, number>>({});

  useEffect(() => {
    commissionsApi.getCommissionPayments().then((data) =>
      setMonthlyPayments(data as Record<string, 'paid' | 'unpaid'>)
    ).catch(() => null);
    commissionsApi.getCommissionRates().then(setMonthlyRates).catch(() => null);
  }, []);

  // Save/Edit Salesman Handler
  const handleSaveSalesman = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasActionAccess('canManageSalesman')) {
      showToast("Akses Dibatasi: Anda tidak memiliki izin untuk mengelola data agen / salesman.", "error");
      return;
    }
    if (!salesmanName.trim()) {
      setFormError('Nama lengkap agen wajib diisi');
      return;
    }
    if (salesmanComm < 0) {
      setFormError('Nominal komisi tidak boleh negatif');
      return;
    }

    const salesmanData: Salesman = {
      id: editingSalesmanId || `sales-${Date.now()}`,
      name: salesmanName.trim(),
      phone: salesmanPhone.trim() || undefined,
      commissionPerPair: Number(salesmanComm)
    };

    if (editingSalesmanId) {
      onUpdateSalesman(salesmanData);
      showToast("Data pegawai komisi berhasil diperbarui!", "success");
    } else {
      onAddSalesman(salesmanData);
      showToast("Pegawai komisi berhasil didaftarkan!", "success");
    }

    // Reset Form
    setSalesmanName('');
    setSalesmanPhone('');
    setSalesmanComm(2000);
    setEditingSalesmanId(null);
    setShowSalesmanForm(false);
    setFormError('');
  };

  const handleStartEditSalesman = (s: Salesman) => {
    setEditingSalesmanId(s.id);
    setSalesmanName(s.name);
    setSalesmanPhone(s.phone || '');
    setSalesmanComm(s.commissionPerPair);
    setShowSalesmanForm(true);
    setFormError('');
  };

  // Toggle paid/unpaid status for a salesman for the selected date range
  const handleTogglePaymentStatus = (salesmanId: string) => {
    if (!hasActionAccess('canPayCommission')) {
      showToast("Akses Dibatasi: Anda tidak memiliki izin untuk melunasi komisi agen.", "error");
      return;
    }
    const key = `${salesmanId}_${startDate}_${endDate}`;
    const currentStatus = monthlyPayments[key] || 'unpaid';
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';

    setMonthlyPayments((prev) => ({ ...prev, [key]: newStatus }));
    commissionsApi.setCommissionPayment(key, newStatus).catch(() => null);

    if (onAddActivity) {
      const salesman = salesmen.find(s => s.id === salesmanId);
      const sName = salesman ? salesman.name : salesmanId;
      const customRate = monthlyRates[key];
      const activeRate = customRate !== undefined ? customRate : (salesman?.commissionPerPair || 0);
      const totalCommission = totalMonthlyPairs * activeRate;
      onAddActivity(
        'payment',
        'commission',
        `Mengubah Status Bayar Komisi: ${sName}`,
        `Periode: ${startDate} s/d ${endDate}\nStatus baru: ${newStatus === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}\nQty Penjualan: ${totalMonthlyPairs} pasang\nNominal: Rp ${totalCommission.toLocaleString('id-ID')}`
      );
    }
  };

  // Update custom commission rate for a salesman for the selected date range
  const handleUpdateMonthlyRate = (salesmanId: string, rate: number) => {
    if (!hasActionAccess('canEditCommissionRate')) {
      showToast("Akses Dibatasi: Anda tidak memiliki izin untuk mengubah tarif komisi agen.", "error");
      return;
    }
    const key = `${salesmanId}_${startDate}_${endDate}`;
    setMonthlyRates((prev) => ({ ...prev, [key]: rate }));
    commissionsApi.setCommissionRate(key, rate).catch(() => null);

    if (onAddActivity) {
      const salesman = salesmen.find(s => s.id === salesmanId);
      const sName = salesman ? salesman.name : salesmanId;
      onAddActivity(
        'update',
        'commission',
        `Mengubah Tarif Komisi Khusus Periode: ${sName}`,
        `Periode: ${startDate} s/d ${endDate}\nTarif komisi baru: Rp ${rate.toLocaleString('id-ID')}/pasang`
      );
    }
  };

  // 1. Find all invoices belonging to the selected date range
  const monthlyInvoices = useMemo(() => {
    return invoices.filter(inv => inv.date >= startDate && inv.date <= endDate);
  }, [invoices, startDate, endDate]);

  // 2. Sum overall quantity (totalPairs) for all invoices in this range
  const totalMonthlyPairs = useMemo(() => {
    return monthlyInvoices.reduce((sum, inv) => sum + inv.totalPairs, 0);
  }, [monthlyInvoices]);

  // 3. Compute commission details for each salesperson
  const monthlyCommissionsBreakdown = useMemo(() => {
    return salesmen.map(s => {
      const key = `${s.id}_${startDate}_${endDate}`;
      const status = monthlyPayments[key] || 'unpaid';
      const customRate = monthlyRates[key];
      
      // Calculate total commission by summing (invoice.totalPairs * rate)
      let totalCommission = 0;
      monthlyInvoices.forEach(inv => {
        const invoiceRate = inv.commissionPerPair !== undefined ? inv.commissionPerPair : s.commissionPerPair;
        const rate = customRate !== undefined ? customRate : invoiceRate;
        totalCommission += inv.totalPairs * rate;
      });

      const activeRate = customRate !== undefined ? customRate : s.commissionPerPair;

      return {
        ...s,
        commissionPerPair: activeRate,
        totalPairsReference: totalMonthlyPairs,
        totalCommission,
        paymentStatus: status,
      };
    });
  }, [salesmen, totalMonthlyPairs, monthlyInvoices, startDate, endDate, monthlyPayments, monthlyRates]);

  // 4. Overarching Metrics
  const monthlyMetrics = useMemo(() => {
    let totalEarned = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    monthlyCommissionsBreakdown.forEach(item => {
      totalEarned += item.totalCommission;
      if (item.paymentStatus === 'paid') {
        totalPaid += item.totalCommission;
      } else {
        totalUnpaid += item.totalCommission;
      }
    });

    return {
      totalEarned,
      totalPaid,
      totalUnpaid,
      agentCount: salesmen.length
    };
  }, [monthlyCommissionsBreakdown, salesmen]);

  // Export Commission Report to Excel
  const handleExportMonthlyExcel = () => {
    // Sheet 1: Rekap Komisi Salesman
    const salesmanSummaryRows = monthlyCommissionsBreakdown.map((item, idx) => ({
      'No': idx + 1,
      'Nama Salesman': item.name,
      'No. HP': item.phone || '-',
      'Tarif Komisi / Psg (Rp)': item.commissionPerPair,
      'Total Qty Penjualan (Psg)': item.totalPairsReference,
      'Total Komisi Diterima (Rp)': item.totalCommission,
      'Status Pembayaran': item.paymentStatus === 'paid' ? 'LUNAS DIBAYAR' : 'BELUM DIBAYAR',
      'Periode': `${startDate} s/d ${endDate}`
    }));

    // Sheet 2: Faktur Kontributor Volume Penjualan
    const contributorInvoicesRows = monthlyInvoices.map((inv, idx) => ({
      'No': idx + 1,
      'No. Faktur': inv.invoiceNumber,
      'Tanggal Transaksi': inv.date,
      'Nama Pelanggan': inv.customerName,
      'Volume Penjualan (Pasang)': inv.totalPairs,
      'Nilai Total Transaksi (Rp)': inv.totalAmount,
      'Status Pelunasan Faktur': inv.status === 'paid' ? 'LUNAS' : 'PIUTANG'
    }));

    exportToExcel(`Laporan_Komisi_${startDate}_sd_${endDate}`, [
      { name: 'Rekap Komisi', data: salesmanSummaryRows },
      { name: 'Detail Faktur Penjualan', data: contributorInvoicesRows }
    ]);
  };

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfFormat, setPdfFormat] = useState<'a4' | 'a5' | 'letter' | 'legal' | 'f4'>('a4');

  const handlePrintReport = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowPrintModal(true);
  };

  return (
    <div id="commission-manager-container" className="space-y-6 animate-fade-in">
      
      {/* 1. Header & Tab Controller */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-600" />
            Sistem Komisi Pegawai Terpusat
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Sistem perhitungan komisi merata berdasarkan <b>Total Volume Penjualan Periode Terpilih</b> dikali tarif masing-masing pegawai.
          </p>
        </div>

        {/* Local Sub Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto shrink-0 border border-slate-200/50">
          <button
            onClick={() => setSubTab('monthly_summary')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              subTab === 'monthly_summary' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Rekap Komisi
          </button>
          <button
            onClick={() => setSubTab('salesmen')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              subTab === 'salesmen' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Pegawai ({salesmen.length})
          </button>
        </div>
      </div>

      {/* MONTHLY SUMMARY TAB VIEW */}
      {subTab === 'monthly_summary' && (
        <div className="space-y-6">
          
          {/* Month & Year Filter Selector Card */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <div className="flex flex-col xl:flex-row xl:items-center justify-start gap-4">

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3.5 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-450 uppercase shrink-0">Mulai:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-indigo-600 focus:bg-white transition cursor-pointer w-full sm:w-auto"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-450 uppercase shrink-0">Selesai:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-indigo-600 focus:bg-white transition cursor-pointer w-full sm:w-auto"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
                  <button
                    onClick={handleExportMonthlyExcel}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer border border-transparent shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Excel
                  </button>

                  <button
                    onClick={handlePrintReport}
                    disabled={isExporting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer border border-transparent shrink-0 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Mengekspor PDF...
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        Cetak PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics of Selected Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Total Monthly Pairs Sold (Overall Warehouse) */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Total Volume Penjualan</span>
                <span className="block text-xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                  {totalMonthlyPairs.toLocaleString('id-ID')} <small className="text-xs font-bold text-slate-450">Pasang</small>
                </span>
                <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Semua Faktur Periode Ini</span>
              </div>
            </div>

            {/* 2. Total Commission Obligation */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Kewajiban Komisi Pegawai</span>
                <span className="block text-xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                  {formatCurrency(monthlyMetrics.totalEarned)}
                </span>
                <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Merata Untuk {monthlyMetrics.agentCount} Pegawai</span>
              </div>
            </div>

            {/* 3. Paid Commissions */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Komisi Terbayar</span>
                <span className="block text-xl font-black text-emerald-700 font-mono tracking-tight mt-0.5">
                  {formatCurrency(monthlyMetrics.totalPaid)}
                </span>
                <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Sudah Ditransfer</span>
              </div>
            </div>

            {/* 4. Unpaid Commissions */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Belum Dibayarkan</span>
                <span className="block text-xl font-black text-rose-700 font-mono tracking-tight mt-0.5">
                  {formatCurrency(monthlyMetrics.totalUnpaid)}
                </span>
                <span className="block text-[9px] text-slate-400 font-bold mt-0.5">Sisa Kewajiban</span>
              </div>
            </div>

          </div>

          {/* Centralized Commission Table Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">Daftar Hak Komisi Pegawai</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-450 font-medium">Setiap pegawai menerima komisi dari total volume penjualan periode terpilih secara adil & sama rata</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-extrabold">
                    <th className="py-3 px-5 text-center w-12">No</th>
                    <th className="py-3 px-4">Nama Pegawai</th>
                    <th className="py-3 px-4">No. Telepon HP</th>
                    <th className="py-3 px-4 text-center">Qty Penjualan</th>
                    <th className="py-3 px-4 text-right">Tarif Komisi / Psg</th>
                    <th className="py-3 px-4 text-right">Total Komisi Diterima</th>
                    <th className="py-3 px-4 text-center">Status Pembayaran</th>
                    <th className="py-3 px-5 text-center w-40">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyCommissionsBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium font-serif">
                        Belum ada pegawai terdaftar. Silakan tambah pegawai baru di tab "Daftar Pegawai".
                      </td>
                    </tr>
                  ) : (
                    monthlyCommissionsBreakdown.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/45 transition">
                        <td className="py-4 px-5 text-center font-bold font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-4 px-4 font-black text-slate-900">{item.name}</td>
                        <td className="py-4 px-4 font-mono text-slate-500 font-medium">{item.phone || '-'}</td>
                        <td className="py-4 px-4 text-center font-black font-mono text-indigo-900 bg-indigo-50/10">
                          {item.totalPairsReference.toLocaleString('id-ID')} pasang
                        </td>
                        <td className="py-4 px-4 text-right font-black font-mono text-slate-900">
                          {formatCurrency(item.commissionPerPair)}
                        </td>
                        <td className="py-4 px-4 text-right font-black font-mono text-slate-950 text-sm">{formatCurrency(item.totalCommission)}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {item.paymentStatus === 'paid' ? 'LUNAS DIBAYAR' : 'BELUM DIBAYAR'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button
                            onClick={() => handleTogglePaymentStatus(item.id)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer transition border ${
                              item.paymentStatus === 'paid'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
                            }`}
                          >
                            {item.paymentStatus === 'paid' ? 'Set Belum Bayar' : 'Tandai Lunas'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contributing Invoices List Section (Accordian styled) */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <button
              onClick={() => setShowContributors(!showContributors)}
              className="w-full flex justify-between items-center p-5 bg-slate-50/60 hover:bg-slate-50 transition border-none focus:outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5 text-left">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">Faktur Penjualan Kontributor Volume</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Daftar {monthlyInvoices.length} faktur yang terekam pada periode ini untuk menjumlahkan Qty Penjualan</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-450">{showContributors ? 'Tutup Detail' : 'Tampilkan Detail'}</span>
                {showContributors ? <ChevronUp className="w-4 h-4 text-slate-550" /> : <ChevronDown className="w-4 h-4 text-slate-550" />}
              </div>
            </button>

            {showContributors && (
              <div className="border-t border-slate-100 animate-slide-down">
                <div className="overflow-x-auto text-xs">
                  <table className="w-full min-w-[750px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/40 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-2.5 px-4 text-center w-12">No</th>
                        <th className="py-2.5 px-3">No. Faktur</th>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Nama Pelanggan</th>
                        <th className="py-2.5 px-3 text-center">Volume (Pasang)</th>
                        <th className="py-2.5 px-3 text-right">Nilai Faktur</th>
                        <th className="py-2.5 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-medium font-serif">
                            Tidak ada transaksi terekam pada bulan terpilih.
                          </td>
                        </tr>
                      ) : (
                        monthlyInvoices.map((inv, idx) => (
                          <tr key={inv.id} className="hover:bg-slate-50/25 transition">
                            <td className="py-3 px-4 text-center font-bold font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-3 font-black text-slate-900">{inv.invoiceNumber}</td>
                            <td className="py-3 px-3 font-mono text-slate-500">{inv.date}</td>
                            <td className="py-3 px-3 font-semibold text-slate-700">{inv.customerName}</td>
                            <td className="py-3 px-3 text-center font-black font-mono text-indigo-900">{inv.totalPairs} psg</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">{formatCurrency(inv.totalAmount)}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => onViewInvoice(inv)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-850 cursor-pointer"
                              >
                                Buka Faktur
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Centralized Commission Policy Banner info */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900/95 flex gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Mekanisme Pembagian Komisi</span>
              <p className="leading-relaxed font-medium text-[11px]">
                Sistem menghitung total penjualan sepatu (Qty Pasang) dari seluruh faktur yang diterbitkan pada periode tanggal terpilih. Kuantitas ini merupakan Qty Penjualan yang sama untuk seluruh pegawai. Komisi masing-masing pegawai adalah <b>[Qty Penjualan] × [Tarif Komisi per Pasang Pegawai]</b>. Pembayaran komisi dikelola per periode tanggal dan status pelunasan tersinkronisasi secara otomatis.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* MANAGE SALESMEN TAB VIEW */}
      {subTab === 'salesmen' && (
        <div className="space-y-6">
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-500 font-medium">
              Kelola database pegawai yang berhak menerima komisi
            </div>
            {!showSalesmanForm && (
              <button
                disabled={!hasActionAccess('canManageSalesman')}
                onClick={() => {
                  if (hasActionAccess('canManageSalesman')) {
                    setEditingSalesmanId(null);
                    setSalesmanName('');
                    setSalesmanPhone('');
                    setSalesmanComm(2000);
                    setFormError('');
                    setShowSalesmanForm(true);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-white rounded-xl text-xs font-black transition shadow-xs border-none ${
                  hasActionAccess('canManageSalesman') 
                    ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer' 
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-85'
                }`}
                title={hasActionAccess('canManageSalesman') ? 'Tambah Pegawai Baru' : 'Akses Dibatasi: Anda tidak memiliki izin mengelola data pegawai'}
              >
                <Plus className="w-3.5 h-3.5" />
                {hasActionAccess('canManageSalesman') ? 'Tambah Pegawai Baru' : 'Akses Terbatas'}
              </button>
            )}
          </div>

          {/* Salesman Form Card */}
          {showSalesmanForm && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 animate-fade-in max-w-xl">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="font-black text-sm text-slate-900">
                  {editingSalesmanId ? 'Ubah Informasi Pegawai' : 'Daftarkan Pegawai Komisi Baru'}
                </h3>
                <button 
                  onClick={() => setShowSalesmanForm(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSalesman} className="grid grid-cols-1 gap-4 text-xs font-semibold">
                
                <div>
                  <label className="block text-slate-500 mb-1 font-bold">Nama Lengkap Pegawai <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={salesmanName}
                    onChange={(e) => setSalesmanName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-white border border-slate-250 px-3 py-2 rounded-lg text-slate-800 focus:outline-indigo-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-bold">No. Telepon / HP (Opsional)</label>
                  <input
                    type="text"
                    value={salesmanPhone}
                    onChange={(e) => setSalesmanPhone(e.target.value)}
                    placeholder="Contoh: 0812345678"
                    className="w-full bg-white border border-slate-250 px-3 py-2 rounded-lg text-slate-800 focus:outline-indigo-600 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-bold">Tarif Komisi / Pasang (Rp) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={salesmanComm}
                    onChange={(e) => setSalesmanComm(Number(e.target.value))}
                    placeholder="Contoh: 2000"
                    className="w-full bg-white border border-slate-250 px-3 py-2 rounded-lg text-slate-800 focus:outline-indigo-600 font-mono font-bold"
                  />
                </div>

                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowSalesmanForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-bold cursor-pointer border-none"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-black cursor-pointer shadow-sm border-none"
                  >
                    Simpan Pegawai
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Salesman List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesmen.map(s => {
              const currentPeriodKey = `${s.id}_${startDate}_${endDate}`;
              const currentPeriodStatus = monthlyPayments[currentPeriodKey] || 'unpaid';
              const customRate = monthlyRates[currentPeriodKey];
              const activeRate = customRate !== undefined ? customRate : s.commissionPerPair;
              const currentPeriodCommission = totalMonthlyPairs * activeRate;

              return (
                <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-indigo-200 hover:shadow-xs transition flex flex-col justify-between shadow-2xs">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-indigo-50 text-indigo-700 uppercase">
                          ID: {s.id}
                        </span>
                        <h4 className="font-black text-slate-900 text-base leading-tight mt-1">{s.name}</h4>
                      </div>
                      
                      {deletingSalesmanId === s.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-xl animate-pulse">
                          <span className="text-[10px] text-rose-700 font-extrabold font-sans">Yakin hapus?</span>
                          <button
                            onClick={() => {
                              onDeleteSalesman(s.id);
                              setDeletingSalesmanId(null);
                              showToast("Pegawai komisi berhasil dihapus!", "success");
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-black cursor-pointer border-none shadow-xs"
                          >
                            Ya
                          </button>
                          <button
                            onClick={() => setDeletingSalesmanId(null)}
                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-black cursor-pointer border-none"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {(() => {
                            const canManage = hasActionAccess('canManageSalesman');
                            return (
                              <>
                                <button
                                  disabled={!canManage}
                                  onClick={() => {
                                    if (canManage) {
                                      handleStartEditSalesman(s);
                                    }
                                  }}
                                  title={canManage ? 'Ubah Pegawai' : 'Akses Dibatasi'}
                                  className={`p-1.5 rounded-lg transition border-none ${
                                    canManage 
                                      ? 'text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 cursor-pointer' 
                                      : 'text-slate-200 bg-slate-50 cursor-not-allowed'
                                  }`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={!canManage}
                                  onClick={() => {
                                    if (canManage) {
                                      setDeletingSalesmanId(s.id);
                                    }
                                  }}
                                  title={canManage ? 'Hapus Pegawai' : 'Akses Dibatasi'}
                                  className={`p-1.5 rounded-lg transition border-none ${
                                    canManage 
                                      ? 'text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 cursor-pointer' 
                                      : 'text-slate-200 bg-slate-50 cursor-not-allowed'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 font-semibold pt-1 border-t border-slate-100">
                      <p>No. HP: <b className="text-slate-800 font-mono">{s.phone || '-'}</b></p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2 text-xs">
                    <span className="block text-[9px] uppercase font-extrabold text-slate-400">Komisi Periode Terpilih ({startDate} s/d {endDate})</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                      <div>
                        <span className="block text-slate-450 font-bold">Qty Acuan</span>
                        <span className="font-black text-slate-900 font-mono text-xs">{totalMonthlyPairs.toLocaleString('id-ID')} psg</span>
                      </div>
                      <div>
                        <span className="block text-slate-450 font-bold">Status Bayar</span>
                        <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider ${
                          currentPeriodStatus === 'paid' ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {currentPeriodStatus === 'paid' ? 'Lunas' : 'Belum'}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1.5 border-t border-slate-200">
                        <span className="block text-slate-450 font-bold">Komisi Periode Ini</span>
                        <span className="font-black text-slate-950 font-mono text-sm leading-none mt-0.5 block">{formatCurrency(currentPeriodCommission)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}

            {salesmen.length === 0 && (
              <div className="col-span-full bg-slate-100 border-2 border-dashed border-slate-300 p-8 rounded-2xl text-center text-slate-400 font-bold font-serif">
                Belum ada pegawai terdaftar.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ================= PRINT REPORT LAYOUT ================= */}
      <div id="printable-commission" className="hidden print:block w-full max-w-full text-slate-950 bg-white p-4 font-sans text-xs select-none">
        {/* Print Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <CompanyLogo size={40} className="shrink-0 text-slate-800" logoUrl={settings?.companyLogoUrl} />
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                {settings?.companyName || 'ANGKASA JAYA SHOES'}
              </h1>
              <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                {settings?.companyAddress || 'Jl. Angkasa Mekar I No.59, Cangkuang Kulon, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat 40239'}<br />
                {settings?.companyPhone || 'Telp: (022) 540-39423 | WA: 0812-1122-3344'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Laporan Komisi Pegawai</h2>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Periode: <span className="text-slate-900">{startDate}</span> s/d <span className="text-slate-900">{endDate}</span>
            </p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">
              Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Brief Metrics Card in Printout */}
        <div className="grid grid-cols-4 gap-4 bg-slate-50 border border-slate-300 p-4 rounded-xl mb-6">
          <div className="space-y-1">
            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Volume Penjualan</span>
            <span className="block text-base font-black text-slate-900 font-mono">
              {totalMonthlyPairs.toLocaleString('id-ID')} <small className="text-[10px] font-bold text-slate-500">Pasang</small>
            </span>
          </div>
          <div className="space-y-1 border-l border-slate-250 pl-4">
            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Kewajiban Komisi</span>
            <span className="block text-base font-black text-indigo-700 font-mono">
              {formatCurrency(monthlyMetrics.totalEarned)}
            </span>
          </div>
          <div className="space-y-1 border-l border-slate-250 pl-4">
            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Sudah Dibayarkan</span>
            <span className="block text-base font-black text-emerald-700 font-mono">
              {formatCurrency(monthlyMetrics.totalPaid)}
            </span>
          </div>
          <div className="space-y-1 border-l border-slate-250 pl-4">
            <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Belum Dibayarkan</span>
            <span className="block text-base font-black text-rose-700 font-mono">
              {formatCurrency(monthlyMetrics.totalUnpaid)}
            </span>
          </div>
        </div>

        {/* Section 1: Breakdown Table */}
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">I. REKAPITULASI PEMBAGIAN KOMISI</h3>
          <table className="w-full border-collapse border border-slate-300 text-[10px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase whitespace-nowrap">
                <th className="py-2 px-2 border border-slate-300 text-center w-8">No</th>
                <th className="py-2 px-3 border border-slate-300 text-left">Nama Lengkap Pegawai</th>
                <th className="py-2 px-3 border border-slate-300 text-left">No. Telepon HP</th>
                <th className="py-2 px-3 border border-slate-300 text-center">Qty Penjualan (Psg)</th>
                <th className="py-2 px-3 border border-slate-300 text-right">Tarif Komisi / Psg</th>
                <th className="py-2 px-3 border border-slate-300 text-right">Total Hak Komisi</th>
                <th className="py-2 px-3 border border-slate-300 text-center">Status Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              {monthlyCommissionsBreakdown.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-250 hover:bg-slate-50/50">
                  <td className="py-2 px-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 border border-slate-300 font-bold text-slate-900">{item.name}</td>
                  <td className="py-2 px-3 border border-slate-300 font-mono">{item.phone || '-'}</td>
                  <td className="py-2 px-3 border border-slate-300 text-center font-mono font-semibold">{item.totalPairsReference.toLocaleString('id-ID')}</td>
                  <td className="py-2 px-3 border border-slate-300 text-right font-mono">{formatCurrency(item.commissionPerPair)}</td>
                  <td className="py-2 px-3 border border-slate-300 text-right font-mono font-black text-indigo-700">{formatCurrency(item.totalCommission)}</td>
                  <td className="py-2 px-3 border border-slate-300 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      item.paymentStatus === 'paid' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {item.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-black border-t-2 border-slate-300">
                <td colSpan={3} className="py-2 px-3 border border-slate-300 text-right">JUMLAH KESELURUHAN:</td>
                <td className="py-2 px-3 border border-slate-300 text-center font-mono">{totalMonthlyPairs.toLocaleString('id-ID')}</td>
                <td className="py-2 px-3 border border-slate-300 text-right">-</td>
                <td className="py-2 px-3 border border-slate-300 text-right font-mono text-indigo-700">{formatCurrency(monthlyMetrics.totalEarned)}</td>
                <td className="py-2 px-3 border border-slate-300 text-center">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Underlying Invoices Table */}
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">II. DAFTAR FAKTUR KONTRIBUTOR VOLUME PENJUALAN</h3>
          <p className="text-[9px] text-slate-500 leading-normal mb-2">
            Berikut adalah rincian faktur penjualan yang diterbitkan selama periode tanggal terpilih sebagai basis acuan Qty Pasang:
          </p>
          <table className="w-full border-collapse border border-slate-300 text-[9px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase whitespace-nowrap">
                <th className="py-2 px-2 border border-slate-300 text-center w-8">No</th>
                <th className="py-2 px-3 border border-slate-300 text-left">No. Faktur</th>
                <th className="py-2 px-3 border border-slate-300 text-center">Tanggal</th>
                <th className="py-2 px-3 border border-slate-300 text-left">Nama Pelanggan</th>
                <th className="py-2 px-3 border border-slate-300 text-center">Volume Qty (Psg)</th>
                <th className="py-2 px-3 border border-slate-300 text-right">Total Nilai Faktur</th>
                <th className="py-2 px-3 border border-slate-300 text-center">Status Faktur</th>
              </tr>
            </thead>
            <tbody>
              {monthlyInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400 font-medium">
                    Tidak ada transaksi penjualan dalam periode terpilih.
                  </td>
                </tr>
              ) : (
                monthlyInvoices.map((inv, idx) => (
                  <tr key={inv.id} className="border-b border-slate-250 hover:bg-slate-50/50">
                    <td className="py-2 px-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center font-mono">{inv.date}</td>
                    <td className="py-2 px-3 border border-slate-300">{inv.customerName}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center font-mono font-semibold">{inv.totalPairs.toLocaleString('id-ID')}</td>
                    <td className="py-2 px-3 border border-slate-300 text-right font-mono">{formatCurrency(inv.totalAmount)}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        inv.status === 'paid' 
                          ? 'bg-emerald-50 text-emerald-800' 
                          : 'bg-amber-50 text-amber-800'
                      }`}>
                        {inv.status === 'paid' ? 'LUNAS' : 'PIUTANG'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
              {monthlyInvoices.length > 0 && (
                <tr className="bg-slate-50 font-black border-t-2 border-slate-300">
                  <td colSpan={4} className="py-2 px-3 border border-slate-300 text-right">TOTAL ACUAN VOLUME GUDANG:</td>
                  <td className="py-2 px-3 border border-slate-300 text-center font-mono">{totalMonthlyPairs.toLocaleString('id-ID')} Psg</td>
                  <td className="py-2 px-3 border border-slate-300 text-right font-mono">
                    {formatCurrency(monthlyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}
                  </td>
                  <td className="py-2 px-3 border border-slate-300 text-center">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures block */}
        <div className="grid grid-cols-2 gap-12 mt-12 pt-8 text-[11px] font-semibold text-center">
          <div className="space-y-16">
            <span className="block">Bagian Keuangan,</span>
            <div className="space-y-1">
              <span className="block font-black underline">............................................</span>
              <span className="block text-slate-400 text-[10px]">&nbsp;</span>
            </div>
          </div>
          <div className="space-y-16">
            <span className="block">Mengetahui,</span>
            <div className="space-y-1">
              <span className="block font-black underline">............................................</span>
              <span className="block text-slate-400 text-[10px]">&nbsp;</span>
            </div>
          </div>
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
                  const filename = `Laporan_Komisi_${startDate}_sd_${endDate}.pdf`;
                  await exportToPdf('printable-commission', { 
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
