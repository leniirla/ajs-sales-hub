/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Customer, Product, Invoice, AppUserPermissions } from '../types';
import { formatCurrency, showToast } from '../utils';
import { Plus, Edit2, Search, Trash2, Check, UserCheck, Settings, Users, Phone, MapPin, X, AlertTriangle, ShieldAlert } from 'lucide-react';

interface CustomerManagerProps {
  customers: Customer[];
  products: Product[];
  invoices?: Invoice[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  hasActionAccess?: (actionId: keyof AppUserPermissions) => boolean;
}

export default function CustomerManager({
  customers,
  products,
  invoices = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  hasActionAccess = () => true,
}: CustomerManagerProps) {
  const activeProducts = products;
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'umum' | 'khusus'>('khusus');
  const [hasFlatPriceSizeLarge, setHasFlatPriceSizeLarge] = useState(false);
  const [enableVolumeDiscount, setEnableVolumeDiscount] = useState(false);
  const [volumeMode, setVolumeMode] = useState<'umum' | 'kustom' | 'tanpa_volume'>('tanpa_volume');
  const [customBasePrice, setCustomBasePrice] = useState(135000);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [customTier2Prices, setCustomTier2Prices] = useState<Record<string, number>>({});
  const [customTier3Prices, setCustomTier3Prices] = useState<Record<string, number>>({});
  const [customTier2MinQty, setCustomTier2MinQty] = useState<Record<string, number>>({});
  const [customTier3MinQty, setCustomTier3MinQty] = useState<Record<string, number>>({});
  const [customSizeSurcharges, setCustomSizeSurcharges] = useState<Record<string, number>>({});

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setType('khusus');
    setHasFlatPriceSizeLarge(false);
    setEnableVolumeDiscount(false);
    setVolumeMode('tanpa_volume');
    setCustomBasePrice(135000);
    setPhone('');
    setAddress('');
    
    // Set up default product presets in customPrices state
    const prices: Record<string, number> = {};
    const t2Prices: Record<string, number> = {};
    const t3Prices: Record<string, number> = {};
    const t2Limits: Record<string, number> = {};
    const t3Limits: Record<string, number> = {};
    activeProducts.forEach((p) => {
      const lowerName = p.name.toLowerCase();
      let defaultT2Qty = 100;
      let defaultT3Qty = 300;
      let defaultT1Price = p.defaultPrice;
      let defaultT2Price = p.priceTier2 !== undefined ? p.priceTier2 : p.defaultPrice - 2500;
      let defaultT3Price = p.priceTier3 !== undefined ? p.priceTier3 : p.defaultPrice - 5000;

      if (lowerName.includes('dov')) {
        defaultT2Qty = 100;
        defaultT3Qty = 350;
        defaultT1Price = 135000;
        defaultT2Price = 132500;
        defaultT3Price = 130000;
      } else if (lowerName.includes('mldp')) {
        defaultT2Qty = 200;
        defaultT3Qty = 250;
        defaultT1Price = 152500;
        defaultT2Price = 151500; // Starting suggested value, they can fill
        defaultT3Price = 150000;
      }

      prices[p.name] = defaultT1Price;
      t2Prices[p.name] = defaultT2Price;
      t3Prices[p.name] = defaultT3Price;
      t2Limits[p.name] = defaultT2Qty;
      t3Limits[p.name] = defaultT3Qty;
    });
    setCustomPrices(prices);
    setCustomTier2Prices(t2Prices);
    setCustomTier3Prices(t3Prices);
    setCustomTier2MinQty(t2Limits);
    setCustomTier3MinQty(t3Limits);
    setCustomSizeSurcharges({});
    
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setType(customer.type);
    setHasFlatPriceSizeLarge(customer.hasFlatPriceSizeLarge);
    setEnableVolumeDiscount(customer.enableVolumeDiscount || false);
    setVolumeMode(customer.volumeMode || (customer.enableVolumeDiscount ? 'umum' : 'tanpa_volume'));
    setCustomBasePrice(customer.customBasePrice);
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    
    // Load existing customPrices or default from presets
    const prices: Record<string, number> = {};
    const t2Prices: Record<string, number> = {};
    const t3Prices: Record<string, number> = {};
    const t2Limits: Record<string, number> = {};
    const t3Limits: Record<string, number> = {};
    activeProducts.forEach((p) => {
      const lowerName = p.name.toLowerCase();
      let defaultT2Qty = 100;
      let defaultT3Qty = 300;
      let defaultT1Price = p.defaultPrice;
      let defaultT2Price = p.priceTier2 !== undefined ? p.priceTier2 : p.defaultPrice - 2500;
      let defaultT3Price = p.priceTier3 !== undefined ? p.priceTier3 : p.defaultPrice - 5000;

      if (lowerName.includes('dov')) {
        defaultT2Qty = 100;
        defaultT3Qty = 350;
        defaultT1Price = 135000;
        defaultT2Price = 132500;
        defaultT3Price = 130000;
      } else if (lowerName.includes('mldp')) {
        defaultT2Qty = 200;
        defaultT3Qty = 250;
        defaultT1Price = 152500;
        defaultT2Price = 151500;
        defaultT3Price = 150000;
      }

      prices[p.name] = (customer.customPrices && customer.customPrices[p.name] !== undefined)
        ? customer.customPrices[p.name]
        : defaultT1Price;

      t2Prices[p.name] = (customer.customTier2Prices && customer.customTier2Prices[p.name] !== undefined)
        ? customer.customTier2Prices[p.name]
        : defaultT2Price;

      t3Prices[p.name] = (customer.customTier3Prices && customer.customTier3Prices[p.name] !== undefined)
        ? customer.customTier3Prices[p.name]
        : defaultT3Price;

      t2Limits[p.name] = (customer.customTier2MinQty && customer.customTier2MinQty[p.name] !== undefined)
        ? customer.customTier2MinQty[p.name]
        : defaultT2Qty;

      t3Limits[p.name] = (customer.customTier3MinQty && customer.customTier3MinQty[p.name] !== undefined)
        ? customer.customTier3MinQty[p.name]
        : defaultT3Qty;
    });
    setCustomPrices(prices);
    setCustomTier2Prices(t2Prices);
    setCustomTier3Prices(t3Prices);
    setCustomTier2MinQty(t2Limits);
    setCustomTier3MinQty(t3Limits);
    setCustomSizeSurcharges(customer.customSizeSurcharges || {});
    
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Filter customPrices so they only contain active master products
    const filteredCustomPrices: Record<string, number> = {};
    const filteredCustomTier2Prices: Record<string, number> = {};
    const filteredCustomTier3Prices: Record<string, number> = {};
    const filteredCustomTier2MinQty: Record<string, number> = {};
    const filteredCustomTier3MinQty: Record<string, number> = {};

    activeProducts.forEach((p) => {
      filteredCustomPrices[p.name] = customPrices[p.name] !== undefined ? customPrices[p.name] : p.defaultPrice;
      const stdT2 = p.priceTier2 !== undefined ? p.priceTier2 : p.defaultPrice - 2500;
      const stdT3 = p.priceTier3 !== undefined ? p.priceTier3 : p.defaultPrice - 5000;
      filteredCustomTier2Prices[p.name] = customTier2Prices[p.name] !== undefined ? customTier2Prices[p.name] : stdT2;
      filteredCustomTier3Prices[p.name] = customTier3Prices[p.name] !== undefined ? customTier3Prices[p.name] : stdT3;
      filteredCustomTier2MinQty[p.name] = customTier2MinQty[p.name] !== undefined ? customTier2MinQty[p.name] : 100;
      filteredCustomTier3MinQty[p.name] = customTier3MinQty[p.name] !== undefined ? customTier3MinQty[p.name] : 300;
    });

    const filteredCustomSizeSurcharges: Record<string, number> = {};
    activeProducts.forEach((p) => {
      if (customSizeSurcharges[p.name] !== undefined) {
        filteredCustomSizeSurcharges[p.name] = customSizeSurcharges[p.name];
      }
    });

    const customerData: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
      name: name.trim(),
      type,
      hasFlatPriceSizeLarge,
      enableVolumeDiscount: volumeMode === 'umum',
      volumeMode,
      customBasePrice: Number(customBasePrice) || 135000,
      customPrices: filteredCustomPrices,
      customTier2Prices: filteredCustomTier2Prices,
      customTier3Prices: filteredCustomTier3Prices,
      customTier2MinQty: filteredCustomTier2MinQty,
      customTier3MinQty: filteredCustomTier3MinQty,
      customSizeSurcharges: filteredCustomSizeSurcharges,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
    };

