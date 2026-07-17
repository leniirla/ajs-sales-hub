/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { ProductReturn, SystemSettings } from '../types';
import { formatCurrency, exportToExcel } from '../utils';
import { Printer, Download, ArrowLeft, Check, AlertCircle, FileText, Calendar, User, FileSpreadsheet, RefreshCw } from 'lucide-react';

interface ReturnViewerProps {
  returnItem: ProductReturn;
  onBack: () => void;
  onPrint: () => void;
  isPrinting?: boolean;
  settings?: SystemSettings;
}

export default function ReturnViewer({ returnItem, onBack, onPrint, isPrinting = false, settings }: ReturnViewerProps) {
  const returnRef = useRef<HTMLDivElement>(null);

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    onPrint();
  };

  const handleExportSingleExcel = () => {
    const sheetData = returnItem.items.map((item, index) => ({
      'No': index + 1,
      'Nama Sepatu': item.productName,
      'Ukuran/Size': item.size,
      'Kuantitas Retur (Pasang)': item.returnedQuantity,
      'Kuantitas Faktur Asli': item.originalQuantity,
      'Harga Unit Refund': item.unitRefundPrice,
      'Alasan Retur': item.reason === 'rusak_defect' ? 'Rusak / Defect' : 
                      item.reason === 'salah_ukuran' ? 'Salah Ukuran' :
                      item.reason === 'salah_model' ? 'Salah Model' :
                      item.reason === 'kelebihan_kirim' ? 'Kelebihan Kirim' : 'Lainnya',
      'Detail Alasan (Custom)': item.customReasonText || '',
      'Total Refund Item': item.totalRefundValue,
    }));

    const docName = `Nota_Retur_${returnItem.returnNumber.replace(/\//g, '_')}`;
    exportToExcel(docName, [
      { name: 'Detail Retur', data: sheetData },
      {
        name: 'Ringkasan Retur',
        data: [
          { 'Metrik': 'Nomor Retur', 'Detail': returnItem.returnNumber },
          { 'Metrik': 'Pelanggan', 'Detail': returnItem.customerName },
          { 'Metrik': 'No. Faktur Rujukan', 'Detail': returnItem.invoiceNumber },
          { 'Metrik': 'Tanggal Retur', 'Detail': returnItem.date },
          { 'Metrik': 'Metode Refund', 'Detail': returnItem.refundType === 'potong_tagihan' ? 'Potong Sisa Piutang Faktur' : 'Dana Tunai / Kredit' },
          { 'Metrik': 'Total Pasang Diretur', 'Detail': returnItem.items.reduce((sum, item) => sum + item.returnedQuantity, 0) },
          { 'Metrik': 'Total Pengembalian Dana (Rp)', 'Detail': returnItem.totalRefundAmount },
          { 'Metrik': 'Keterangan Kronologi', 'Detail': returnItem.notes || '-' },
        ]
      }
    ]);
  };

  const totalReturnedPairs = returnItem.items.reduce((sum, item) => sum + item.returnedQuantity, 0);

  return (
    <div id="return-viewer-workspace" className="space-y-6 animate-fade-in">
      
      {/* 1. Action Controller Header (Hidden from printer) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs text-slate-605 hover:text-indigo-600 font-bold transition self-start cursor-pointer px-1 py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Retur
        </button>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportSingleExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700/90 rounded-xl text-xs font-bold transition cursor-pointer border border-transparent"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Excel
          </button>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
          >
            {isPrinting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Mengekspor PDF...
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5" />
                Cetak Nota Retur (PDF)
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Beautiful Document Display Area */}
      <div className="bg-white border border-slate-250 rounded-2xl max-w-4xl mx-auto shadow-sm overflow-hidden print:border-0 print:shadow-none">
        
        <div ref={returnRef} className="p-8 sm:p-12 space-y-8 text-slate-800 bg-white">
          
          {/* Note Banner / Header */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch gap-6 border-b-2 border-slate-200 pb-6">
            <div className="space-y-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider bg-rose-50 text-rose-700 uppercase border border-rose-100">
                Resi Nota Retur Resmi
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-none">NOTA RETUR BARANG</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-450 font-semibold uppercase tracking-wide">No. Retur:</span>
                <span className="font-mono text-sm text-indigo-900 font-black tracking-wide bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-lg">{returnItem.returnNumber}</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Tanggal Retur: <b className="text-slate-700 font-bold font-mono">{returnItem.date}</b>
              </div>
            </div>

            <div className="flex items-start sm:items-end justify-between sm:justify-start gap-4">
              <div className="text-left sm:text-right space-y-1">
                <div className="font-extrabold text-base sm:text-lg text-slate-950 tracking-tight leading-tight">
                  ANGKASA JAYA SHOES
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Divisi Retur Barang
                </p>
                <p className="text-[11px] text-slate-450 font-medium font-sans max-w-xs leading-normal">
                  Penerimaan & Rekonsiliasi Mutu Barang Dagang
                </p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-rose-50 border border-rose-150 shadow-2xs shrink-0">
                <FileText className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Grid Layout meta-data of Return */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-5 rounded-xl">
            <div className="space-y-2 md:border-r border-slate-200 md:pr-4">
              <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Pihak Pengirim (Konsumen)</span>
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-black text-slate-900 text-sm leading-snug">{returnItem.customerName}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                ID Pelanggan: <strong className="font-mono text-slate-700">{returnItem.customerId || 'CUST-REG'}</strong>
              </p>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-500 font-bold uppercase mt-1">
                Status Mitra: Terdaftar Aktif
              </div>
            </div>

            <div className="space-y-2 md:pl-2 flex flex-col justify-between">
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Faktur Rujukan Terkait</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xs text-slate-450 font-medium">Faktur Original:</span>
                  <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">{returnItem.invoiceNumber}</span>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-150/80">
                <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400">Metode Pengembalian Dana</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase mt-1 ${
                  returnItem.refundType === 'potong_tagihan'
                    ? 'bg-rose-50 text-rose-700 border border-rose-150'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                }`}>
                  {returnItem.refundType === 'potong_tagihan' ? 'POTONG SISA PIUTANG FAKTUR' : 'DANA TUNAI / CREDIT MANUAL'}
                </span>
              </div>
            </div>
          </div>

          {/* List of returned items */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rincian Komoditas & Volume Retur</h4>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3">Grup Produk Sepatu</th>
                    <th className="py-2.5 px-3 text-center w-16">Size</th>
                    <th className="py-2.5 px-3 text-center w-28">Kuantitas Nota</th>
                    <th className="py-2.5 px-3 text-center w-28">Volume Retur</th>
                    <th className="py-2.5 px-3 text-right w-28">Harga Refund</th>
                    <th className="py-2.5 px-3">Alasan Kerusakan</th>
                    <th className="py-2.5 px-3 text-right w-32">Total Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white text-xs">
                  {returnItem.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/20 transition">
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-850">
                        {item.productName}
                      </td>
                      <td className="py-3 px-3 text-center font-bold font-mono text-slate-800">
                        {item.size}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                        {item.originalQuantity} psg
                      </td>
                      <td className="py-3 px-3 text-center font-bold font-mono text-slate-905">
                        {item.returnedQuantity} psg
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-650">
                        {formatCurrency(item.unitRefundPrice)}
                      </td>
                      <td className="py-3 px-3 font-medium capitalize text-[11px] text-slate-600">
                        {item.reason === 'rusak_defect' ? (
                          <span className="text-amber-700 font-bold">⚠️ Rusak / Defect</span>
                        ) : item.reason === 'salah_ukuran' ? (
                          <span className="text-indigo-700 font-bold">Salah Ukuran</span>
                        ) : item.reason === 'salah_model' ? (
                          <span className="text-blue-700 font-bold">Salah Model</span>
                        ) : item.reason === 'kelebihan_kirim' ? (
                          <span className="text-slate-600 font-bold">Kelebihan Kirim</span>
                        ) : (
                          <span className="text-slate-500 font-semibold">Lainnya</span>
                        )}
                        {item.customReasonText ? ` (${item.customReasonText})` : ''}
                      </td>
                      <td className="py-3 px-3 text-right font-black font-mono text-slate-900">
                        {formatCurrency(item.totalRefundValue)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals row */}
                  <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                    <td colSpan={4} className="py-3 px-3 text-right text-[11px] text-slate-500 font-bold">
                      TOTAL VOLUME RETUR:
                    </td>
                    <td className="py-3 px-3 text-center font-black font-mono text-indigo-950 text-xs">
                      {totalReturnedPairs} Pasang
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-right text-[11px] text-slate-500 font-bold">
                      TOTAL REFUND:
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-black font-mono text-rose-800 underline decoration-double">
                      {formatCurrency(returnItem.totalRefundAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* Chronological Notes */}
          {returnItem.notes && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Keterangan Tambahan / Kronologi Serah Terima</span>
              <p className="text-xs text-slate-700 leading-relaxed font-serif italic">
                "{returnItem.notes}"
              </p>
            </div>
          )}

          {/* Signatures Panel */}
          <div className="pt-8 border-t border-slate-150">
            <span className="block text-center text-[10px] font-black uppercase tracking-wider text-slate-400 mb-8 font-sans">
              Lembar Konfirmasi Serah Terima Fisik Barang & Pengurangan Tagihan
            </span>
            <div className="grid grid-cols-3 gap-4 text-center text-xs font-semibold text-slate-500">
              <div className="space-y-12">
                <span>Dipersiapkan Oleh,</span>
                <span className="block border-b border-dashed border-slate-300 w-36 mx-auto" />
                <span className="text-[10px] text-slate-400 block -mt-10 font-bold uppercase font-sans">Staf Administrasi</span>
              </div>
              
              <div className="space-y-12 text-slate-700">
                <span>Konsumen Penyerah,</span>
                <span className="block border-b border-dashed border-slate-400 w-36 mx-auto" />
                <span className="text-[10px] font-black text-slate-900 block -mt-10 uppercase font-sans">{returnItem.customerName}</span>
              </div>

              <div className="space-y-12">
                <span>Pemeriksa Gudang,</span>
                <span className="block border-b border-dashed border-slate-300 w-36 mx-auto" />
                <span className="text-[10px] text-slate-400 block -mt-10 font-bold uppercase font-sans">Supervisor Logistik</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
