/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Invoice, AppUserPermissions } from '../types';
import { formatCurrency, showToast } from '../utils';
import { Plus, Edit2, Search, Trash2, Tag, Percent, ClipboardList, Sparkles, X, Milestone, Check, AlertTriangle, ShieldAlert, Scale } from 'lucide-react';

interface ShoeMasterManagerProps {
  products: Product[];
  invoices: Invoice[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  hasActionAccess?: (actionId: keyof AppUserPermissions) => boolean;
}

export default function ShoeMasterManager({
  products,
  invoices = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  hasActionAccess = () => true,
}: ShoeMasterManagerProps) {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState(135000);
  const [priceTier2, setPriceTier2] = useState(132500);
  const [priceTier3, setPriceTier3] = useState(130000);
  const [customSurchargeLimit, setCustomSurchargeLimit] = useState<number | ''>('');
  const [customSurchargeAmount, setCustomSurchargeAmount] = useState<number | ''>('');
  const [customSurcharges, setCustomSurcharges] = useState<{ size: number; amount: number }[]>([]);
  const [newSurchargeSize, setNewSurchargeSize] = useState<number | ''>('');
  const [newSurchargeAmount, setNewSurchargeAmount] = useState<number | ''>('');

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setDefaultPrice(135000);
    setPriceTier2(132500);
    setPriceTier3(130000);
    setCustomSurchargeLimit('');
    setCustomSurchargeAmount('');
    setCustomSurcharges([]);
    setNewSurchargeSize('');
    setNewSurchargeAmount('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDefaultPrice(product.defaultPrice);
    setPriceTier2(product.priceTier2 !== undefined ? product.priceTier2 : product.defaultPrice - 2500);
    setPriceTier3(product.priceTier3 !== undefined ? product.priceTier3 : product.defaultPrice - 5000);
    setCustomSurchargeLimit(product.customSurchargeLimit !== undefined ? product.customSurchargeLimit : '');
    setCustomSurchargeAmount(product.customSurchargeAmount !== undefined ? product.customSurchargeAmount : '');
    setCustomSurcharges(product.customSurcharges || []);
    setNewSurchargeSize('');
    setNewSurchargeAmount('');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasActionAccess('canManageMasterData')) {
      showToast("Akses Dibatasi: Anda tidak memiliki izin untuk mengelola master data.", "error");
      return;
    }
    if (!name.trim()) return;

    const productData: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: name.trim(),
      defaultPrice: Number(defaultPrice) || 135000,
      priceTier2: Number(priceTier2),
      priceTier3: Number(priceTier3),
      customSurchargeLimit: customSurchargeLimit !== '' ? Number(customSurchargeLimit) : undefined,
      customSurchargeAmount: customSurchargeAmount !== '' ? Number(customSurchargeAmount) : undefined,
      customSurcharges: customSurcharges.length > 0 ? customSurcharges : undefined,
    };

    if (editingProduct) {
      onUpdateProduct(productData);
      showToast("Varian sepatu berhasil diperbarui!", "success");
    } else {
      onAddProduct(productData);
      showToast("Varian sepatu berhasil ditambahkan!", "success");
    }

