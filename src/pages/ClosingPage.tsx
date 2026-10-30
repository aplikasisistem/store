import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  FileText, 
  ArrowRight,
  MessageCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { FormattedNumberInput } from '../components/FormattedNumberInput';

export const ClosingPage: React.FC = () => {
  const { calculateShiftDrawerSummary, saveAndSendClosingShift, closingReports, settings } = useStore();
  const { currentUser, isAdmin } = useAuth();

  const [physicalCash, setPhysicalCash] = useState<number>(0);
  const [cashierNotes, setCashierNotes] = useState<string>('');
  const [successReportUrl, setSuccessReportUrl] = useState<string | null>(null);

  const summary = calculateShiftDrawerSummary(currentUser?.name);
  const variance = physicalCash - summary.expectedDrawerTotal;

  let varianceText = 'Pas (Sesuai 100%)';
  let varianceColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (variance < 0) {
    varianceText = `Kurang Rp ${Math.abs(variance).toLocaleString('id-ID')}`;
    varianceColor = 'text-red-700 bg-red-50 border-red-200';
  } else if (variance > 0) {
    varianceText = `Lebih Rp ${variance.toLocaleString('id-ID')}`;
    varianceColor = 'text-blue-700 bg-blue-50 border-blue-200';
  }

  const handleExecuteClosing = () => {
    if (!currentUser) return;
    if (physicalCash <= 0 && !confirm('Uang fisik dihitung adalah Rp 0. Apakah Anda yakin ingin melanjutkan?')) {
      return;
    }

    const { whatsAppUrl } = saveAndSendClosingShift(
      physicalCash,
      currentUser.id,
      currentUser.name,
      cashierNotes
    );

    setSuccessReportUrl(whatsAppUrl);

    // Automatically trigger WhatsApp URL
    window.open(whatsAppUrl, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5 pb-24 lg:pb-6">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Closing Shift Kasir &amp; Laporan Setoran Laci WhatsApp
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit laci kasir otomatis terkirim langsung ke nomor WhatsApp <strong>{settings.targetWhatsApp || '085717046895'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold">
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          <span>Nomor Tujuan: {settings.targetWhatsApp || '085717046895'}</span>
        </div>
      </div>

      {/* Main Closing Audit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Live Calculation Breakdown (Col 1 to 7) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-black text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Rincian Rekapitulasi Laci Hari Ini</span>
            <span className="text-xs text-slate-400 font-medium">
              Kasir: {currentUser?.name}
            </span>
          </h3>

          <div className="space-y-2.5 text-xs">
            {/* 1. Modal Awal */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800 block">1. Modal Awal Laci</span>
                <span className="text-[11px] text-slate-500">Uang kembalian awal shift</span>
              </div>
              <span className="font-black text-sm text-slate-900">
                Rp {summary.initialDrawerCapital.toLocaleString('id-ID')}
              </span>
            </div>

            {/* 2. Penjualan Tunai */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
              <div>
                <span className="font-bold text-emerald-950 block">2. Penjualan Tunai Shift Ini</span>
                <span className="text-[11px] text-emerald-800 font-semibold">
                  {summary.cashSalesCount} Transaksi Selesai
                </span>
              </div>
              <span className="font-black text-sm text-emerald-700">
                + Rp {summary.cashSalesTotal.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Pelunasan Bon Diterima Tunai */}
            {summary.debtPaymentsCollected > 0 && (
              <div className="flex justify-between items-center p-3 rounded-xl bg-blue-50/60 border border-blue-200/80">
                <div>
                  <span className="font-bold text-blue-950 block">Pelunasan Bon Pelanggan</span>
                  <span className="text-[11px] text-blue-800">Uang tunai pelunasan utang hari ini</span>
                </div>
                <span className="font-black text-sm text-blue-700">
                  + Rp {summary.debtPaymentsCollected.toLocaleString('id-ID')}
                </span>
              </div>
            )}

            {/* 3. Pengeluaran Kas Operasional */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-red-50/60 border border-red-200/80">
              <div>
                <span className="font-bold text-red-950 block">3. Pengeluaran Kas (Petty Cash)</span>
                <span className="text-[11px] text-red-800">Biaya operasional/supplier dari laci</span>
              </div>
              <span className="font-black text-sm text-red-600">
                - Rp {summary.pettyCashOut.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Total Wajib di Laci */}
            <div className="pt-3 border-t-2 border-dashed border-slate-300 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-black text-slate-900 block">TOTAL UANG WAJIB DI LACI:</span>
                <span className="text-[11px] text-slate-500">(Modal + Tunai + Pelunasan Bon) - Biaya</span>
              </div>
              <span className="text-xl font-black text-emerald-800">
                Rp {summary.expectedDrawerTotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Cash Input & WhatsApp Sender (Col 8 to 12) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-black text-sm text-slate-900 pb-2 border-b border-slate-100 mb-3">
              Input Fisik Uang &amp; Kirim Setoran
            </h3>

            {/* Physical Cash Input with Dot Masking */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Total Uang Fisik Dihitung di Laci (Rp):
              </label>
              <FormattedNumberInput
                value={physicalCash}
                onChange={(val) => setPhysicalCash(val)}
                prefix="Rp"
                placeholder=""
                className="bg-white"
                inputClassName="text-xl font-black py-2.5"
              />
              <p className="text-[11px] text-slate-400">
                Hitung seluruh lembaran uang kertas dan koin yang ada di laci kasir saat tutup shift.
              </p>
            </div>

            {/* Quick Helper Button to Match Exactly */}
            <button
              type="button"
              onClick={() => setPhysicalCash(summary.expectedDrawerTotal)}
              className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
            >
              Isi sesuai hitungan sistem (Rp {summary.expectedDrawerTotal.toLocaleString('id-ID')})
            </button>

            {/* Variance Status Indicator */}
            <div className={`mt-4 p-3.5 rounded-xl border text-xs ${varianceColor}`}>
              <div className="font-bold flex items-center justify-between">
                <span>Status Selisih Laci:</span>
                <span className="font-black text-sm">{varianceText}</span>
              </div>
              <p className="text-[11px] mt-1 opacity-80">
                {variance === 0
                  ? 'Uang fisik laci match 100% sempurna dengan catatan sistem.'
                  : variance < 0
                  ? 'Peringatan: Uang fisik kurang dari kewajiban sistem.'
                  : 'Uang fisik lebih banyak dari catatan sistem.'}
              </p>
            </div>

            {/* Cashier Notes */}
            <div className="mt-4 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Catatan Kasir (Opsional):
              </label>
              <textarea
                value={cashierNotes}
                onChange={(e) => setCashierNotes(e.target.value)}
                placeholder=""
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs h-20 resize-none"
              />
            </div>
          </div>

          {/* Action Button: Simpan & Kirim WhatsApp */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={handleExecuteClosing}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Simpan &amp; Kirim Laporan Closing ke WA</span>
            </button>

            {successReportUrl && (
              <a
                href={successReportUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Ulang WhatsApp (085717046895)</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* RIWAYAT CLOSING KASIR DI FIREBASE / STORAGE (Section 7.3) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Riwayat Laporan Closing Shift Kasir</h3>
            <p className="text-xs text-slate-500">Tersimpan permanen untuk verifikasi oleh Pemilik Toko (Admin)</p>
          </div>
          <span className="text-xs font-bold bg-white border px-2.5 py-1 rounded-lg text-slate-600">
            Total Laporan: {closingReports.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Tanggal &amp; Waktu</th>
                <th className="py-3 px-3">Nama Kasir</th>
                <th className="py-3 px-3">Modal Awal</th>
                <th className="py-3 px-3">Penjualan Tunai</th>
                <th className="py-3 px-3">Pengeluaran Kas</th>
                <th className="py-3 px-3">Total Wajib</th>
                <th className="py-3 px-3">Fisik Dihitung</th>
                <th className="py-3 px-3">Status Selisih</th>
                <th className="py-3 px-4">Status WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {closingReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {new Date(report.closedAt).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{report.cashierName}</td>
                  <td className="py-3 px-3 text-slate-600">
                    Rp {report.initialDrawerCapital.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 font-semibold text-emerald-700">
                    Rp {report.cashSalesTotal.toLocaleString('id-ID')} ({report.cashSalesCount}x)
                  </td>
                  <td className="py-3 px-3 text-red-600">
                    Rp {report.pettyCashOut.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    Rp {report.expectedDrawerTotal.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 font-black text-slate-900">
                    Rp {report.physicalDrawerCash.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        report.varianceStatus === 'pas'
                          ? 'bg-emerald-100 text-emerald-800'
                          : report.varianceStatus === 'kurang'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {report.varianceStatus.toUpperCase()} (Rp {report.variance.toLocaleString('id-ID')})
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terkirim ke 085717046895
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {closingReports.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">
              Belum ada riwayat closing kasir yang tersimpan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
