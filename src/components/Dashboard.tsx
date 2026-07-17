/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Invoice, Customer, Product, Salesman } from '../types';
import { formatCurrency } from '../utils';
import * as commissionsApi from '../api/commissions';
import { 
  TrendingUp, 
  Users, 
  Tag, 
  FileSpreadsheet, 
  PlusCircle, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  ChevronRight, 
  ArrowUpRight,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';

interface DashboardProps {
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  salesmen: Salesman[];
  setActiveTab: (tab: 'dashboard' | 'invoice' | 'report' | 'returns' | 'commissions' | 'customers' | 'shoes' | 'settings') => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export default function Dashboard({
  invoices,
  customers,
  products,
  salesmen,
  setActiveTab,
  onViewInvoice
}: DashboardProps) {

  // Monthly commission payment status & custom rates, loaded from the API
  const [monthlyPayments, setMonthlyPayments] = useState<Record<string, string>>({});
  const [monthlyRates, setMonthlyRates] = useState<Record<string, number>>({});

  useEffect(() => {
    commissionsApi.getCommissionPayments().then(setMonthlyPayments).catch(() => null);
    commissionsApi.getCommissionRates().then(setMonthlyRates).catch(() => null);
  }, []);

  // Business Performance stats
  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPairsSold = invoices.reduce((sum, inv) => sum + inv.totalPairs, 0);
    const activeCustomers = customers.length;
    const totalInvoices = invoices.length;

    // Commission states based on new Centralized Commission System
    let totalComm = 0;
    let paidComm = 0;

    const allPeriodKeys = Array.from(new Set([
      ...Object.keys(monthlyPayments),
      ...Object.keys(monthlyRates)
    ]));

    if (allPeriodKeys.length > 0) {
      const processedPeriods = new Set<string>();
      
      allPeriodKeys.forEach(key => {
        if (key.includes('_')) {
          // Dynamic range key format: salesmanId_startDate_endDate
          const parts = key.split('_');
          if (parts.length === 3) {
            const [sId, start, end] = parts;
            const periodId = `range_${sId}_${start}_${end}`;
            if (processedPeriods.has(periodId)) return;
            processedPeriods.add(periodId);
            
            const salesman = salesmen.find(s => s.id === sId);
            if (!salesman) return;
            
            const isPaid = monthlyPayments[key] === 'paid';
            const customRate = monthlyRates[key];
            const activeRate = customRate !== undefined ? customRate : salesman.commissionPerPair;
            
            const rangeInvs = invoices.filter(inv => inv.date >= start && inv.date <= end);
            const rangeTotalPairs = rangeInvs.reduce((sum, inv) => sum + inv.totalPairs, 0);
            const commissionAmt = rangeTotalPairs * activeRate;
            
            totalComm += commissionAmt;
            if (isPaid) {
              paidComm += commissionAmt;
            }
          }
        } else {
          // Old monthly key format: salesmanId-YYYY-MM
          const parts = key.split('-');
          if (parts.length >= 3) {
            const year = parts[parts.length - 2];
            const month = parts[parts.length - 1];
            if (year.length === 4 && month.length === 2) {
              const yearMonth = `${year}-${month}`;
              const sId = parts.slice(0, parts.length - 2).join('-');
              
              const periodId = `month_${sId}_${yearMonth}`;
              if (processedPeriods.has(periodId)) return;
              processedPeriods.add(periodId);
              
              const salesman = salesmen.find(s => s.id === sId);
              if (!salesman) return;
              
              const isPaid = monthlyPayments[key] === 'paid';
              const customRate = monthlyRates[key];
              const activeRate = customRate !== undefined ? customRate : salesman.commissionPerPair;
              
              const monthInvs = invoices.filter(inv => inv.date.startsWith(yearMonth));
              const monthTotalPairs = monthInvs.reduce((sum, inv) => sum + inv.totalPairs, 0);
              const commissionAmt = monthTotalPairs * activeRate;
              
              totalComm += commissionAmt;
              if (isPaid) {
                paidComm += commissionAmt;
              }
            }
          }
        }
      });
    }

    // Fallback if no commission records exist yet
    if (totalComm === 0) {
      const defaultMonth = '2026-06';
      const monthInvs = invoices.filter(inv => inv.date && inv.date.startsWith(defaultMonth));
      const monthTotalPairs = monthInvs.reduce((sum, inv) => sum + inv.totalPairs, 0);
      salesmen.forEach(s => {
        totalComm += monthTotalPairs * s.commissionPerPair;
      });
    }

    const unpaidComm = totalComm - paidComm;

    return {
      totalRevenue,
      totalPairsSold,
      activeCustomers,
      totalInvoices,
      totalComm,
      paidComm,
      unpaidComm
    };
  }, [invoices, customers, salesmen, monthlyPayments, monthlyRates]);

  // Last 5 invoices
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [invoices]);

  // Top customers by purchase value
  const topCustomers = useMemo(() => {
    const customerTotals: Record<string, { name: string; total: number; pairs: number; count: number }> = {};
    
    invoices.forEach(inv => {
      if (!customerTotals[inv.customerId]) {
        customerTotals[inv.customerId] = {
          name: inv.customerName,
          total: 0,
          pairs: 0,
          count: 0
        };
      }
      customerTotals[inv.customerId].total += inv.totalAmount;
      customerTotals[inv.customerId].pairs += inv.totalPairs;
      customerTotals[inv.customerId].count += 1;
    });

    return Object.values(customerTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header with greeting and time info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            Ringkasan Kinerja & Dashboard Operasional
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Pantau perkembangan omset penjualan, status tagihan, dan rekonsiliasi komisi agen Anda secara langsung.
          </p>
        </div>
        <div className="text-right text-xs bg-slate-50 border border-slate-150 px-4 py-2 rounded-xl text-slate-600 font-mono font-bold flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Sesi Aktif: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* 2. Key Metrics Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Omset */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl hover:border-indigo-100 hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-indigo-100/60 text-indigo-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Total Omset
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Akumulasi Penjualan</span>
            <span className="block text-2xl font-black text-slate-900 font-mono tracking-tight mt-1">
              {formatCurrency(stats.totalRevenue)}
            </span>
          </div>
        </div>

        {/* Metric 2: Total Pairs */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl hover:border-indigo-100 hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-emerald-100/60 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Barang Terjual
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Kuantitas Terjual</span>
            <span className="block text-2xl font-black text-slate-900 font-mono tracking-tight mt-1">
              {stats.totalPairsSold.toLocaleString('id-ID')} <small className="text-sm font-bold text-slate-400">Pasang</small>
            </span>
          </div>
        </div>

        {/* Metric 3: Total Invoices */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl hover:border-indigo-100 hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-amber-100/60 text-amber-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Total Faktur
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Transaksi Faktur</span>
            <span className="block text-2xl font-black text-slate-900 font-mono tracking-tight mt-1">
              {stats.totalInvoices.toLocaleString('id-ID')} <small className="text-sm font-bold text-slate-400">Order</small>
            </span>
          </div>
        </div>

        {/* Metric 4: Customers */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl hover:border-indigo-100 hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] bg-purple-100/60 text-purple-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Database
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Pelanggan Aktif</span>
            <span className="block text-2xl font-black text-slate-900 font-mono tracking-tight mt-1">
              {stats.activeCustomers.toLocaleString('id-ID')} <small className="text-sm font-bold text-slate-400">Mitra Toko</small>
            </span>
          </div>
        </div>

      </div>

      {/* 3. Bento Grid: Recent Invoices & Commission Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Recent Transactions (8 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Faktur Transaksi Terbaru</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Daftar 5 transaksi penjualan grosir paling baru dimasukkan</p>
              </div>
              <button
                onClick={() => setActiveTab('report')}
                className="text-xs font-black text-indigo-600 hover:text-indigo-850 flex items-center gap-0.5 transition cursor-pointer"
              >
                Lihat Semua
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {recentInvoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium font-serif">
                  Belum ada transaksi terekam. Silakan buat faktur pertama Anda.
                </div>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 hover:bg-slate-50/40 transition flex justify-between items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="font-black text-slate-900 hover:text-indigo-600 transition text-left underline decoration-dotted"
                        >
                          {inv.invoiceNumber}
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          inv.status === 'paid' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {inv.status === 'paid' ? 'LUNAS' : 'PIUTANG'}
                        </span>
                      </div>
                      <div className="text-slate-500 font-bold flex flex-wrap items-center gap-2 text-[11px]">
                        <span>{inv.customerName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono font-medium">{inv.date}</span>
                        <span className="text-slate-300">•</span>
                        <span>{inv.totalPairs} psg</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-black text-slate-900 font-mono">{formatCurrency(inv.totalAmount)}</span>
                      {inv.salesmanName && (
                        <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
                          Pegawai: {inv.salesmanName}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Commission Distribution Recap (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Commission Mini summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Kewajiban Komisi Pegawai</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Rincian status pengeluaran komisi pegawai</p>
              </div>
              <button
                onClick={() => setActiveTab('commissions')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-850 flex items-center transition cursor-pointer"
              >
                Atur
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                <span className="block text-[9px] uppercase font-extrabold text-slate-400">Sudah Dibayar</span>
                <span className="block text-sm font-black text-emerald-700 font-mono mt-1">{formatCurrency(stats.paidComm)}</span>
              </div>
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl">
                <span className="block text-[9px] uppercase font-extrabold text-slate-400">Sisa Belum Dibayar</span>
                <span className="block text-sm font-black text-rose-700 font-mono mt-1">{formatCurrency(stats.unpaidComm)}</span>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                <span>Rasio Pembayaran Komisi</span>
                <span className="text-indigo-700 font-black">
                  {stats.totalComm > 0 ? Math.round((stats.paidComm / stats.totalComm) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalComm > 0 ? (stats.paidComm / stats.totalComm) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Note info */}
            <p className="text-[10px] text-slate-450 leading-relaxed font-medium bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100/50">
              * Perhitungan komisi bersumber dari jumlah pasang sepatu dikalikan tarif per pasang masing-masing pegawai yang berhak menerima komisi.
            </p>
          </div>

          {/* Top customer breakdown card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Pelanggan dengan Kontribusi Terbanyak</h3>
              <p className="text-[10px] text-slate-500 font-semibold">Top 5 Mitra berdasarkan akumulasi belanja</p>
            </div>
            
            <div className="space-y-2 text-xs">
              {topCustomers.length === 0 ? (
                <div className="py-4 text-center text-slate-400 font-medium font-serif">
                  Belum ada data belanja pelanggan.
                </div>
              ) : (
                topCustomers.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-150/55 transition">
                    <div className="space-y-0.5">
                      <span className="block font-black text-slate-900">{c.name}</span>
                      <span className="block text-[10px] text-slate-500 font-bold">
                        {c.count} Faktur • {c.pairs} Pasang
                      </span>
                    </div>
                    <span className="font-bold text-slate-800 font-mono">{formatCurrency(c.total)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