    setIsFormOpen(false);
    setName('');
    setDefaultPrice(135000);
    setPriceTier2(132500);
    setPriceTier3(130000);
    setCustomSurchargeLimit('');
    setCustomSurchargeAmount('');
    setCustomSurcharges([]);
    setNewSurchargeSize('');
    setNewSurchargeAmount('');
    setEditingProduct(null);
  };

  const isProductLinked = (productName: string) => {
    return invoices.some((inv) =>
      inv.items.some((item) => item.productName === productName)
    );
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!hasActionAccess('canManageMasterData')) {
      showToast("Akses Dibatasi: Anda tidak memiliki izin untuk mengelola master data.", "error");
      return;
    }
    if (productToDelete) {
      onDeleteProduct(productToDelete.id);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      showToast("Varian sepatu berhasil dihapus!", "success");
    }
  };

  // Helper stats
  const totalProducts = products.length;
  const avgPrice = totalProducts > 0 
    ? Math.round(products.reduce((sum, p) => sum + p.defaultPrice, 0) / totalProducts)
    : 0;
  const maxProduct = products.length > 0 
    ? [...products].sort((a,b) => b.defaultPrice - a.defaultPrice)[0]
    : null;

  return (
    <div id="shoe-master-control-screen" className="space-y-6">
      
      {/* Top Banner Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Varian Sepatu</span>
            <span className="text-xl font-extrabold text-slate-950">{totalProducts} Jenis</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Rata-rata Harga Dasar</span>
            <span className="text-xl font-extrabold text-slate-950">{formatCurrency(avgPrice)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Harga Tertinggi</span>
            <span className="text-sm font-bold text-slate-950 truncate block">
              {maxProduct ? `${maxProduct.name} (${formatCurrency(maxProduct.defaultPrice)})` : '-'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Side: Product List Table/Cards */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Database Master Model Sepatu</h2>
              <p className="text-xs text-slate-500 mt-1">Kelola daftar varian sepatu beserta tarif dasar standard Angkasa Jaya Shoes.</p>
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
                  type="button"
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold leading-none inline-flex items-center gap-1.5 transition shadow-xs ${
                    canManage
                      ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-85'
                  }`}
                  title={canManage ? 'Tambah Sepatu Baru' : 'Akses Dibatasi: Anda tidak memiliki izin mengelola master data'}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {canManage ? 'Tambah Sepatu Baru' : 'Akses Terbatas'}
                </button>
              );
            })()}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari model atau nama sepatu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Product Items List Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
              <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-medium text-sm">Tidak ada sepatu yang cocok</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Coba sesuaikan kata kunci pencarian Anda atau tambahkan master sepatu baru.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-150 divide-y divide-slate-100 bg-white">
              <table className="w-full min-w-[650px] text-left border-collapse">
                <thead className="bg-slate-50/75 border-b border-slate-150 text-[10px] font-bold text-slate-450 uppercase tracking-widest">
                  <tr>
                    <th className="py-3 px-4">Nama Sepatu / Model</th>
                    <th className="py-3 px-4 text-right">Harga Dasar Standard</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-mono">{p.id}</span>
                          <span className="text-[10px] text-indigo-700 bg-indigo-50/85 px-1.5 py-0.5 rounded-sm font-medium border border-indigo-100/30">
                            Volume &gt;100: {formatCurrency(p.priceTier2 !== undefined ? p.priceTier2 : p.defaultPrice - 2500)}
                          </span>
                          <span className="text-[10px] text-teal-700 bg-teal-50/85 px-1.5 py-0.5 rounded-sm font-medium border border-teal-100/30">
                            Volume &gt;300: {formatCurrency(p.priceTier3 !== undefined ? p.priceTier3 : p.defaultPrice - 5000)}
                          </span>
                          {p.customSurcharges && p.customSurcharges.length > 0 ? (
                            p.customSurcharges.map((rule, rIdx) => (
                              <span key={rIdx} className="text-[10px] text-amber-700 bg-amber-50/85 px-1.5 py-0.5 rounded-sm font-medium border border-amber-100/30 flex items-center gap-0.5">
                                <Scale className="w-2.5 h-2.5" />
                                Size &gt;={rule.size}: +{formatCurrency(rule.amount)}
                              </span>
                            ))
                          ) : (
                            p.customSurchargeLimit && p.customSurchargeLimit > 0 && (
                              <span className="text-[10px] text-amber-700 bg-amber-50/85 px-1.5 py-0.5 rounded-sm font-medium border border-amber-100/30 flex items-center gap-0.5">
                                <Scale className="w-2.5 h-2.5" />
                                Size &gt;={p.customSurchargeLimit}: +{formatCurrency(p.customSurchargeAmount ?? 0)}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(p.defaultPrice)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center items-center gap-1.5">
                          {(() => {
                            const canManage = hasActionAccess('canManageMasterData');
                            return (
                              <>
                                <button
                                  disabled={!canManage}
                                  onClick={() => {
                                    if (canManage) {
                                      handleOpenEdit(p);
                                    }
                                  }}
                                  type="button"
                                  className={`p-1.5 rounded-md transition ${
                                    canManage
                                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-indigo-600 cursor-pointer'
                                      : 'text-slate-200 bg-slate-50 cursor-not-allowed'
                                  }`}
                                  title={canManage ? 'Edit Sepatu' : 'Akses Dibatasi: Anda tidak memiliki izin mengelola master data'}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={!canManage}
                                  onClick={() => {
                                    if (canManage) {
                                      handleDeleteClick(p);
                                    }
                                  }}
                                  type="button"
                                  className={`p-1.5 rounded-md transition duration-150 ${
                                    canManage
                                      ? 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 cursor-pointer'
                                      : 'text-slate-200 bg-slate-50 cursor-not-allowed'
                                  }`}
                                  title={canManage ? 'Hapus Sepatu' : 'Akses Dibatasi: Anda tidak memiliki izin mengelola master data'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Right Side Pane: Add / Edit Form Card */}
        {isFormOpen && (
          <div className="w-full md:w-80 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-fit space-y-4 animate-fade-in/10">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? 'Update Master Sepatu' : 'Tambah Master Sepatu'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sepatu / Model *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Slip-on Canvas Classic Ultra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Dasar (&lt; 100 pasang) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="135000"
                    value={defaultPrice || ''}
                    onChange={(e) => {
                      const newPrice = Number(e.target.value);
                      setDefaultPrice(newPrice);
                      // Update default suggestions for tiers if adding new
                      if (!editingProduct) {
                        setPriceTier2(newPrice - 2500);
                        setPriceTier3(newPrice - 5000);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-extrabold"
                  />
                </div>
                <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">
                  Harga standar untuk pembelian normal di bawah 100 pasang.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-700 mb-1">Harga Volume &gt; 100 psg *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="132500"
                    value={priceTier2 || ''}
                    onChange={(e) => setPriceTier2(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-bold text-indigo-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-teal-700 mb-1">Harga Volume &gt; 300 psg *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="130000"
                    value={priceTier3 || ''}
                    onChange={(e) => setPriceTier3(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 border border-teal-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition font-bold text-teal-900"
                  />
                </div>
              </div>

              {/* Custom Surcharges Size List Builder */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3 col-span-1 md:col-span-1">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-indigo-500" />
                  Aturan Surcharge Size Kustom (Multi-Aturan)
                </h4>
                <p className="text-[10px] text-slate-450 leading-relaxed">
                  Tentukan biaya tambahan khusus per rentang ukuran untuk jenis sepatu ini. Aturan di bawah ini akan memprioritaskan biaya yang lebih tinggi untuk ukuran yang memenuhi kriteria.
                </p>

                {/* Rules List */}
                {customSurcharges.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {customSurcharges.map((rule, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-slate-150 rounded-lg p-2 text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1">
                          <span className="text-indigo-600">Ukuran &gt;= {rule.size}</span>:
                          <span className="text-slate-900">+{formatCurrency(rule.amount)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomSurcharges(customSurcharges.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          title="Hapus Aturan"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Rule Input Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Mulai Ukuran</label>
                    <input
                      type="number"
                      placeholder="Contoh: 44"
                      value={newSurchargeSize}
                      onChange={(e) => setNewSurchargeSize(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Tambahan Biaya</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
                      <input
                        type="number"
                        placeholder="Contoh: 10000"
                        value={newSurchargeAmount}
                        onChange={(e) => setNewSurchargeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (newSurchargeSize === '' || newSurchargeAmount === '') {
                      showToast("Harap isi mulai ukuran dan tambahan biaya!", "error");
                      return;
                    }
                    const sizeNum = Number(newSurchargeSize);
                    const amtNum = Number(newSurchargeAmount);
                    
                    if (customSurcharges.some(r => r.size === sizeNum)) {
                      showToast(`Aturan untuk ukuran >= ${sizeNum} sudah ada!`, "error");
                      return;
                    }

                    const updated = [...customSurcharges, { size: sizeNum, amount: amtNum }].sort((a, b) => a.size - b.size);
                    setCustomSurcharges(updated);
                    setNewSurchargeSize('');
                    setNewSurchargeAmount('');
                  }}
                  className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1 border border-indigo-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Aturan Ukuran
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition duration-150 cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition duration-150 cursor-pointer shadow-2xs text-center"
                >
                  {editingProduct ? 'Simpan Edit' : 'Simpan Baru'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Delete Confirmation or Custom Dependency Warning Modal */}
      {isDeleteModalOpen && productToDelete && (() => {
        const isLinked = isProductLinked(productToDelete.name);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-fade-in/10">
              {isLinked ? (
                // SCENARIO 1: Linked to existing invoices (Cannot delete)
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-normal">Tidak Dapat Menghapus</h3>
                      <p className="text-xs text-slate-450 font-medium">Sepatu ini sedang digunakan dalam transaksi</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2.5 text-xs">
                    <p className="font-medium text-slate-700 leading-relaxed">
                      Model <span className="font-bold text-indigo-700">"{productToDelete.name}"</span> tidak dapat dihapus karena saat ini nama produk ini tercatat di riwayat beberapa transaksi faktur aktif pada Laporan Penjualan Anda.
                    </p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Silakan hapus atau ganti item sepatu tersebut di faktur penjualan yang bersangkutan terlebih dahulu sebelum menghapus jenis ini dari database master sepatu guna menjaga integritas laporan buku transaksi Anda.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setProductToDelete(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition duration-150 cursor-pointer shadow-2xs"
                    >
                      Batal &amp; Kembali
                    </button>
                  </div>
                </div>
              ) : (
                // SCENARIO 2: Safe to delete
                <>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 text-red-655 rounded-xl flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-normal">Hapus Model Sepatu?</h3>
                        <p className="text-xs text-slate-455 font-medium">Tindakan ini tidak bisa dibatalkan</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-450 font-semibold">Nama Model:</span>
                        <span className="font-bold text-slate-800">{productToDelete.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-455 font-semibold">Harga Dasar Standard:</span>
                        <span className="font-bold text-amber-600 font-mono">{formatCurrency(productToDelete.defaultPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450 font-semibold">ID Sepatu:</span>
                        <span className="font-mono text-[10px] text-slate-400">{productToDelete.id}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      Apakah Anda benar-benar yakin ingin menghapus model sepatu ini dari daftar master? Seluruh preset harga default dan referensi dasar akan ditiadakan.
                    </p>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setProductToDelete(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition duration-150 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-750 hover:shadow-xs transition duration-150 cursor-pointer"
                    >
                      Ya, Hapus Model Sepatu
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
