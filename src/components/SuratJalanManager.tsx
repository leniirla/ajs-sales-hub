/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { SuratJalan, SystemSettings } from '../types';
import { CompanyLogo } from './Logo';
import { exportToPdf } from '../utils/pdfExport';
import { 
  Truck, 
  Search, 
  Printer, 
  Edit3, 
  Save, 
  ArrowLeft, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  FileText, 
  Check, 
  X,
  MapPin,
  Phone,
  RefreshCw
} from 'lucide-react';

interface SuratJalanManagerProps {
  suratJalans: SuratJalan[];
  onUpdateSuratJalan: (sj: SuratJalan) => void;
  onViewInvoice: (invoiceId: string) => void;
  hasActionAccess: (actionId: any) => boolean;
  selectedSjId?: string | null;
  onClearSelectedSjId?: () => void;
  settings?: SystemSettings;
}

export default function SuratJalanManager({
  suratJalans,
  onUpdateSuratJalan,
  onViewInvoice,
  hasActionAccess,
  selectedSjId,
  onClearSelectedSjId,
  settings
}: SuratJalanManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'kirim' | 'selesai'>('all');
  const [selectedSj, setSelectedSj] = useState<SuratJalan | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [status, setStatus] = useState<'draft' | 'kirim' | 'selesai'>('draft');
  const [notes, setNotes] = useState('');

  // Handle outside link jump
  React.useEffect(() => {
    if (selectedSjId) {
      const found = suratJalans.find(sj => sj.id === selectedSjId || sj.invoiceId === selectedSjId);
      if (found) {
        handleSelectSj(found);
      }
      if (onClearSelectedSjId) {
        onClearSelectedSjId();
      }
    }
  }, [selectedSjId, suratJalans]);

  const handleSelectSj = (sj: SuratJalan) => {
    setSelectedSj(sj);
    setDriverName(sj.driverName || '');
    setVehicleNumber(sj.vehicleNumber || '');
    setStatus(sj.status || 'draft');
    setNotes(sj.notes || '');
    setIsEditing(false);
  };

  const handleSaveDeliveryInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSj) return;

    const updated: SuratJalan = {
      ...selectedSj,
      driverName,
      vehicleNumber,
      status,
      notes
    };

    onUpdateSuratJalan(updated);
    setSelectedSj(updated);
    setIsEditing(false);
  };

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pdfFormat, setPdfFormat] = useState<'a4' | 'a5' | 'letter' | 'legal'>('a4');

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedSj) return;
    setShowPrintModal(true);
  };

  // Calculations helper
  const getTotalPairs = (sj: SuratJalan) => {
    return sj.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Filtering
  const filteredSjs = suratJalans.filter(sj => {
    const matchesSearch = 
      sj.suratJalanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sj.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sj.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sj.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {selectedSj ? (
        /* DETAIL VIEW OF SURAT JALAN */
        <div className="space-y-6">
          
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-xl shadow-xs print:hidden">
            <button
              onClick={() => setSelectedSj(null)}
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 font-medium transition self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Daftar Surat Jalan
            </button>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => onViewInvoice(selectedSj.invoiceId)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Lihat Faktur Terkait
              </button>

              {!isEditing && hasActionAccess('canManageSuratJalan') && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Detail Kirim
                </button>
              )}

              <button
                onClick={handlePrint}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Mengekspor PDF...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    Cetak Surat Jalan (PDF)
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Middle: Document Preview & Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Live Form for Delivery Details (If editing) */}
              {isEditing && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-fade-in print:hidden">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      Edit Informasi Pengiriman
                    </h3>
                    <button 
                      onClick={() => setIsEditing(false)} 
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSaveDeliveryInfo} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Nama Sopir / Pengirim</label>
                        <input
                          type="text"
                          placeholder="Contoh: Pak Supri / JNE"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Nomor Plat Kendaraan</label>
                        <input
                          type="text"
                          placeholder="Contoh: D 1234 ABC"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono font-semibold uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Status Pengiriman</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as any)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold"
                        >
                          <option value="draft">DRAFT (Disiapkan di Gudang)</option>
                          <option value="kirim">DALAM PERJALANAN (Dikirim)</option>
                          <option value="selesai">DITERIMA (Selesai)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Catatan Tambahan Surat Jalan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Titip di satpam depan kompleks"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-slate-250 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-750 text-xs font-bold rounded-lg transition inline-flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Simpan Perubahan
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Printable Area Card */}
              <div className="bg-white border border-slate-300 rounded-2xl shadow-xs overflow-hidden print:border-0 print:shadow-none">
                <div id="printable-sj" className="p-8 sm:p-12 space-y-8 text-slate-800 bg-white print:p-0 select-none">
                  
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-stretch gap-6 border-b-2 border-slate-200 pb-6">
                    <div className="space-y-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-amber-50 text-amber-800 border border-amber-100 uppercase print:hidden">
                        Surat Jalan Pengiriman
                      </span>
                      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none">SURAT JALAN</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-450 font-medium">Nomor Surat Jalan:</span>
                        <span className="font-mono text-sm text-amber-700 font-bold tracking-wide">{selectedSj.suratJalanNumber}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Tanggal Kirim: <b className="text-slate-700">{selectedSj.date}</b>
                      </div>
                      <div className="text-xs text-slate-500">
                        Faktur Terhubung: <span className="font-mono text-xs font-bold text-indigo-600">{selectedSj.invoiceNumber}</span>
                      </div>
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

                  {/* Consignee & Shipping Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-150 p-6 rounded-xl">
                    <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-6">
                      <span className="block text-[10px] uppercase tracking-wider font-extrabold text-amber-600">Alamat Pelanggan / Penerima</span>
                      <div className="font-extrabold text-slate-850 text-lg leading-snug">{selectedSj.customerName}</div>
                      
                      {selectedSj.customerPhone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-655">
                          <span className="font-medium text-slate-400">Telp:</span>
                          <span className="font-semibold text-slate-700">{selectedSj.customerPhone}</span>
                        </div>
                      )}
                      
                      {selectedSj.customerAddress ? (
                        <div className="text-xs text-slate-600 space-y-1">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Alamat Lengkap:</span>
                          <p className="leading-relaxed text-slate-705 bg-white p-2.5 rounded-lg border border-slate-150 shadow-2xs">
                            {selectedSj.customerAddress}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic block">Tanpa alamat pelanggan</span>
                      )}
                    </div>

                    <div className="space-y-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="block text-[10px] uppercase tracking-wider font-extrabold text-amber-600">Ekspedisi & Kurir</span>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[9px] font-bold uppercase">NAMA SOPIR/KURIR</span>
                            <span className="font-bold text-slate-800 block mt-1">
                              {selectedSj.driverName ? selectedSj.driverName : <span className="text-slate-400 italic font-medium">Belum diisi</span>}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] font-bold uppercase">PLAT KENDARAAN</span>
                            <span className="font-mono font-bold text-slate-850 block mt-1 uppercase">
                              {selectedSj.vehicleNumber ? selectedSj.vehicleNumber : <span className="text-slate-400 italic font-medium">-</span>}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] font-bold uppercase">STATUS JALUR</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase mt-1 ${
                              selectedSj.status === 'selesai' 
                                ? 'bg-emerald-100 text-emerald-850 border border-emerald-200' 
                                : selectedSj.status === 'kirim' 
                                  ? 'bg-blue-100 text-blue-850 border border-blue-200' 
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {selectedSj.status === 'selesai' ? 'Diterima Buyer' : selectedSj.status === 'kirim' ? 'Dalam Perjalanan' : 'Draft Gudang'}
                            </span>
                          </div>
                          {selectedSj.koliCount > 0 && (
                            <div>
                              <span className="text-slate-400 block text-[9px] font-bold uppercase">KOLI PACKING</span>
                              <span className="font-bold text-slate-800 block mt-1">
                                {selectedSj.koliCount} Koli
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedSj.notes && (
                        <div className="text-xs bg-amber-50/55 p-2.5 border border-amber-150/70 rounded-lg">
                          <span className="font-extrabold block text-amber-800 text-[10px] uppercase tracking-wider">Instruksi Pengiriman:</span>
                          <p className="text-amber-900 mt-0.5 italic">"{selectedSj.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>


                  {/* Items List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-left text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-350 bg-slate-100/50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider whitespace-nowrap">
                          <th className="py-3 px-4 w-7/12 rounded-l-lg">Model & Jenis Sepatu</th>
                          <th className="py-3 px-2 text-center w-2/12">Ukuran (Size)</th>
                          <th className="py-3 px-4 text-right w-3/12 rounded-r-lg">Kuantitas Kirim</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {selectedSj.items.map((item, idx) => (
                          <tr key={item.id || idx} className="text-slate-800 hover:bg-slate-50/40 transition">
                            <td className="py-3.5 px-4 font-bold text-slate-900">{item.productName}</td>
                            <td className="py-3.5 px-2 text-center">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs">
                                {item.size}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-slate-850">{item.quantity} pasang</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations totals */}
                  <div className="flex justify-between items-start pt-4 border-t border-slate-200">
                    <div className="text-[10px] text-slate-450 max-w-sm space-y-1">
                      {settings?.deliveryTerms && settings.deliveryTerms.length > 0 ? (
                        settings.deliveryTerms.map((term, i) => (
                          <p key={i}>• {term}</p>
                        ))
                      ) : (
                        <>
                          <p>• Periksa kecocokan fisik barang dengan Surat Jalan ini sebelum menandatangani.</p>
                          <p>• Komplain kekurangan barang harus dilampirkan bukti unboxing kiriman video.</p>
                        </>
                      )}
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs w-64 text-right">
                      <div className="flex justify-between font-medium text-slate-500">
                        <span>Jumlah Baris:</span>
                        <span className="font-bold text-slate-800">{selectedSj.items.length} Item</span>
                      </div>
                      <div className="flex justify-between font-medium text-slate-500 border-t border-slate-150 pt-1.5">
                        <span>Total Packing Koli:</span>
                        <span className="font-bold text-slate-850">{selectedSj.koliCount} Koli</span>
                      </div>
                      <div className="flex justify-between text-xs font-black border-t border-slate-200 pt-2 text-slate-850">
                        <span>TOTAL KUANTITAS:</span>
                        <span className="text-indigo-650 text-sm">{getTotalPairs(selectedSj)} Pasang</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures Field (Recipient, Driver, Sender Warehouse) */}
                  <div className="grid grid-cols-3 text-center text-xs text-slate-500 pt-14 gap-4 border-t border-slate-100">
                    <div className="space-y-12">
                      <p className="font-medium text-slate-450 uppercase tracking-wider text-[10px]">Penerima / Buyer,</p>
                      <div className="space-y-1">
                        <div className="w-32 mx-auto border-b border-dashed border-slate-300"></div>
                        <p className="font-semibold text-slate-805">({selectedSj.customerName})</p>
                      </div>
                    </div>
                    <div className="space-y-12">
                      <p className="font-medium text-slate-450 uppercase tracking-wider text-[10px]">Sopir / Kurir Pengirim,</p>
                      <div className="space-y-1">
                        <div className="w-32 mx-auto border-b border-dashed border-slate-300"></div>
                        <p className="font-semibold text-slate-805">
                          ({selectedSj.driverName ? selectedSj.driverName : '.......................'})
                        </p>
                      </div>
                    </div>
                    <div className="space-y-12">
                      <p className="font-medium text-slate-450 uppercase tracking-wider text-[10px]">Hormat Kami / Gudang,</p>
                      <div className="space-y-1">
                        <div className="w-32 mx-auto border-b border-dashed border-slate-300"></div>
                        <p className="font-semibold text-slate-805">(Petugas Gudang)</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Right Panel: Delivery Summary & Status Log */}
            <div className="space-y-6 print:hidden">
              
              {/* Delivery info summary card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Ringkasan Surat Jalan
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-450">Toko Pembeli</span>
                    <span className="font-bold text-slate-800">{selectedSj.customerName}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-450">Faktur Terhubung</span>
                    <span className="font-mono font-bold text-indigo-600">{selectedSj.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-450">Tanggal Input</span>
                    <span className="font-semibold text-slate-700">{selectedSj.date}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-450">Total Koli</span>
                    <span className="font-bold text-slate-800">{selectedSj.koliCount} Koli</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-450">Total Sepatu</span>
                    <span className="font-black text-indigo-700">{getTotalPairs(selectedSj)} Pasang</span>
                  </div>
                </div>

                {hasActionAccess('canManageSuratJalan') && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase mb-2">Pintas Status Cepat</span>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => {
                          const updated = { ...selectedSj, status: 'draft' as const };
                          onUpdateSuratJalan(updated);
                          setSelectedSj(updated);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                          selectedSj.status === 'draft'
                            ? 'bg-slate-100 text-slate-800 border border-slate-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          1. Draft Gudang
                        </span>
                        {selectedSj.status === 'draft' && <Check className="w-3.5 h-3.5 text-slate-600" />}
                      </button>

                      <button
                        onClick={() => {
                          const updated = { ...selectedSj, status: 'kirim' as const };
                          onUpdateSuratJalan(updated);
                          setSelectedSj(updated);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                          selectedSj.status === 'kirim'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                          2. Dikirim (Perjalanan)
                        </span>
                        {selectedSj.status === 'kirim' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>

                      <button
                        onClick={() => {
                          const updated = { ...selectedSj, status: 'selesai' as const };
                          onUpdateSuratJalan(updated);
                          setSelectedSj(updated);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                          selectedSj.status === 'selesai'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          3. Diterima (Selesai)
                        </span>
                        {selectedSj.status === 'selesai' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Courier assignment details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-500" />
                  Informasi Kurir Fisik
                </h3>
                <div className="space-y-3 text-xs leading-normal">
                  <div>
                    <span className="text-slate-400 block font-medium">SOPIR / KURIR AKTIF</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                      {selectedSj.driverName ? selectedSj.driverName : 'Belum Ditentukan'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">NOMOR PLAT KENDARAAN</span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                      {selectedSj.vehicleNumber ? selectedSj.vehicleNumber : '-'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-450 italic">
                    * Untuk mengubah data kurir pengirim, klik tombol <b>"Edit Detail Kirim"</b> di bagian atas halaman.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* GRID / LIST VIEW OF ALL SURAT JALAN */
        <div className="space-y-6">
          
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">KELOLA SURAT JALAN</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Surat Jalan (Delivery Order) otomatis terhubung dan diperbarui setiap kali Anda membuat/mengubah Faktur Penjualan.
              </p>
            </div>
          </div>

          {/* Filtering Bar */}
          <div className="flex flex-col md:flex-row gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Cari berdasarkan No Surat Jalan, No Faktur, atau Nama Toko..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium bg-slate-50/50"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua Status ({suratJalans.length})
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  statusFilter === 'draft'
                    ? 'bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Draft Gudang ({suratJalans.filter(s => s.status === 'draft').length})
              </button>
              <button
                onClick={() => setStatusFilter('kirim')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  statusFilter === 'kirim'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Dikirim ({suratJalans.filter(s => s.status === 'kirim').length})
              </button>
              <button
                onClick={() => setStatusFilter('selesai')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  statusFilter === 'selesai'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Diterima ({suratJalans.filter(s => s.status === 'selesai').length})
              </button>
            </div>
          </div>

          {/* Table Grid / List Card */}
          {filteredSjs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Surat Jalan Ditemukan</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Gunakan pencarian lain atau buat Faktur Penjualan baru terlebih dahulu untuk menghubungkan Surat Jalan secara otomatis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSjs.map((sj) => (
                <div
                  key={sj.id}
                  onClick={() => handleSelectSj(sj)}
                  className="bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: SJ ID and Status Badge */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-indigo-500 font-extrabold uppercase tracking-widest block leading-none">
                          No. Surat Jalan
                        </span>
                        <h4 className="font-mono font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition">
                          {sj.suratJalanNumber}
                        </h4>
                      </div>
                      
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                        sj.status === 'selesai'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : sj.status === 'kirim'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {sj.status === 'selesai' ? 'Diterima' : sj.status === 'kirim' ? 'Dikirim' : 'Draft'}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase leading-none">
                        Toko / Penerima
                      </span>
                      <p className="font-black text-slate-800 text-sm leading-normal">
                        {sj.customerName}
                      </p>
                      
                      {sj.customerAddress && (
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {sj.customerAddress}
                        </p>
                      )}
                    </div>

                    {/* Delivery Info */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] leading-snug">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase leading-none">SOPIR / KURIR</span>
                        <span className="font-semibold text-slate-700 block mt-0.5">
                          {sj.driverName ? sj.driverName : <span className="text-slate-400 italic font-medium">-</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase leading-none">PLAT KENDARAAN</span>
                        <span className="font-mono font-semibold text-slate-700 block mt-0.5 uppercase">
                          {sj.vehicleNumber ? sj.vehicleNumber : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Invoice reference & total shoe pairs */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span className="font-mono">
                      Inv: {sj.invoiceNumber}
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded border border-indigo-100">
                      {getTotalPairs(sj)} Pasang
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

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
                  if (!selectedSj) return;
                  setShowPrintModal(false);
                  setIsExporting(true);
                  const filename = `SuratJalan_${selectedSj.suratJalanNumber.replace(/\//g, '_')}.pdf`;
                  await exportToPdf('printable-sj', { 
                    forceSinglePage: true, 
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
