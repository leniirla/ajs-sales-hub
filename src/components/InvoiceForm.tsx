/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, Invoice, InvoiceItem, Product, SystemSettings, Salesman, AppUserPermissions, PaymentProof } from '../types';
import { calculateFullInvoice, formatCurrency, getCustomerProductPrice, showToast } from '../utils';
import { Plus, Trash2, CheckCircle2, UserCheck, Inbox, Box, HelpCircle, Pencil, X, DollarSign, ShieldAlert, Upload, Camera } from 'lucide-react';
import CameraModal from './CameraModal';

const SIZE_MIN = 10;
const SIZE_MAX = 80;
const QTY_MIN = 1;
const QTY_MAX = 999;

const sanitizeNumericInput = (raw: string, max: number): string => {
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly === '') return '';
  const clamped = Math.min(Number(digitsOnly), max);
  return String(clamped);
};

const clampToRange = (value: string, min: number, max: number): number | null => {
  if (!value) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.min(Math.max(num, min), max);
};

interface InvoiceFormProps {
  customers: Customer[];
  products: Product[];
  onSaveInvoice: (invoice: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onAddCustomer: (customer: Customer) => void;
  invoiceToEdit?: Invoice | null;
  onCancelEdit?: () => void;
  settings?: SystemSettings;
  salesmen?: Salesman[];
  invoices?: Invoice[];
  hasActionAccess?: (actionId: keyof AppUserPermissions) => boolean;
}

export default function InvoiceForm({
  customers,
  onSaveInvoice,
  onViewInvoice,
  onAddCustomer,
  products,
  invoiceToEdit = null,
  onCancelEdit,
  settings,
  salesmen = [],
  invoices = [],
  hasActionAccess = () => true,
}: InvoiceFormProps) {
  // Common styles/options
  const shoeStylesPreset = products && products.length > 0 
    ? products.map(p => p.name) 
    : [
        'Sepatu Sneaker Sport Alpha',
        'Casual Loafers Leather Premium',
        'Sandal Kulit Slide Adventure',
        'Flat Shoes Suede Belle',
        'Classic High Top Canvas',
        'Slip-on Breathable Comfort'
      ];

  // Selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Quick-add Customer state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickCustomerAddress, setQuickCustomerAddress] = useState('');
  const [quickCustomerType, setQuickCustomerType] = useState<'umum' | 'khusus'>('khusus');
  const [quickCustomerError, setQuickCustomerError] = useState(false);

  // Packing state
  const [wantsPacking, setWantsPacking] = useState(false);
  const [koliCount, setKoliCount] = useState(1);

  // DP (Down Payment) state
  const [hasDp, setHasDp] = useState(false);
  const [dpAmount, setDpAmount] = useState<number>(0);

  // Bayar Lunas di muka (pelanggan sudah bayar penuh saat faktur dibuat) — hanya untuk faktur baru
  const [isPaidUpfront, setIsPaidUpfront] = useState(false);
  const [paidUpfrontProofs, setPaidUpfrontProofs] = useState<PaymentProof[]>([]);
  const [isPaidUpfrontCameraOpen, setIsPaidUpfrontCameraOpen] = useState(false);

  const handlePaidUpfrontFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = reader.result as string;
      setPaidUpfrontProofs((prev) => [...prev, { url: img, description: '' }]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePaidUpfrontProof = (index: number) => {
    setPaidUpfrontProofs((prev) => prev.filter((_, i) => i !== index));
  };

  // Ongkir (Shipping fee) state
  const [hasOngkir, setHasOngkir] = useState(false);
  const [ongkirAmount, setOngkirAmount] = useState<number>(0);



  // Items State (draft rows)
  const [items, setItems] = useState<Omit<InvoiceItem, 'negotiatedBasePrice' | 'unitPrice' | 'totalPrice' | 'sizeSurcharge'>[]>([]);

  // Temporary row input state
  const [tempProductName, setTempProductName] = useState('');
  const [tempSize, setTempSize] = useState<string>('');
  const [tempQuantity, setTempQuantity] = useState<string>('');

  // State for editing individual draft items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Sync tempProductName with dynamic products once available
  useEffect(() => {
    if (shoeStylesPreset.length > 0) {
      setTempProductName(prev => shoeStylesPreset.includes(prev) ? prev : shoeStylesPreset[0]);
    }
  }, [products, shoeStylesPreset]);

  // Sync state values when in EDIT mode
  useEffect(() => {
    setEditingItemId(null);
    if (invoiceToEdit) {
      setSelectedCustomerId(invoiceToEdit.customerId);
      setSelectedSalesmanId(invoiceToEdit.salesmanId || '');
      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setDate(invoiceToEdit.date);
      setNotes(invoiceToEdit.notes || '');
      setWantsPacking(invoiceToEdit.wantsPacking);
      setKoliCount(invoiceToEdit.koliCount || 1);
      setHasDp(!!(invoiceToEdit.dpAmount && invoiceToEdit.dpAmount > 0));
      setDpAmount(invoiceToEdit.dpAmount || 0);
      setIsPaidUpfront(false);
      setPaidUpfrontProofs([]);
      setHasOngkir(!!invoiceToEdit.hasOngkir);
      setOngkirAmount(invoiceToEdit.ongkirAmount || 0);
      setItems(invoiceToEdit.items.map(item => ({
        id: item.id,
        productName: item.productName,
        size: item.size,
        quantity: item.quantity,
        basePrice: item.basePrice,
      })));
    } else {
      setSelectedCustomerId('');
      setSelectedSalesmanId('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setWantsPacking(false);
      setKoliCount(1);
      setHasDp(false);
      setDpAmount(0);
      setIsPaidUpfront(false);
      setPaidUpfrontProofs([]);
      setHasOngkir(false);
      setOngkirAmount(0);
      setItems([]);
    }
  }, [invoiceToEdit]);

  // Generate automated invoice number on load / date change
  useEffect(() => {
    if (invoiceToEdit) return; // Do not auto-generate if we are editing!
    const formattedDate = date.replace(/-/g, ''); // YYYYMMDD
    const currentYearMonth = date.substring(0, 7); // YYYY-MM
    const invoicesInMonth = invoices.filter(inv => inv.date.startsWith(currentYearMonth));
    
    let maxSeq = 0;
    invoicesInMonth.forEach(inv => {
      const parts = inv.invoiceNumber.split('/');
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        const seqNum = parseInt(lastPart, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });
    
    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(2, '0');
    setInvoiceNumber(`FK/${formattedDate}/${paddedSeq}`);
  }, [date, invoiceToEdit, invoices]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Calculated Dynamic Invoice
  const [dynamicInvoice, setDynamicInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!selectedCustomer) {
      setDynamicInvoice(null);
      return;
    }

    const selectedSalesman = salesmen?.find(s => s.id === selectedSalesmanId);

    const draftInvoice: Omit<Invoice, 'items' | 'totalPairs' | 'subtotal' | 'packingFee' | 'totalAmount'> = {
      id: invoiceToEdit ? invoiceToEdit.id : `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber || 'DRAFT',
      date,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerType: selectedCustomer.type,
      hasFlatPriceSizeLarge: selectedCustomer.hasFlatPriceSizeLarge,
      wantsPacking,
      koliCount: wantsPacking ? koliCount : 0,
      dpAmount: hasDp ? dpAmount : 0,
      hasOngkir,
      ongkirAmount: hasOngkir ? ongkirAmount : 0,
      paymentProofUrl: isPaidUpfront ? (paidUpfrontProofs[0]?.url || invoiceToEdit?.paymentProofUrl) : invoiceToEdit?.paymentProofUrl,
      paymentProofUrls: isPaidUpfront ? [...(invoiceToEdit?.paymentProofUrls || []), ...paidUpfrontProofs] : invoiceToEdit?.paymentProofUrls,
      payments: invoiceToEdit ? invoiceToEdit.payments : undefined,
      notes,
      status: invoiceToEdit ? (isPaidUpfront ? 'paid' : invoiceToEdit.status) : (isPaidUpfront ? 'paid' : 'unpaid'),
      salesmanId: selectedSalesman?.id || undefined,
      salesmanName: selectedSalesman?.name || undefined,
      commissionPerPair: invoiceToEdit && invoiceToEdit.salesmanId === selectedSalesmanId && invoiceToEdit.commissionPerPair !== undefined
        ? invoiceToEdit.commissionPerPair
        : (selectedSalesman?.commissionPerPair || undefined),
      commissionStatus: invoiceToEdit && invoiceToEdit.salesmanId === selectedSalesmanId
        ? invoiceToEdit.commissionStatus
        : (selectedSalesman ? 'unpaid' : undefined),
    };

    const calculated = calculateFullInvoice(draftInvoice, items, selectedCustomer, products, settings);

    if (isPaidUpfront) {
      const existingPayments = calculated.payments || [];
      const alreadyPaid = (calculated.dpAmount || 0) + existingPayments.reduce((sum, p) => sum + p.amount, 0);
      const remainingToSettle = Math.max(0, calculated.totalAmount - alreadyPaid);
      if (remainingToSettle > 0) {
        calculated.payments = [
          ...existingPayments,
          {
            id: `settlement-${Date.now()}`,
            amount: remainingToSettle,
            date,
            note: invoiceToEdit ? 'Faktur ditandai lunas saat perbaikan faktur' : 'Lunas dibayar di muka saat pembuatan faktur',
            type: 'settlement',
          },
        ];
      }
    }

    // Sisa tagihan harus memperhitungkan riwayat cicilan (payments), bukan hanya DP,
    // supaya cicilan yang sudah tercatat tidak "hilang" saat faktur diedit/disimpan ulang.
    const totalPaidFromPayments = (calculated.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = (calculated.dpAmount || 0) + totalPaidFromPayments;
    calculated.remainingBalance = calculated.status === 'paid' ? 0 : Math.max(0, calculated.totalAmount - totalPaid);

    setDynamicInvoice(calculated);
  }, [selectedCustomerId, selectedSalesmanId, salesmen, invoiceNumber, date, items, wantsPacking, koliCount, notes, selectedCustomer, hasDp, dpAmount, isPaidUpfront, paidUpfrontProofs, hasOngkir, ongkirAmount, products, invoiceToEdit, settings]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const numSize = clampToRange(tempSize, SIZE_MIN, SIZE_MAX);
    const numQuantity = clampToRange(tempQuantity, QTY_MIN, QTY_MAX);
    if (numSize === null || numQuantity === null || numQuantity <= 0 || !tempProductName.trim()) return;

    const basePriceSelected = selectedCustomer
      ? getCustomerProductPrice(selectedCustomer, tempProductName.trim(), products)
      : 135000;

    if (editingItemId) {
      // Edit existing draft item
      setItems(items.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            productName: tempProductName.trim(),
            size: numSize,
            quantity: numQuantity,
            basePrice: basePriceSelected,
          };
        }
        return item;
      }));
      setEditingItemId(null);
    } else {
      // Add new draft item
      const trimmedName = tempProductName.trim();
      const existingItemIndex = items.findIndex(
        item => item.productName.toLowerCase() === trimmedName.toLowerCase() && item.size === numSize
      );

      if (existingItemIndex !== -1) {
        setItems(items.map((item, idx) => {
          if (idx === existingItemIndex) {
            return {
              ...item,
              quantity: item.quantity + numQuantity,
              basePrice: basePriceSelected, // keep updated base price
            };
          }
          return item;
        }));
      } else {
        const newItem = {
          id: `dt-${Date.now()}`,
          productName: trimmedName,
          size: numSize,
          quantity: numQuantity,
          basePrice: basePriceSelected,
        };
        setItems([...items, newItem]);
      }
    }

    // Reset inputs
    setTempSize('');
    setTempQuantity('');
  };

  const handleStartEditItem = (item: typeof items[0]) => {
    setEditingItemId(item.id);
    setTempProductName(item.productName);
    setTempSize(String(item.size));
    setTempQuantity(String(item.quantity));
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setTempSize('');
    setTempQuantity('');
  };

  const handleRemoveItem = (id: string) => {
    if (editingItemId === id) {
      setEditingItemId(null);
    }
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = () => {
    const isAuthorized = invoiceToEdit ? hasActionAccess('canEditInvoice') : hasActionAccess('canCreateInvoice');
    if (!isAuthorized) {
      showToast("Anda tidak memiliki izin dari Super Admin untuk melakukan tindakan ini.", "error");
      return;
    }

    if (items.length === 0) {
      showToast("Silakan tambahkan minimal 1 jenis barang terlebih dahulu.", "warning");
      return;
    }
    if (!dynamicInvoice) return;
    onSaveInvoice(dynamicInvoice);
    showToast(`Faktur ${dynamicInvoice.invoiceNumber} berhasil disimpan ke Laporan Penjualan!`, "success");

    // Reset Form
    setItems([]);
    setEditingItemId(null);
    setWantsPacking(false);
    setKoliCount(1);
    setHasDp(false);
    setDpAmount(0);
    setIsPaidUpfront(false);
    setPaidUpfrontProofs([]);
    setHasOngkir(false);
    setOngkirAmount(0);
    setNotes('');
    setQuickCustomerName('');
    setQuickCustomerPhone('');
    setQuickCustomerAddress('');
    setQuickCustomerType('umum');
    setIsQuickAddOpen(false);
  };



  // Common styles/options synced above

  const isFormAuthorized = invoiceToEdit ? hasActionAccess('canEditInvoice') : hasActionAccess('canCreateInvoice');

  return (
    <div id="invoice-form-workspace-parent" className="space-y-6">
      {!isFormAuthorized && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sm text-rose-900">Akses Terbatas</h4>
            <p className="text-xs text-rose-800 mt-1">
              Anda tidak memiliki izin untuk <b>{invoiceToEdit ? 'mengubah faktur' : 'membuat faktur baru'}</b>. Tombol simpan telah dinonaktifkan. Silakan hubungi Super Admin untuk meminta otorisasi.
            </p>
          </div>
        </div>
      )}

      {invoiceToEdit && (
        <div className="bg-amber-50 border border-amber-250 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 border border-amber-200 text-amber-800 rounded-xl flex items-center justify-center font-extrabold text-lg">
              ✎
            </div>
            <div>
              <h4 className="font-extrabold text-amber-900 text-xs sm:text-sm">Mode Perbaikan Faktur</h4>
              <p className="text-xs text-amber-800/85">
                Memperbaiki <b>{invoiceToEdit.invoiceNumber}</b> untuk pelanggan <b>{invoiceToEdit.customerName}</b>. Simpan untuk memperbarui pencatatan.
              </p>
            </div>
          </div>
          {onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-sm"
            >
              Batal & Buat Baru
            </button>
          )}
        </div>
      )}

      <div id="invoice-form-workspace" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left 2 Cols: Inputs / Formulation */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Step 1: Customer & Header Meta */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">1</span>
            Informasi Pembeli & Faktur
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">Pilih Pelanggan *</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickAddOpen(!isQuickAddOpen);
                    setQuickCustomerName('');
                    setQuickCustomerError(false);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {isQuickAddOpen ? '✕ Batal' : '+ Pelanggan Baru'}
                </button>
              </div>

              {isQuickAddOpen ? (
                <div className="bg-indigo-50/50 border border-indigo-200 p-3 rounded-lg space-y-2 mt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-750 uppercase mb-0.5">Nama Pelanggan *</label>
                    <input
                      type="text"
                      placeholder="Nama pelanggan..."
                      value={quickCustomerName}
                      onChange={(e) => {
                        setQuickCustomerName(e.target.value);
                        if (e.target.value.trim()) {
                          setQuickCustomerError(false);
                        }
                      }}
                      className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-sm focus:outline-hidden focus:ring-2 transition ${
                        quickCustomerError 
                          ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/10' 
                          : 'border-indigo-200 focus:ring-indigo-500/20 focus:border-indigo-600'
                      }`}
                      autoFocus
                    />
                    {quickCustomerError && (
                      <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block animate-pulse">
                        Nama wajib diisi!
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-750 uppercase mb-0.5">No. Telp (Opsional)</label>
                    <input
                      type="text"
                      placeholder="0812..."
                      value={quickCustomerPhone}
                      onChange={(e) => setQuickCustomerPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-md text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-750 uppercase mb-0.5">Alamat (Opsional)</label>
                    <input
                      type="text"
                      placeholder="Alamat lengkap..."
                      value={quickCustomerAddress}
                      onChange={(e) => setQuickCustomerAddress(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-md text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickAddOpen(false);
                        setQuickCustomerName('');
                        setQuickCustomerPhone('');
                        setQuickCustomerAddress('');
                        setQuickCustomerType('khusus');
                        setQuickCustomerError(false);
                      }}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!quickCustomerName.trim()) {
                          setQuickCustomerError(true);
                          return;
                        }
                        const newId = `cust-${Date.now()}`;
                        const defaultCustomPrices: Record<string, number> = {};
                        const activeProds = products && products.length > 0 ? products : [];
                        activeProds.forEach((p) => {
                          defaultCustomPrices[p.name] = p.defaultPrice;
                        });

                        const newCust: Customer = {
                          enableVolumeDiscount: true,
                          volumeMode: 'umum',
                          id: newId,
                          name: quickCustomerName.trim(),
                          type: quickCustomerType,
                          hasFlatPriceSizeLarge: false,
                          customBasePrice: 135000,
                          customPrices: defaultCustomPrices,
                          phone: quickCustomerPhone.trim() || undefined,
                          address: quickCustomerAddress.trim() || undefined,
                        };
                        onAddCustomer(newCust);
                        setSelectedCustomerId(newId);
                        setIsQuickAddOpen(false);
                        setQuickCustomerName('');
                        setQuickCustomerPhone('');
                        setQuickCustomerAddress('');
                        setQuickCustomerType('khusus');
                        setQuickCustomerError(false);
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold shadow-xs border transition duration-200 cursor-pointer ${
                        quickCustomerName.trim()
                          ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border-emerald-700 hover:border-emerald-600 shadow-md'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-700 hover:shadow-md'
                      }`}
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-700"
                >
                  <option value="" className="text-slate-400">-- Pilih Pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Faktur (Otomatis)</label>
              <input
                type="text"
                value={invoiceNumber}
                readOnly
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
                placeholder="Otomatis digenerate..."
              />
            </div>



            <div>
              {/* Live indicators of customer configuration rules & info */}
              <label className="block text-xs font-semibold text-slate-700 mb-1">Detail & Profil Pelanggan</label>
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-xs space-y-2.5 shadow-2xs">
                {selectedCustomer ? (
                  (!selectedCustomer.phone && !selectedCustomer.address) ? (
                    <div className="text-center py-2 text-slate-400 italic">
                      Tidak ada data No. Telepon & Alamat.
                    </div>
                  ) : (
                    <>
                      {selectedCustomer.phone && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">No. Telepon:</span>
                          <span className="font-semibold text-slate-700">{selectedCustomer.phone}</span>
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div className={`${selectedCustomer.phone ? 'pt-2 border-t border-slate-200/50' : ''} text-left`}>
                          <span className="text-slate-400 block mb-0.5 text-[9px] uppercase font-bold tracking-wider">Alamat Pelanggan:</span>
                          <span className="text-slate-700 font-medium block leading-relaxed bg-white p-2 border border-slate-200/50 rounded-md shadow-2xs break-words font-sans">
                            {selectedCustomer.address}
                          </span>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className="text-center py-4 text-slate-400 italic">
                    Belum ada pelanggan terpilih.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Product items / Adders */}
        <div className="relative">
          {!selectedCustomer && (
            <div className="absolute inset-0 bg-slate-50/75 backdrop-blur-xs rounded-xl z-10 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-300">
              <UserCheck className="w-8 h-8 text-indigo-500 mb-2 animate-pulse" />
              <p className="font-semibold text-slate-700 text-sm">Pelanggan Belum Dipilih</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                Silakan pilih pelanggan terlebih dahulu di langkah #1 untuk mengisi daftar belanja.
              </p>
            </div>
          )}
          <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 ${!selectedCustomer ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">2</span>
              Daftar Barang Belanja
            </h3>

            {/* Inline Add Item Form */}
            {editingItemId && (
              <div className="bg-amber-50 border border-amber-250 rounded-xl p-3 text-xs text-amber-800 font-medium flex items-center justify-between shadow-3xs">
                <span className="flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-amber-600" />
                  Anda sedang memperbaiki baris produk dalam daftar ini.
                </span>
                <button
                  type="button"
                  onClick={handleCancelEditItem}
                  className="text-amber-900 border border-amber-300 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            )}
            <form onSubmit={handleAddItem} className={`p-4 border rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-end transition duration-200 ${
              editingItemId ? 'bg-amber-50/45 border-amber-200 shadow-3xs' : 'bg-slate-50/60 border-slate-150'
            }`}>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sepatu / Model</label>
                <div className="relative">
                  <select
                     value={tempProductName}
                     onChange={(e) => setTempProductName(e.target.value)}
                     className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  >
                    {shoeStylesPreset.map((style) => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ukuran / Size</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={tempSize}
                  onChange={(e) => setTempSize(sanitizeNumericInput(e.target.value, SIZE_MAX))}
                  onBlur={() => {
                    const clamped = clampToRange(tempSize, SIZE_MIN, SIZE_MAX);
                    if (clamped !== null) setTempSize(String(clamped));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah (Pasang)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={tempQuantity}
                  onChange={(e) => setTempQuantity(sanitizeNumericInput(e.target.value, QTY_MAX))}
                  onBlur={() => {
                    const clamped = clampToRange(tempQuantity, QTY_MIN, QTY_MAX);
                    if (clamped !== null) setTempQuantity(String(clamped));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2"
                />
                <button
                  type="submit"
                  className={`px-3 py-2 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
                    editingItemId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                  title={editingItemId ? 'Simpan Perbaikan Baris' : 'Tambah ke Daftar'}
                >
                  {editingItemId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </form>

          {/* Current Table Of Items */}
          <div className="sm:hidden text-center text-[10px] text-indigo-700 bg-indigo-50/50 py-1.5 px-2 rounded-lg font-semibold select-none mb-1">
            ← Geser table ke samping untuk scroll rincian barang →
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-xs font-semibold text-slate-500 bg-slate-50/50">
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-2 text-center">Size</th>
                  <th className="py-2.5 px-2 text-center">Jumlah (Psg)</th>
                  <th className="py-2.5 px-3 text-right">Harga Dasar</th>
                  <th className="py-2.5 px-3 text-right">Surcharge Size</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-1 py-1.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {dynamicInvoice?.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3 font-medium text-slate-700">{item.productName}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.size >= 44 ? 'bg-amber-100/60 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                        {item.size}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-semibold text-slate-850">{item.quantity} pasang</td>
                    <td className="py-3 px-3 text-right text-slate-600 font-mono text-xs">
                      {formatCurrency(item.negotiatedBasePrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 font-mono text-xs">
                      {item.sizeSurcharge > 0 ? (
                        <span className="text-amber-600">+{formatCurrency(item.sizeSurcharge)}</span>
                      ) : (
                        <span className="text-slate-450">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800 font-mono text-xs">
                      {formatCurrency(item.totalPrice)}
                    </td>
                    <td className="py-3 px-1 text-center flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditItem(item)}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          editingItemId === item.id 
                            ? 'bg-amber-100 text-amber-850 font-bold' 
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                        title="Perbaiki / Edit Baris"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="py-8 text-center text-slate-400">
                <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="text-xs">Daftar belanja masih kosong.</p>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Step 3: Packing & Notes */}
        <div className="relative">
          {!selectedCustomer && (
            <div className="absolute inset-0 bg-slate-50/75 backdrop-blur-xs rounded-xl z-10 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-300">
              <UserCheck className="w-8 h-8 text-indigo-500 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Pelanggan Belum Dipilih</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                Silakan pilih pelanggan terlebih dahulu untuk mengaktifkan opsi rincian biaya.
              </p>
            </div>
          )}
          <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 ${!selectedCustomer ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">3</span>
              Layanan Tambahan & Catatan
            </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Left Column: Packing & DP */}
            <div className="space-y-4">
              {/* Packing Selector */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="wantsPacking"
                    checked={wantsPacking}
                    onChange={(e) => setWantsPacking(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor="wantsPacking" className="text-sm font-semibold text-slate-800 select-none cursor-pointer">
                      Gunakan Packing Koli (+{formatCurrency(20000)}/koli)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Aktifkan jika pelanggan menghendaki pengemasan khusus per koli.
                    </p>
                  </div>
                </div>

                {wantsPacking && (
                  <div className="pt-3 pl-7.5 border-t border-slate-200/50 space-y-3">
                    <div className="max-w-[200px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jumlah Koli</label>
                      <input
                        type="number"
                        min="1"
                        value={koliCount}
                        onChange={(e) => setKoliCount(Math.max(1, Number(e.target.value)))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-700 text-center font-mono"
                      />
                    </div>
                    
                    <div className="text-xs font-bold text-indigo-700 flex justify-between bg-white px-2.5 py-2 rounded-lg border border-indigo-100 shadow-3xs">
                      <span>Total Biaya Packing:</span>
                      <span className="font-mono">{formatCurrency(koliCount * 20000)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* DP / Uang Muka Selector */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="hasDp"
                    checked={hasDp}
                    disabled={isPaidUpfront}
                    onChange={(e) => {
                      setHasDp(e.target.checked);
                      if (!e.target.checked) setDpAmount(0);
                      if (e.target.checked) setIsPaidUpfront(false);
                    }}
                    className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500 mt-0.5 disabled:opacity-40"
                  />
                  <div className="flex-1">
                    <label htmlFor="hasDp" className={`text-sm font-semibold select-none ${isPaidUpfront ? 'text-slate-400 cursor-not-allowed' : 'text-slate-800 cursor-pointer'}`}>
                      Pembayaran Uang Muka (DP)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Aktifkan jika pelanggan membayar uang muka terlebih dahulu.
                      {isPaidUpfront && ' (Nonaktifkan "Bayar Lunas" terlebih dahulu untuk memakai opsi ini.)'}
                    </p>
                  </div>
                </div>

                {hasDp && (
                  <div className="pt-3 pl-7.5 border-t border-slate-200/50 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 font-semibold shrink-0">Nominal DP:</span>
                      <div className="relative flex-1 max-w-[200px]">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={dpAmount ? dpAmount.toLocaleString('id-ID') : ''}
                          onChange={(e) => setDpAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                          placeholder="0"
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-left font-mono font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 outline-none"
                        />
                      </div>
                    </div>
                    {dynamicInvoice && dpAmount > 0 && (
                      <p className="text-[11px] text-indigo-700 font-medium">
                        Sisa tagihan yang harus dilunasi: <span className="font-semibold">{formatCurrency(Math.max(0, dynamicInvoice.totalAmount - dpAmount))}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Bayar Lunas di muka / Tandai Lunas Selector */}
              {(() => {
                const alreadyPaid = invoiceToEdit?.status === 'paid';
                const isDisabled = hasDp || alreadyPaid;
                return (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-150 space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="isPaidUpfront"
                        checked={alreadyPaid ? true : isPaidUpfront}
                        disabled={isDisabled}
                        onChange={(e) => {
                          setIsPaidUpfront(e.target.checked);
                          if (e.target.checked) {
                            setHasDp(false);
                            setDpAmount(0);
                          } else {
                            setPaidUpfrontProofs([]);
                          }
                        }}
                        className="w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded-sm focus:ring-emerald-500 mt-0.5 disabled:opacity-40"
                      />
                      <div className="flex-1">
                        <label htmlFor="isPaidUpfront" className={`text-sm font-semibold select-none ${isDisabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-800 cursor-pointer'}`}>
                          {invoiceToEdit ? 'Tandai Faktur Ini Lunas' : 'Pelanggan Sudah Bayar Lunas'}
                        </label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {alreadyPaid
                            ? 'Faktur ini sudah berstatus Lunas.'
                            : invoiceToEdit
                              ? 'Aktifkan jika pelanggan sudah melunasi sisa tagihan faktur ini. Faktur akan tersimpan dengan status Lunas dan sisa tagihan Rp 0.'
                              : 'Aktifkan jika pelanggan sudah membayar penuh saat faktur ini dibuat. Faktur akan langsung tersimpan dengan status Lunas dan sisa tagihan Rp 0.'}
                          {hasDp && !alreadyPaid && ' (Nonaktifkan DP terlebih dahulu untuk memakai opsi ini.)'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Biaya Ongkir / Ongkos Kirim Selector */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="hasOngkir"
                    checked={hasOngkir}
                    onChange={(e) => {
                      setHasOngkir(e.target.checked);
                      if (!e.target.checked) setOngkirAmount(0);
                    }}
                    className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500 mt-0.5 pointer-events-auto cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="hasOngkir" className="text-sm font-semibold text-slate-800 select-none cursor-pointer">
                      Tambahkan Ongkos Kirim (Biaya Ongkir)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Aktifkan jika ingin menambahkan biaya pengiriman/ekspedisi ke dalam faktur ini.
                    </p>
                  </div>
                </div>

                {hasOngkir && (
                  <div className="pt-3 pl-7.5 border-t border-slate-200/50 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 font-semibold shrink-0">Biaya Ongkir:</span>
                      <div className="relative flex-1 max-w-[200px]">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={ongkirAmount ? ongkirAmount.toLocaleString('id-ID') : ''}
                          onChange={(e) => setOngkirAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                          placeholder="0"
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-left font-mono font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
            </div>
            </div>

            {/* Right Column: Memo & Bukti Transaksi */}
            <div className="space-y-4">
            {/* Memo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Faktur (Pengiriman / Pembayaran)</label>
              <textarea
                placeholder="Contoh: Kirim via Kobra Express, jatuh tempo pembayaran 14 hari."
                rows={3}
                value={notes || ''}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none text-slate-700"
              />
            </div>

            {/* Bukti Transaksi upload — hanya muncul jika Bayar Lunas dicentang */}
            {isPaidUpfront && (
              <div className="bg-emerald-50/50 border border-emerald-150 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Bukti Transaksi ({paidUpfrontProofs.length} Foto Pembayaran)
                  </label>
                  <div className="flex gap-2">
                    <label className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-3xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      Unggah File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePaidUpfrontFileUpload(file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsPaidUpfrontCameraOpen(true)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Kamera
                    </button>
                  </div>
                </div>

                {paidUpfrontProofs.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {paidUpfrontProofs.map((p, index) => (
                      <div key={index} className="relative aspect-video w-full bg-slate-900 border border-slate-200 rounded-lg overflow-hidden shadow-3xs group">
                        <img
                          src={p.url}
                          alt={`Bukti Pembayaran #${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePaidUpfrontProof(index)}
                            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-650 text-[10px] font-bold rounded-lg transition shadow cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Belum ada bukti transaksi yang diunggah (opsional).</p>
                )}
              </div>
            )}
            </div>

          </div>
        </div>
      </div>

      </div>

      {/* Right Column: Automated Calculations Panel & Storage actions */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Dynamic Calculator & Checkout Panel */}
        <div className="bg-indigo-950 text-white rounded-2xl p-6 shadow-md border border-indigo-900 sticky top-4 flex flex-col justify-center min-h-[350px]">
          {!selectedCustomer ? (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 bg-indigo-900/60 rounded-full flex items-center justify-center text-indigo-300">
                <Inbox className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-white/90 text-sm">Menunggu Pilihan Pelanggan</p>
                <p className="text-xs text-indigo-200 mt-1 max-w-[200px] mx-auto leading-relaxed">
                  Pilih pelanggan terlebih dahulu di langkah #1 untuk mengaktifkan ringkasan faktur otomatis di sini.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3 mb-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-indigo-300">Ringkasan Faktur</span>
                  <span className="bg-indigo-800 text-indigo-100 text-[10px] font-bold font-mono px-2 py-0.5 rounded">AUTO-CALC</span>
                </div>



            {/* Calculations metrics lists */}
            <div className="space-y-3.5 text-sm border-b border-indigo-900/60 pb-4 mb-4">
              <div className="flex justify-between items-center text-indigo-200">
                <span>Total Pasang Sepatu:</span>
                <span className="font-semibold text-white text-base font-mono">
                  {dynamicInvoice?.totalPairs || 0} Psg
                </span>
              </div>

              <div className="flex justify-between items-center text-indigo-200">
                <span>Subtotal Barang:</span>
                <span className="font-semibold text-white text-sm font-mono">
                  {dynamicInvoice ? formatCurrency(dynamicInvoice.subtotal) : 'Rp 0'}
                </span>
              </div>

              {wantsPacking && (
                <div className="flex justify-between items-center text-indigo-200">
                  <span className="flex items-center gap-1">
                    <Box className="w-3.5 h-3.5 text-indigo-400" />
                    Biaya Packing ({koliCount} Koli):
                  </span>
                  <span className="font-semibold text-white text-sm font-mono">
                    {dynamicInvoice ? formatCurrency(dynamicInvoice.packingFee) : 'Rp 0'}
                  </span>
                </div>
              )}

              {dynamicInvoice?.ppnAmount !== undefined && dynamicInvoice.ppnAmount > 0 && (
                <div className="flex justify-between items-center text-indigo-200">
                  <span>Pajak PPN ({dynamicInvoice.taxRate}%):</span>
                  <span className="font-semibold text-white text-sm font-mono">
                    {formatCurrency(dynamicInvoice.ppnAmount)}
                  </span>
                </div>
              )}

              {hasOngkir && ongkirAmount > 0 && (
                <div className="flex justify-between items-center text-indigo-200">
                  <span>Ongkos Kirim (Ongkir):</span>
                  <span className="font-semibold text-white text-sm font-mono">
                    {formatCurrency(ongkirAmount)}
                  </span>
                </div>
              )}

              {hasDp && dpAmount > 0 && (
                <div className="flex justify-between items-center text-amber-300">
                  <span>Uang Muka (DP):</span>
                  <span className="font-semibold text-amber-400 text-sm font-mono">
                    -{formatCurrency(dpAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* Grand Total display */}
            <div className="space-y-3 mb-8">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold block">Total Harga Net:</span>
                <div className="text-3xl font-bold text-emerald-400 font-mono tracking-tight leading-none">
                  {dynamicInvoice ? formatCurrency(dynamicInvoice.totalAmount) : 'Rp 0'}
                </div>
              </div>

              {hasDp && dpAmount > 0 && (
                <div className="bg-white/5 border border-white/10 p-2.5 rounded-lg space-y-1">
                  <div className="flex justify-between text-xs text-indigo-200">
                    <span>Sudah Dibayar (DP):</span>
                    <span className="text-amber-300 font-semibold font-mono">{formatCurrency(dpAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white mt-1 border-t border-indigo-900/40 pt-1">
                    <span>Sisa Tagihan (Piutang):</span>
                    <span className="font-mono text-emerald-400">{dynamicInvoice ? formatCurrency(Math.max(0, dynamicInvoice.totalAmount - dpAmount)) : 'Rp 0'}</span>
                  </div>
                </div>
              )}

              {isPaidUpfront && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 rounded-lg text-xs font-bold uppercase tracking-wide">
                  Faktur Akan Tersimpan Lunas (Sisa Tagihan Rp 0)
                </div>
              )}

              <span className="text-[10px] text-indigo-350 block mt-1">
                Kalkulasi real-time mengacu pada regulasi diskon pembeli.
              </span>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dynamicInvoice || dynamicInvoice.items.length === 0 || !(invoiceToEdit ? hasActionAccess('canEditInvoice') : hasActionAccess('canCreateInvoice'))}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-indigo-950 rounded-xl font-bold text-sm tracking-wide transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5 text-indigo-950" />
              {invoiceToEdit ? 'Ubah & Perbaiki Faktur' : 'Simpan & Cetak Faktur'}
            </button>
            <p className="text-[10px] text-center text-indigo-300">
              {invoiceToEdit ? 'Memperbaiki faktur akan memperbarui rekaman lama di laporan tanpa menduplikasi data.' : 'Menyimpan faktur otomatis membuat entitas baru di Laporan Penjualan serta memperbaharui laporan grafik.'}
            </p>
          </div>
          </div>
          )}
        </div>
      </div>

    </div>

    {isPaidUpfrontCameraOpen && (
      <CameraModal
        onClose={() => setIsPaidUpfrontCameraOpen(false)}
        onCapture={(img) => {
          setPaidUpfrontProofs((prev) => [...prev, { url: img, description: '' }]);
          setIsPaidUpfrontCameraOpen(false);
          showToast('Foto bukti transaksi berhasil diambil!', 'success');
        }}
      />
    )}
    </div>
  );
}
