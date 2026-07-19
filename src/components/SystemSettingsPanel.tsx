/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SystemSettings, Product, AppUserPermissions } from '../types';
import { formatCurrency, showConfirm, showToast } from '../utils';
import { Sliders, Box, Percent, Scale, RefreshCw, CheckCircle, Info, Settings, Plus, Trash2, FileText, UploadCloud } from 'lucide-react';
import {
  hasLegacyLocalStorageData,
  importLegacyLocalStorageData,
  clearLegacyLocalStorageData,
} from '../api/importLegacy';

interface SystemSettingsPanelProps {
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => Promise<void>;
  onResetSettings: () => Promise<void>;
  hasActionAccess?: (actionId: keyof AppUserPermissions) => boolean;
}

export default function SystemSettingsPanel({
  settings,
  onSaveSettings,
  onResetSettings,
  hasActionAccess,
}: SystemSettingsPanelProps) {
  const canEdit = hasActionAccess ? hasActionAccess('canEditSettings') : true;
  const [minQtyTier2, setMinQtyTier2] = useState(settings.minQtyTier2);
  const [discountTier2, setDiscountTier2] = useState(settings.discountTier2);
  const [minQtyTier3, setMinQtyTier3] = useState(settings.minQtyTier3);
  const [discountTier3, setDiscountTier3] = useState(settings.discountTier3);
  const [sizeSurchargeLimit, setSizeSurchargeLimit] = useState(settings.sizeSurchargeLimit);
  const [sizeSurchargeAmount, setSizeSurchargeAmount] = useState(settings.sizeSurchargeAmount);
  const [ppnPercentage, setPpnPercentage] = useState(settings.ppnPercentage);
  const [enablePpn, setEnablePpn] = useState(settings.enablePpn);
  const [warehouseTerms, setWarehouseTerms] = useState<string[]>(
    settings.warehouseTerms || [
      "Barang yang sudah dibeli dengan invoice ini tidak dapat ditukar kecuali ada reject produksi dalam 7 hari.",
      "Pembayaran transfer resmi ditujukan ke Rek. Mandiri: 131-00-1122-3344 a.n PT Sentra Angkasa Jaya."
    ]
  );
  const [deliveryTerms, setDeliveryTerms] = useState<string[]>(
    settings.deliveryTerms || [
      "Periksa kecocokan fisik barang dengan Surat Jalan ini sebelum menandatangani.",
      "Komplain kekurangan barang harus dilampirkan bukti unboxing kiriman video."
    ]
  );

  const [companyName, setCompanyName] = useState(settings.companyName || 'ANGKASA JAYA SHOES');
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress || 'Jl. Angkasa Mekar I No.59, Cangkuang Kulon, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat 40239');
  const [companyPhone, setCompanyPhone] = useState(settings.companyPhone || 'Telp: (022) 540-39423 | WA: 0812-1122-3344');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(settings.companyLogoUrl || '');

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [hasLegacyData, setHasLegacyData] = useState(() => hasLegacyLocalStorageData());
  const [isImportingLegacy, setIsImportingLegacy] = useState(false);

  const handleImportLegacyData = () => {
    showConfirm(
      'Ini akan memindahkan seluruh data faktur, pelanggan, produk, dsb. yang tersimpan di browser ini ke database server. Lanjutkan?',
      () => {
        setIsImportingLegacy(true);
        importLegacyLocalStorageData()
          .then(() => {
            clearLegacyLocalStorageData();
            setHasLegacyData(false);
            showToast('Data lama berhasil dipindahkan ke database. Halaman akan dimuat ulang.', 'success');
            setTimeout(() => window.location.reload(), 1000);
          })
          .catch(() => showToast('Gagal memindahkan data lama ke database.', 'error'))
          .finally(() => setIsImportingLegacy(false));
      }
    );
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setCompanyLogoUrl('');
  };

  const handleTermChange = (index: number, value: string) => {
    const updated = [...warehouseTerms];
    updated[index] = value;
    setWarehouseTerms(updated);
  };

  const handleAddTerm = () => {
    setWarehouseTerms([...warehouseTerms, '']);
  };

  const handleRemoveTerm = (index: number) => {
    const updated = warehouseTerms.filter((_, i) => i !== index);
    setWarehouseTerms(updated);
  };

  const handleDeliveryTermChange = (index: number, val: string) => {
    const updated = [...deliveryTerms];
    updated[index] = val;
    setDeliveryTerms(updated);
  };

  const handleAddDeliveryTerm = () => {
    setDeliveryTerms([...deliveryTerms, '']);
  };

  const handleRemoveDeliveryTerm = (index: number) => {
    const updated = deliveryTerms.filter((_, i) => i !== index);
    setDeliveryTerms(updated);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    onSaveSettings({
      minQtyTier2: Number(minQtyTier2),
      discountTier2: Number(discountTier2),
      minQtyTier3: Number(minQtyTier3),
      discountTier3: Number(discountTier3),
      sizeSurchargeLimit: Number(sizeSurchargeLimit),
      sizeSurchargeAmount: Number(sizeSurchargeAmount),
      packingFeePerKoli: 20000,
      ppnPercentage: Number(ppnPercentage),
      enablePpn: enablePpn,
      warehouseTerms: warehouseTerms.filter((t) => t.trim() !== ''),
      deliveryTerms: deliveryTerms.filter((t) => t.trim() !== ''),
      companyName,
      companyAddress,
      companyPhone,
      companyLogoUrl,
    })
      .then(() => {
        setShowSuccessAlert(true);
        showToast('Seluruh pengaturan aturan berhasil disimpan!', 'success');
        setTimeout(() => {
          setShowSuccessAlert(false);
        }, 3000);
      })
      .catch((err) => {
        showToast(err?.message || 'Gagal menyimpan pengaturan ke server. Periksa koneksi/sesi login Anda dan coba lagi.', 'error');
      })
      .finally(() => setIsSaving(false));
  };

  const handleReset = () => {
    showConfirm(
      'Apakah Anda yakin ingin mengembalikan seluruh konfigurasi aturan harga ke default bawaan pabrik? Tabungan kustomisasi Anda saat ini akan diatur ulang.',
      () => {
        onResetSettings()
          .then(() => {
            showToast('Konfigurasi berhasil diatur ulang ke default bawaan pabrik!', 'success');
            setTimeout(() => {
              window.location.reload(); // Reload to easily re-propagate state
            }, 800);
          })
          .catch((err) => {
            showToast(err?.message || 'Gagal mereset pengaturan ke server. Periksa koneksi/sesi login Anda dan coba lagi.', 'error');
          });
      }
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-705 shrink-0">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Pengaturan Aturan Kalkulasi Sistem</h2>
              <p className="text-xs text-slate-500 mt-1">Konfigurasikan tarif surcharge ukuran, batasan diskon grosir, biaya kargo, dan pajak PPN secara global.</p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={!canEdit}
            className={`px-4 py-2 font-bold rounded-lg text-xs md:text-sm flex items-center justify-center gap-1.5 transition ${
              canEdit 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 cursor-pointer' 
                : 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Kembalikan Default
          </button>
        </div>

        {showSuccessAlert && (
          <div className="mt-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Konfigurasi berhasil disimpan!</span> Aturan kalkulasi terkini akan langsung diterapkan pada pembuatan faktur mendatang dan perhitungan profit dinamis.
          </div>
        )}
      </div>

      {hasLegacyData && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-amber-900 tracking-tight">Data Lama Ditemukan di Browser Ini</h2>
              <p className="text-xs text-amber-800/90 mt-1">
                Aplikasi mendeteksi data faktur/pelanggan/dll. yang masih tersimpan di penyimpanan lokal browser ini (dari sebelum aplikasi menggunakan database). Pindahkan sekarang agar data tersebut ikut tersimpan di database server dan tidak hilang.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleImportLegacyData}
            disabled={isImportingLegacy}
            className="px-4 py-2 font-bold rounded-lg text-xs md:text-sm flex items-center justify-center gap-1.5 transition bg-amber-600 hover:bg-amber-700 text-white cursor-pointer disabled:opacity-60 shrink-0"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            {isImportingLegacy ? 'Memindahkan...' : 'Pindahkan Data Lama'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={!canEdit} className="space-y-6 border-0 p-0 m-0 min-w-0">
        
        {/* 0. Identitas & Logo Perusahaan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Identitas & Logo Perusahaan (Kop Surat)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Upload Box */}
            <div className="space-y-2 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <span className="block text-xs font-bold text-slate-750 self-start">Logo Perusahaan</span>
              <div className="relative w-28 h-28 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden mt-2">
                {companyLogoUrl ? (
                  <img src={companyLogoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="text-slate-300 font-bold text-[10px] text-center p-2 flex flex-col items-center gap-1">
                    <div className="scale-75 origin-center opacity-65">
                      <svg width="48" height="48" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="100" cy="100" r="48" fill="#a1a1aa" />
                        <text x="72" y="112" fill="#0f172a" fontSize="34" fontWeight="bold" fontFamily="Times New Roman, Georgia, serif" textAnchor="middle">A</text>
                        <text x="134" y="112" fill="#0f172a" fontSize="34" fontWeight="bold" fontFamily="Times New Roman, Georgia, serif" textAnchor="middle">S</text>
                      </svg>
                    </div>
                    <span className="text-slate-400 font-semibold block">Logo Default</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 w-full mt-2 justify-center">
                <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-lg text-[10px] cursor-pointer tracking-wide transition border border-indigo-200 text-center flex-1">
                  Pilih Gambar
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
                {companyLogoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-lg text-[10px] cursor-pointer tracking-wide transition border border-rose-250 flex-1 border-none"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Inputs block */}
            <div className="md:col-span-2 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Nama Perusahaan / Brand *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-255 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Nomor Kontak / Telepon *</label>
                  <input
                    type="text"
                    required
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-255 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Alamat Perusahaan *</label>
                  <textarea
                    required
                    rows={2}
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-255 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 resize-none leading-relaxed font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. Aturan Diskon Volume (Tier Grosir) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Aturan Grosir & Partai (Umum)</h3>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat 2 (Grosir)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min. Kuantitas (Pasang)</label>
                  <input
                    type="number"
                    min="1"
                    value={minQtyTier2}
                    onChange={(e) => setMinQtyTier2(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default: 100 pasang</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Potongan Harga per Pasang</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={discountTier2}
                      onChange={(e) => setDiscountTier2(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default: Rp 2.500</span>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-2" />

              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat 3 (Partai)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min. Kuantitas (Pasang)</label>
                  <input
                    type="number"
                    min="1"
                    value={minQtyTier3}
                    onChange={(e) => setMinQtyTier3(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default: 300 pasang</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Potongan Harga per Pasang</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={discountTier3}
                      onChange={(e) => setDiscountTier3(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default: Rp 5.000</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Surcharge Ukuran & Packing Koli */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-5">
            
            {/* Surcharge size */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Scale className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Biaya Tambahan Ukuran Besar</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dimulai dari Ukuran (Size)</label>
                  <input
                    type="number"
                    min="20"
                    max="60"
                    value={sizeSurchargeLimit}
                    onChange={(e) => setSizeSurchargeLimit(Math.max(20, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Surcharge aktif jika size ≥ nilai ini (Default: 44)</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tambahan Biaya (Surcharge)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={sizeSurchargeAmount}
                      onChange={(e) => setSizeSurchargeAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-450 mt-0.5 block">Tarif per pasang (Default: Rp 5.000)</span>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Pajak Faktur (PPN) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Percent className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Perpajakan Faktur (PPN)</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-slate-800 block">Aktifkan Perhitungan PPN Otomatis</span>
                <p className="text-xs text-slate-500">Jika diaktifkan, PPN akan otomatis ditambahkan ke total faktur setelah subtotal dan biaya packing koli.</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enablePpn"
                  checked={enablePpn}
                  onChange={(e) => setEnablePpn(e.target.checked)}
                  className="w-4 flex-shrink-0 h-4 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500 h-5 w-5 cursor-pointer"
                />
                <label htmlFor="enablePpn" className="ml-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  {enablePpn ? 'PPN Aktif' : 'PPN Nonaktif'}
                </label>
              </div>
            </div>

            {enablePpn && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tarif Pajak PPN (Persentase %)</label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={ppnPercentage}
                      onChange={(e) => setPpnPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-full pr-8 pl-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-bold text-amber-900"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Standard tarif PPN Indonesia (contoh: 11%)</span>
                </div>
                
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Catatan:</strong> Rumus PPN adalah: <code>(Subtotal + Biaya Packing) × ({ppnPercentage}%)</code>. Nilai ini akan disimpan dan dapat dicetak langsung pada kertas faktur maupun lembaran laporan Excel.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 4. Syarat & Ketentuan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4 md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Syarat & Ketentuan</h3>
              </div>
              <button
                type="button"
                onClick={handleAddTerm}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Syarat
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Syarat dan ketentuan ini akan tercetak otomatis pada bagian bawah lembar Faktur / Invoice Penjualan.
            </p>

            <div className="space-y-3">
              {warehouseTerms.map((term, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 font-mono w-5 text-right">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => handleTermChange(index, e.target.value)}
                    placeholder="Masukkan butir syarat dan ketentuan..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTerm(index)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Hapus Syarat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {warehouseTerms.length === 0 && (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium">Belum ada syarat & ketentuan yang ditambahkan. Faktur akan tercetak tanpa bagian syarat.</p>
                  <button
                    type="button"
                    onClick={handleAddTerm}
                    className="mt-2 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1 mx-auto transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 5. Catatan / Syarat Surat Jalan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4 md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Syarat & Ketentuan Surat Jalan</h3>
              </div>
              <button
                type="button"
                onClick={handleAddDeliveryTerm}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Syarat
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Syarat dan ketentuan ini akan tercetak otomatis pada bagian bawah lembar Surat Jalan.
            </p>

            <div className="space-y-3">
              {deliveryTerms.map((term, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 font-mono w-5 text-right">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => handleDeliveryTermChange(index, e.target.value)}
                    placeholder="Masukkan butir syarat dan ketentuan Surat Jalan..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliveryTerm(index)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Hapus Syarat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {deliveryTerms.length === 0 && (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium">Belum ada syarat & ketentuan yang ditambahkan. Surat Jalan akan tercetak tanpa bagian syarat.</p>
                  <button
                    type="button"
                    onClick={handleAddDeliveryTerm}
                    className="mt-2 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg text-xs flex items-center gap-1 mx-auto transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        </fieldset>

        {/* Action button */}
        {canEdit ? (
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <CheckCircle className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Seluruh Pengaturan Aturan'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-100 rounded-2xl w-full text-center">
            <span className="text-xs text-amber-800 font-extrabold">Anda tidak memiliki hak akses untuk mengubah pengaturan sistem ini (Hanya Lihat).</span>
          </div>
        )}
      </form>

    </div>
  );
}