    if (editingCustomer) {
      onUpdateCustomer(customerData);
      showToast("Data pelanggan berhasil diperbarui!", "success");
    } else {
      onAddCustomer(customerData);
      showToast("Pelanggan baru berhasil didaftarkan!", "success");
    }
    setIsFormOpen(false);
  };

  const isCustomerLinked = (id: string) => {
    return invoices.some((inv) => inv.customerId === id);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (customerToDelete) {
      onDeleteCustomer(customerToDelete.id);
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      showToast("Pelanggan berhasil dihapus!", "success");
    }
  };

  return (
    <div id="customer-manager-container" className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Kelola Pelanggan
          </h2>
          <p className="text-sm text-slate-500">
            Atur pelanggan, preferensi tarif size, dan tipe harga grosor khusus.
          </p>
        </div>
        {(() => {
          const canManage = hasActionAccess('canManageMasterData');
          return (
            <button
              disabled={!canManage}
              onClick={() => {
                if (canManage) {
                  handleOpenAdd();
                }
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-sm font-medium transition shadow-sm self-start sm:self-auto ${
                canManage
                  ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-85'
              }`}
              title={canManage ? 'Tambah Pelanggan Baru' : 'Akses Dibatasi: Anda tidak memiliki izin mengelola master data'}
            >
              <Plus className="w-4 h-4" />
              {canManage ? 'Tambah Pelanggan' : 'Akses Terbatas'}
            </button>
          );
        })()}
      </div>

      {/* Control Area */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
        </div>
      </div>

      {/* Grid of Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition duration-150 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800 text-base">{cust.name}</h3>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {cust.hasFlatPriceSizeLarge ? (
                      <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-medium px-2 py-0.5 rounded-full">
                        Size 44+ Harga Flat
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-100 text-xs font-medium px-2 py-0.5 rounded-full">
                        Size 44+ (+5.000)
                      </span>
                    )}

                    {(() => {
                      const mode = cust.volumeMode || (cust.enableVolumeDiscount ? 'umum' : 'tanpa_volume');
                      if (mode === 'umum') {
                        return (
                          <span className="inline-flex items-center bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold px-2 py-0.5 rounded-full">
                            Volume: Ikut Sepatu (Umum)
                          </span>
                        );
                      } else if (mode === 'kustom') {
                        return (
                          <span className="inline-flex items-center bg-amber-50 text-amber-800 border border-amber-250 text-xs font-semibold px-2 py-0.5 rounded-full">
                            Volume: Kustom Sendiri
                          </span>
                        );
                      } else {
                        return (
                          <span className="inline-flex items-center bg-slate-50 text-slate-500 border border-slate-200 text-xs font-normal px-2 py-0.5 rounded-full">
                            Volume: Kunci Harga Normal
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(() => {
                    const canManage = hasActionAccess('canManageMasterData');
                    return (
                      <>
                        <button
                          disabled={!canManage}
                          onClick={() => {
                            if (canManage) {
                              handleOpenEdit(cust);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            canManage 
                              ? 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50 cursor-pointer' 
                              : 'text-slate-200 cursor-not-allowed'
                          }`}
                          title={canManage ? 'Edit Pelanggan' : 'Akses Dibatasi: Anda tidak memiliki izin mengelola master data'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={!canManage}
                          onClick={() => {
                            if (canManage) {
                              handleDeleteClick(cust);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition duration-150 ${
                            canManage 
                              ? 'text-slate-400 hover:text-red-650 hover:bg-red-50 cursor-pointer' 
                              : 'text-slate-200 cursor-not-allowed'
                          }`}
                          title={canManage ? 'Hapus Pelanggan' : 'Akses Dibatasi: Anda tidak memiliki izin mengelola master data'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Specs & Info */}
              <div className="border-t border-slate-100 pt-3 mt-3 space-y-2 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Harga Normal / Fallback:</span>
                  <span className="font-semibold text-slate-700 text-sm">
                    {formatCurrency(cust.customBasePrice)}
                  </span>
                </div>
                
                {/* Specific Shoe Prices */}
                <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 mt-1.5">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Daftar Harga per Jenis Sepatu:
                  </span>
                  <div className="space-y-1 text-[11px] text-slate-600 font-medium">
                    {activeProducts.map((p) => {
                      const hasCustom = cust.customPrices && cust.customPrices[p.name] !== undefined && cust.customPrices[p.name] !== p.defaultPrice;
                      const price = cust.customPrices && cust.customPrices[p.name] !== undefined ? cust.customPrices[p.name] : p.defaultPrice;
                      return (
                        <div key={p.name} className="flex justify-between items-center gap-2">
                          <span className="truncate text-slate-500" title={p.name}>⬩ {p.name}</span>
                          <span className={`${hasCustom ? 'text-indigo-600 font-semibold' : 'text-slate-700'} font-mono`}>
                            {formatCurrency(price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {cust.phone && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cust.phone}</span>
                  </div>
                )}
                {cust.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="line-clamp-2">{cust.address}</span>
                  </div>
                )}
              </div>
            </div>

            {(() => {
              const mode = cust.volumeMode || (cust.enableVolumeDiscount ? 'umum' : 'tanpa_volume');
              if (mode === 'umum') {
                return (
                  <div className="mt-4 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/40">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-indigo-700 mb-1">
                      Aturan Tingkat Volume (Umum):
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-650">
                      <div>• &gt; 100 pasang: <b className="text-indigo-700">- Rp 2.500</b></div>
                      <div>• &gt; 300 pasang: <b className="text-indigo-700">- Rp 5.000</b></div>
                    </div>
                  </div>
                );
              } else if (mode === 'kustom') {
                return (
                  <div className="mt-4 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/30">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-amber-800 mb-1.5">
                      Aturan Tingkat Volume (Kustom Per-Jenis):
                    </span>
                    <div className="space-y-1.5 text-[10px] text-slate-650">
                      {activeProducts.map((p) => {
                        const normalPrice = cust.customPrices?.[p.name] !== undefined ? cust.customPrices[p.name] : p.defaultPrice;
                        const t2Price = cust.customTier2Prices?.[p.name] !== undefined ? cust.customTier2Prices[p.name] : (p.priceTier2 !== undefined ? p.priceTier2 : p.defaultPrice - 2500);
                        const t3Price = cust.customTier3Prices?.[p.name] !== undefined ? cust.customTier3Prices[p.name] : (p.priceTier3 !== undefined ? p.priceTier3 : p.defaultPrice - 5000);
                        
                        const t2Limit = cust.customTier2MinQty?.[p.name] !== undefined ? cust.customTier2MinQty[p.name] : 100;
                        const t3Limit = cust.customTier3MinQty?.[p.name] !== undefined ? cust.customTier3MinQty[p.name] : 300;

                        return (
                          <div key={p.name} className="border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                            <span className="font-bold text-slate-800 block mb-0.5">{p.name}</span>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[9px] text-right">
                              <div className="text-left select-none text-slate-500">
                                &le;{t2Limit} psg: <b className="text-slate-700 font-sans font-semibold">Rp {normalPrice.toLocaleString('id-ID')}</b>
                              </div>
                              <div className="text-center text-indigo-700 font-sans font-semibold">
                                &gt;{t2Limit} psg: Rp {t2Price.toLocaleString('id-ID')}
                              </div>
                              <div className="text-right text-emerald-700 font-sans font-semibold">
                                &gt;{t3Limit} psg: Rp {t3Price.toLocaleString('id-ID')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="mt-4 bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-[11px] text-slate-500 italic">
                    * Kunci Harga Normal: Tidak dikenakan hitungan grosir volume.
                  </div>
                );
              }
            })()}
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full bg-slate-50 rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">Tidak ada pelanggan ditemukan.</p>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className={`bg-white rounded-2xl shadow-xl border border-slate-100 w-full ${volumeMode === 'kustom' ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150`}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-slate-200/65 rounded-lg text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pelanggan / Toko *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Toko Maju Jaya Sepatu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Harga Dasar Satuan (Rp)
                </label>
                <input
                  type="number"
                  min="1000"
                  value={customBasePrice}
                  onChange={(e) => setCustomBasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              {/* Harga Kustom Per Jenis Sepatu */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 shrink-0">
                <span className="block text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Harga Kustom per Jenis Sepatu (Rp)
                </span>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Atur harga dasar khusus untuk masing-masing jenis sepatu. Ini akan otomatis disesuaikan dengan volume order yang dibuat.
                </p>
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {activeProducts.map((product) => {
                    const priceValue = customPrices[product.name] !== undefined ? customPrices[product.name] : product.defaultPrice;
                    return (
                      <div key={product.name} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-600 font-semibold truncate flex-1" title={product.name}>
                          {product.name}
                        </span>
                        <input
                          type="number"
                          min="1000"
                          value={priceValue}
                          onChange={(e) => {
                            setCustomPrices({
                              ...customPrices,
                              [product.name]: Number(e.target.value) || 0
                            });
                          }}
                          className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rule Toggles */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="hasFlatPriceSizeLarge"
                    checked={hasFlatPriceSizeLarge}
                    onChange={(e) => setHasFlatPriceSizeLarge(e.target.checked)}
                    className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500 mt-0.5 pointer-events-auto cursor-pointer"
                  />
                  <label htmlFor="hasFlatPriceSizeLarge" className="text-sm text-slate-700 select-none cursor-pointer">
                    <span className="font-semibold block text-slate-800">Aturan Harga Flat Size Besar</span>
                    Jika dicentang, pelanggan ini dikenakan harga tetap sama walau ukuran sepatu 44 ke atas (Bebas biaya tambahan Rp 5.000).
                  </label>
                </div>

                {!hasFlatPriceSizeLarge && (
                  <div className="pt-3 border-t border-slate-200/60 space-y-2">
                    <span className="font-semibold block text-slate-800 text-[11px] uppercase tracking-wide">Tarif Surcharge Size Besar Kustom Per Sepatu</span>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Secara default, surcharge size besar adalah Rp 5.000 (atau sesuai pengaturan global/produk). Anda dapat merubah tarif tambahan khusus pelanggan ini per jenis sepatu di bawah:
                    </p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                      <table className="min-w-full text-left border-collapse text-[10px]">
                        <thead className="bg-slate-55 border-b border-slate-150 font-bold text-slate-650 uppercase tracking-wider">
                          <tr>
                            <th className="py-2 px-3">Jenis Sepatu</th>
                            <th className="py-2 px-3 text-right">Nominal Surcharge</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {activeProducts.map((p) => {
                            const customSurcharge = customSizeSurcharges[p.name] !== undefined
                              ? customSizeSurcharges[p.name]
                              : '';
                            return (
                              <tr key={p.id} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{p.name}</td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="relative inline-block w-28 mr-2">
                                    <span className="absolute left-2 top-1.5 text-[9px] font-bold text-slate-450">Rp</span>
                                    <input
                                      type="number"
                                      placeholder="Ikut Default"
                                      value={customSurcharge}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setCustomSizeSurcharges(prev => {
                                          const updated = { ...prev };
                                          if (val === '') {
                                            delete updated[p.name];
                                          } else {
                                            updated[p.name] = Number(val);
                                          }
                                          return updated;
                                        });
                                      }}
                                      className="w-full pl-6 pr-2 py-1 text-right border border-slate-200 rounded text-[10px] font-mono focus:ring-1 focus:ring-indigo-500 bg-white"
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-3 border-t border-slate-200/60">
                  <span className="font-semibold block text-slate-800 text-sm">Sistem Tingkat Volume (Diskon Grosir)</span>
                  
                  {/* Mode Buttons */}
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'tanpa_volume', label: '1. Kunci Harga Normal (Tanpa Volume)', desc: 'Pelanggan dikunci pada harga dasar normal berapapun jumlah belinya.' },
                      { value: 'umum', label: '2. Aturan Umum Sepatu (Ikut Master)', desc: 'Mengikuti preset diskon volume luar standard masing-masing sepatu (>100 psg atau >300 psg).' },
                      { value: 'kustom', label: '3. Kustom Sendiri (Harga Per-Tingkat)', desc: 'Atur resep harga kustom khusus untuk pelanggan ini per model sepatu.' }
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition select-none ${
                          volumeMode === opt.value
                            ? 'bg-indigo-50/50 border-indigo-400 ring-1 ring-indigo-400/20 text-indigo-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="volumeMode"
                          value={opt.value}
                          checked={volumeMode === opt.value}
                          onChange={() => setVolumeMode(opt.value as any)}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 mt-1 cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="font-bold text-xs block text-slate-900 leading-tight mb-0.5">{opt.label}</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Form Tabel Dinamis Kustom */}
                  {volumeMode === 'kustom' && (
                    <div className="mt-2 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/60 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex flex-col gap-1">
                        <span className="block text-xs font-black text-amber-900 uppercase tracking-wider">
                          Tabel Tingkat Harga & Volume Kustom (Rp)
                        </span>
                        <p className="text-[10px] text-amber-800 leading-normal">
                          Admin dapat menentukan secara bebas batasan jumlah order (minimal pasang) sekaligus nominal harga istimewa per jenis sepatu untuk pelanggan ini.
                        </p>
                      </div>

                      {/* Info Contoh Riil Panduan */}
                      <div className="p-2.5 bg-amber-100/30 text-amber-900 border border-amber-200/50 rounded-lg text-[10px] leading-relaxed">
                        <span className="font-bold block mb-1">💡 Contoh Penggunaan Riil Perusahaan Anda:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="font-semibold text-amber-950">• PDH DOV (Aturan standard):</span>
                            <div className="pl-3 text-slate-650">
                              - Normal (&le; 100 pasang): <b>Rp 135.000</b><br />
                              - Grosir (&gt; 100 pasang): <b>Rp 132.500</b><br />
                              - Partai Besar (&gt; 350 pasang): <b>Rp 130.000</b>
                            </div>
                          </div>
                          <div>
                            <span className="font-semibold text-amber-950">• PDH MLDP (Aturan khusus):</span>
                            <div className="pl-3 text-slate-650">
                              - Normal (&le; 200 pasang): <b>Rp 152.500</b><br />
                              - Grosir (&gt; 200 pasang): <i>Kustom Bebas</i><br />
                              - Partai Besar (&gt; 250 pasang): <b>Rp 150.000</b>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="sm:hidden text-center text-[10px] text-amber-800 bg-amber-100/50 py-1 px-2 rounded-lg font-semibold select-none">
                        ← Geser tabel ke samping untuk mengubah harga grosir →
                      </div>
                      
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-3xs max-h-72 overflow-y-auto overflow-x-auto">
                        <table className="min-w-full text-left border-collapse text-[11px]">
                          <thead className="bg-slate-55 border-b border-slate-150 text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                            <tr>
                              <th className="py-2.5 px-3 font-extrabold min-w-[125px]">Jenis Sepatu</th>
                              <th className="py-2.5 px-2 text-center min-w-[145px] bg-slate-50/50">Tingkat 1 (Normal)</th>
                              <th className="py-2.5 px-2 text-center min-w-[155px] bg-indigo-50/20 text-indigo-900">Tingkat 2 (Grosir)</th>
                              <th className="py-2.5 px-2 text-center min-w-[155px] bg-emerald-50/20 text-emerald-900">Tingkat 3 (Partai)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-705">
                            {activeProducts.map((p) => {
                              const normalPrice = customPrices[p.name] !== undefined ? customPrices[p.name] : p.defaultPrice;
                              const t2Price = customTier2Prices[p.name] !== undefined ? customTier2Prices[p.name] : (p.priceTier2 !== undefined ? p.priceTier2 : p.defaultPrice - 2500);
                              const t3Price = customTier3Prices[p.name] !== undefined ? customTier3Prices[p.name] : (p.priceTier3 !== undefined ? p.priceTier3 : p.defaultPrice - 5000);
                              
                              const t2Limit = customTier2MinQty[p.name] !== undefined ? customTier2MinQty[p.name] : 100;
                              const t3Limit = customTier3MinQty[p.name] !== undefined ? customTier3MinQty[p.name] : 300;

                              return (
                                <tr key={p.id} className="hover:bg-slate-55 transition">
                                  {/* Nama Jenis Sepatu */}
                                  <td className="py-2.5 px-3 font-bold text-[11px] text-slate-800" title={p.name}>
                                    <span className="block font-bold text-slate-900 leading-tight">{p.name}</span>
                                    <span className="text-[9px] text-slate-450 font-normal">Std base: Rp {p.defaultPrice.toLocaleString('id-ID')}</span>
                                  </td>

                                  {/* Tingkat 1 (Normal)  */}
                                  <td className="py-2.5 px-2 text-center bg-slate-50/25">
                                    <div className="flex flex-col items-center gap-1">
                                      {/* Batasan Otomatis Tingkat 1 */}
                                      <span className="text-[9px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                        &le; {t2Limit} pasang
                                      </span>
                                      
                                      <div className="relative w-full max-w-[115px]">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">Rp</span>
                                        <input
                                          type="number"
                                          value={normalPrice}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            setCustomPrices(prev => ({ ...prev, [p.name]: val }));
                                            // Auto-adjust recommendations
                                            setCustomTier2Prices(prev => ({ ...prev, [p.name]: val - 2500 }));
                                            setCustomTier3Prices(prev => ({ ...prev, [p.name]: val - 5000 }));
                                          }}
                                          className="w-full pl-6 pr-1.5 py-1 text-right border border-slate-200 bg-white rounded-md text-[10px] font-mono focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  {/* Tingkat 2 (Grosir Menengah) */}
                                  <td className="py-2.5 px-2 text-center bg-indigo-50/10">
                                    <div className="flex flex-col items-center gap-1.5">
                                      {/* Batasan Volume */}
                                      <div className="flex items-center gap-0.5">
                                        <span className="text-[10px] font-bold text-indigo-700 select-none">&gt;</span>
                                        <input
                                          type="number"
                                          value={t2Limit}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            setCustomTier2MinQty(prev => ({ ...prev, [p.name]: val }));
                                          }}
                                          className="w-11 px-1 py-0.5 text-center border border-indigo-200 rounded text-[10px] text-indigo-800 bg-indigo-50/40 font-bold focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                                        />
                                        <span className="text-[9px] text-slate-500 font-normal">psg</span>
                                      </div>

                                      {/* Harga Kustom */}
                                      <div className="relative w-full max-w-[115px]">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-indigo-400">Rp</span>
                                        <input
                                          type="number"
                                          value={t2Price}
                                          onChange={(e) => setCustomTier2Prices(prev => ({ ...prev, [p.name]: Number(e.target.value) || 0 }))}
                                          className="w-full pl-6 pr-1.5 py-1 text-right border border-indigo-200 text-indigo-750 font-bold font-mono text-[10px] rounded-md focus:ring-1 focus:ring-indigo-550 bg-white"
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  {/* Tingkat 3 (Grosir Tinggi) */}
                                  <td className="py-2.5 px-2 text-center bg-emerald-50/10">
                                    <div className="flex flex-col items-center gap-1.5">
                                      {/* Batasan Volume */}
                                      <div className="flex items-center gap-0.5">
                                        <span className="text-[10px] font-bold text-emerald-700 select-none">&gt;</span>
                                        <input
                                          type="number"
                                          value={t3Limit}
                                          onChange={(e) => {
                                            const val = Number(e.target.value) || 0;
                                            setCustomTier3MinQty(prev => ({ ...prev, [p.name]: val }));
                                          }}
                                          className="w-11 px-1 py-0.5 text-center border border-emerald-250 rounded text-[10px] text-emerald-800 bg-emerald-55/40 font-bold focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                                        />
                                        <span className="text-[9px] text-slate-500 font-normal">psg</span>
                                      </div>

                                      {/* Harga Kustom */}
                                      <div className="relative w-full max-w-[115px]">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-400">Rp</span>
                                        <input
                                          type="number"
                                          value={t3Price}
                                          onChange={(e) => setCustomTier3Prices(prev => ({ ...prev, [p.name]: Number(e.target.value) || 0 }))}
                                          className="w-full pl-6 pr-1.5 py-1 text-right border border-emerald-250 text-emerald-755 font-bold font-mono text-[10px] rounded-md focus:ring-1 focus:ring-emerald-555 bg-white"
                                        />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor HP (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 0812345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Pelanggan (Opsional)
                </label>
                <textarea
                  placeholder="Alamat lengkap toko / pelanggan..."
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation or Linked Alert Modal */}
      {isDeleteModalOpen && customerToDelete && (() => {
        const isLinked = isCustomerLinked(customerToDelete.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
              {isLinked ? (
                // SCENARIO 1: Linked to existing invoices (Cannot delete)
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Tidak Dapat Menghapus</h3>
                      <p className="text-xs text-slate-500 font-medium">Pelanggan ini sedang digunakan dalam transaksi</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 text-xs">
                    <p className="font-medium text-slate-700 leading-relaxed">
                      Pelanggan <span className="font-bold text-indigo-750">"{customerToDelete.name}"</span> tidak dapat dihapus karena saat ini nama pelanggan ini tercatat di riwayat beberapa transaksi aktif pada Laporan Penjualan Anda.
                    </p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Silakan hapus atau ganti nama pelanggan pada faktur penjualan yang bersangkutan terlebih dahulu sebelum menghapus pelanggan ini dari database pelanggan guna menjaga integritas laporan buku transaksi Anda.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setCustomerToDelete(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition duration-150 cursor-pointer shadow-xs"
                    >
                      Batal &amp; Kembali
                    </button>
                  </div>
                </div>
              ) : (
                // SCENARIO 2: Safe to delete (Confirmation)
                <>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 text-red-650 rounded-xl flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Hapus Pelanggan?</h3>
                        <p className="text-xs text-slate-500 font-medium">Tindakan ini tidak bisa dibatalkan</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-450 font-semibold">Nama:</span>
                        <span className="font-bold text-slate-800">{customerToDelete.name}</span>
                      </div>
                      {customerToDelete.phone && (
                        <div className="flex justify-between">
                          <span className="text-slate-450 font-semibold">Nomor HP:</span>
                          <span className="font-mono text-slate-800">{customerToDelete.phone}</span>
                        </div>
                      )}

                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      Apakah Anda benar-benar yakin ingin menghapus pelanggan ini dari daftar? Seluruh custom preset harga dan info transaksi masa depan untuk toko/pelanggan ini akan ditiadakan.
                    </p>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setCustomerToDelete(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition duration-150 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 hover:shadow-xs transition duration-150 cursor-pointer"
                    >
                      Ya, Hapus Pelanggan
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
