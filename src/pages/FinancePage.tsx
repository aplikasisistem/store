import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Download, 
  PieChart, 
  BarChart3, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { FormattedNumberInput } from '../components/FormattedNumberInput';

export const FinancePage: React.FC = () => {
  const { transactions, pettyCash, capitalLogs, addCapitalEntry, categories } = useStore();
  const { currentUser } = useAuth();

  // Period Filter: harian, mingguan, bulanan, tahunan
  const [timeframe, setTimeframe] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan'>('harian');

  // Custom Date Range Picker for Excel Export
  const todayStr = new Date().toISOString().split('T')[0];
  const [exportStartDate, setExportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState<string>(todayStr);
  const [exportPaymentFilter, setExportPaymentFilter] = useState<string>('all');
  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);

  // Capital Form Modal State
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [capitalType, setCapitalType] = useState<'modal_laci' | 'modal_stok'>('modal_laci');
  const [capitalAmount, setCapitalAmount] = useState<number>(0);
  const [capitalDesc, setCapitalDesc] = useState<string>('');

  // Filter transactions based on active timeframe
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const txDate = new Date(t.timestamp);
      if (timeframe === 'harian') {
        return txDate.toDateString() === now.toDateString();
      } else if (timeframe === 'mingguan') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= weekAgo;
      } else if (timeframe === 'bulanan') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else {
        // tahunan
        return txDate.getFullYear() === now.getFullYear();
      }
    });
  }, [transactions, timeframe]);

  // Financial Metrics
  const omsetKotor = filteredTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalHPP = filteredTransactions.reduce((acc, t) => acc + t.totalCost, 0);
  const labaKotor = omsetKotor - totalHPP;

  // Filter petty cash based on timeframe
  const periodPettyCash = useMemo(() => {
    const now = new Date();
    return pettyCash.filter((p) => {
      const pDate = new Date(p.timestamp);
      if (timeframe === 'harian') return pDate.toDateString() === now.toDateString();
      if (timeframe === 'mingguan') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return pDate >= weekAgo;
      }
      if (timeframe === 'bulanan') return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      return pDate.getFullYear() === now.getFullYear();
    });
  }, [pettyCash, timeframe]);

  const biayaOperasional = periodPettyCash
    .filter((p) => p.type === 'kas_keluar')
    .reduce((acc, p) => acc + p.amount, 0);

  const labaBersih = labaKotor - biayaOperasional;
  const marginPersen = omsetKotor > 0 ? Math.round((labaBersih / omsetKotor) * 100) : 0;

  // Category Profit Contribution
  const categoryStats = useMemo(() => {
    const map: { [cat: string]: { omset: number; hpp: number; laba: number; count: number } } = {};
    filteredTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const cat = item.category || 'Lain-lain';
        if (!map[cat]) {
          map[cat] = { omset: 0, hpp: 0, laba: 0, count: 0 };
        }
        map[cat].omset += item.subtotal;
        map[cat].hpp += item.totalCost;
        map[cat].laba += (item.subtotal - item.totalCost);
        map[cat].count += item.quantity;
      });
    });

    return Object.entries(map).map(([category, stats]) => ({
      category,
      ...stats,
    })).sort((a, b) => b.laba - a.laba);
  }, [filteredTransactions]);

  // Chart data: Group by date (up to last 7 days or periods)
  const chartPoints = useMemo(() => {
    const pointsMap: { [label: string]: { label: string; omset: number; laba: number } } = {};

    // Take recent transactions
    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.timestamp);
      const label = timeframe === 'harian'
        ? `${d.getHours().toString().padStart(2, '0')}:00`
        : timeframe === 'tahunan'
        ? d.toLocaleDateString('id-ID', { month: 'short' })
        : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

      if (!pointsMap[label]) {
        pointsMap[label] = { label, omset: 0, laba: 0 };
      }
      pointsMap[label].omset += tx.totalAmount;
      pointsMap[label].laba += tx.profit;
    });

    const arr = Object.values(pointsMap);
    return arr.length > 0 ? arr : [{ label: 'Belum Ada', omset: 0, laba: 0 }];
  }, [filteredTransactions, timeframe]);

  const maxChartValue = Math.max(...chartPoints.map((p) => p.omset), 100000);

  // Execute Excel Export
  const handleExportExcel = () => {
    const result = storage.exportTransactionsToExcel(
      exportStartDate,
      exportEndDate,
      { paymentFilter: exportPaymentFilter }
    );

    setExportSuccessNotice(
      `Berhasil mengekspor ${result.count} transaksi (${result.fileName})`
    );
    setTimeout(() => setExportSuccessNotice(null), 5000);
  };

  const handleSaveCapital = () => {
    if (capitalAmount <= 0) return;
    addCapitalEntry(
      capitalType,
      capitalAmount,
      capitalDesc || (capitalType === 'modal_laci' ? 'Modal Awal Kasir' : 'Modal Belanja Stok'),
      currentUser?.name || 'Admin'
    );
    setIsCapitalModalOpen(false);
    setCapitalAmount(0);
    setCapitalDesc('');
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-5 pb-24 lg:pb-6">
      
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Analisis Keuangan &amp; Laba-Rugi (Khusus Pemilik Toko)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Perhitungan akurat Omset, HPP Modal, Biaya Tambahan, dan Laba Bersih real-time
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Filter Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {(['harian', 'mingguan', 'bulanan', 'tahunan'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg capitalize transition ${
                  timeframe === tf ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCapitalModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <Coins className="w-4 h-4" />
            <span>Kelola Uang Modal</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* 1. Omset (Pendapatan Kotor) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Omset / Penjualan Kotor
          </span>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            Rp {omsetKotor.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {filteredTransactions.length} Transaksi ({timeframe})
          </p>
        </div>

        {/* 2. Total HPP (Modal Barang) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total HPP (Modal Barang)
          </span>
          <div className="text-lg sm:text-xl font-black text-slate-700 mt-1">
            Rp {totalHPP.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Biaya kulakan barang terjual
          </p>
        </div>

        {/* 3. Biaya Operasional / Kas Keluar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Pengeluaran Kas Tambahan
          </span>
          <div className="text-lg sm:text-xl font-black text-red-600 mt-1">
            Rp {biayaOperasional.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Petty cash operasional ({periodPettyCash.length} catatan)
          </p>
        </div>

        {/* 4. Keuntungan Bersih (Laba Bersih) */}
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-500 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              Laba Bersih (Untung)
            </span>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
              {marginPersen}% Margin
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${labaBersih >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            Rp {labaBersih.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            (Omset - HPP) - Pengeluaran Kas
          </p>
        </div>
      </div>

      {/* INTERACTIVE VISUAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Trend Bar Chart: Omset vs Laba (Col 1 to 8) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Grafik Tren Penjualan &amp; Keuntungan ({timeframe.toUpperCase()})
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-xs bg-slate-400 inline-block" /> Omset
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" /> Keuntungan
              </span>
            </div>
          </div>

          {/* SVG Responsive Bar Graph */}
          <div className="pt-4 h-64 flex items-end justify-around gap-2 border-b border-slate-200 px-2">
            {chartPoints.map((pt, idx) => {
              const omsetHeight = Math.max(10, Math.round((pt.omset / maxChartValue) * 220));
              const labaHeight = Math.max(5, Math.round((pt.laba / maxChartValue) * 220));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 max-w-[60px] h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1">
                    {/* Omset Bar */}
                    <div
                      style={{ height: `${omsetHeight}px` }}
                      className="w-1/2 bg-slate-300 group-hover:bg-slate-400 rounded-t-md transition-all duration-300 relative"
                      title={`Omset: Rp ${pt.omset.toLocaleString('id-ID')}`}
                    />
                    {/* Laba Bar */}
                    <div
                      style={{ height: `${labaHeight}px` }}
                      className="w-1/2 bg-emerald-600 group-hover:bg-emerald-700 rounded-t-md transition-all duration-300 relative"
                      title={`Laba: Rp ${pt.laba.toLocaleString('id-ID')}`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 truncate w-full text-center">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-center text-[11px] text-slate-400">
            Arahkan kursor / tap pada batang grafik untuk melihat detail nominal transaksi.
          </div>
        </div>

        {/* Category Contribution Table (Col 9 to 12) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <PieChart className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Kontribusi Laba per Kategori
            </h3>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-56 pr-1">
            {categoryStats.map((item, idx) => {
              const share = labaKotor > 0 ? Math.round((item.laba / labaKotor) * 100) : 0;
              return (
                <div key={idx} className="text-xs space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-800 truncate">{item.category}</span>
                    <span className="font-bold text-emerald-700">
                      Rp {item.laba.toLocaleString('id-ID')} ({share}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(5, share))}%` }}
                      className="bg-emerald-600 h-full rounded-full"
                    />
                  </div>
                </div>
              );
            })}

            {categoryStats.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada transaksi pada periode ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EKSPOR LAPORAN EXCEL (.XLSX) CUSTOM TANGGAL (Section 8.4) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-black text-sm text-slate-900">
                Ekspor Laporan Keuangan Excel (.xlsx) Custom Tanggal
              </h3>
              <p className="text-xs text-slate-500">
                Pilih periode tanggal bebas (X s/d Y) untuk mengunduh rekapitulasi kasir, HPP, omset, dan laba
              </p>
            </div>
          </div>

          {exportSuccessNotice && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{exportSuccessNotice}</span>
            </div>
          )}
        </div>

        {/* Date Range Picker Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Dari Tanggal (Start Date):
            </label>
            <input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Sampai Tanggal (End Date):
            </label>
            <input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Metode Pembayaran:
            </label>
            <select
              value={exportPaymentFilter}
              onChange={(e) => setExportPaymentFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
            >
              <option value="all">Semua (Tunai &amp; Utang)</option>
              <option value="tunai">Hanya Tunai</option>
              <option value="utang">Hanya Utang / Bon</option>
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Laporan Excel</span>
          </button>
        </div>
      </div>

      {/* CAPITAL MANAGEMENT LOGS (Section 8.1) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Riwayat Uang Modal Toko</h3>
            <p className="text-xs text-slate-500">Pencatatan modal awal kasir dan modal pembelian stok barang</p>
          </div>
          <span className="text-xs font-bold bg-white border px-2.5 py-1 rounded-lg text-slate-600">
            Total Modal: {capitalLogs.length} Catatan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-3">Tipe Modal</th>
                <th className="py-3 px-3">Deskripsi / Peruntukan</th>
                <th className="py-3 px-3">Dicatat Oleh</th>
                <th className="py-3 px-4 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {capitalLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        log.type === 'modal_laci'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {log.type === 'modal_laci' ? 'MODAL AWAL LACI' : 'MODAL BELANJA STOK'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{log.description}</td>
                  <td className="py-3 px-3 text-slate-500">{log.recordedBy}</td>
                  <td className="py-3 px-4 text-right font-black text-sm text-slate-900">
                    Rp {log.amount.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {capitalLogs.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada pencatatan uang modal.
            </div>
          )}
        </div>
      </div>

      {/* MODAL INPUT UANG MODAL */}
      {isCapitalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Tambah Uang Modal Toko</h3>
              <button onClick={() => setIsCapitalModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Peruntukan Modal:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCapitalType('modal_laci')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      capitalType === 'modal_laci'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Modal Laci Kasir (Kembalian)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapitalType('modal_stok')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      capitalType === 'modal_stok'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Modal Belanja Stok Supplier
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal Modal (Rp):</label>
                <FormattedNumberInput
                  value={capitalAmount}
                  onChange={(val) => setCapitalAmount(val)}
                  prefix="Rp"
                  placeholder="0"
                  className="bg-white"
                  inputClassName="text-base font-black py-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan Sumber Modal:</label>
                <input
                  type="text"
                  value={capitalDesc}
                  onChange={(e) => setCapitalDesc(e.target.value)}
                  placeholder="Contoh: Modal awal kasir shift pagi / modal belanja beras"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setIsCapitalModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCapital}
                disabled={capitalAmount <= 0}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs disabled:bg-slate-300"
              >
                Simpan Uang Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
