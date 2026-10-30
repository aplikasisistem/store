import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { PettyCashType } from '../types';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  Filter, 
  Tag, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { FormattedNumberInput } from '../components/FormattedNumberInput';

export const PettyCashPage: React.FC = () => {
  const { pettyCash, addPettyCashEntry } = useStore();
  const { currentUser } = useAuth();

  const [filterType, setFilterType] = useState<'all' | 'kas_masuk' | 'kas_keluar'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [type, setType] = useState<PettyCashType>('kas_keluar');
  const [category, setCategory] = useState<string>('Operasional Toko');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculations
  const todayEntries = pettyCash.filter((p) => p.timestamp.startsWith(todayStr));
  const todayIn = todayEntries
    .filter((p) => p.type === 'kas_masuk')
    .reduce((acc, p) => acc + p.amount, 0);
  const todayOut = todayEntries
    .filter((p) => p.type === 'kas_keluar')
    .reduce((acc, p) => acc + p.amount, 0);

  const filteredEntries = pettyCash.filter((entry) => {
    if (filterType === 'all') return true;
    return entry.type === filterType;
  });

  const handleSaveEntry = () => {
    if (amount <= 0 || !description.trim()) {
      alert('Nominal uang dan keterangan wajib diisi.');
      return;
    }

    addPettyCashEntry({
      type,
      category,
      amount,
      description: description.trim(),
      cashierName: currentUser?.name || 'Kasir',
    });

    setIsModalOpen(false);
    setAmount(0);
    setDescription('');
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-4 pb-24 lg:pb-6">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Kas Operasional Laci (Petty Cash)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan kas masuk &amp; kas keluar non-penjualan (listrik, supplier, kebersihan)
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Catat Kas Baru</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-500">Kas Masuk Hari Ini</span>
            <div className="text-lg font-black text-emerald-700 mt-0.5">
              + Rp {todayIn.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-500">Pengeluaran Laci Hari Ini</span>
            <div className="text-lg font-black text-red-600 mt-0.5">
              - Rp {todayOut.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-500">Arus Bersih Kas Hari Ini</span>
            <div className={`text-lg font-black mt-0.5 ${todayIn - todayOut >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
              Rp {(todayIn - todayOut).toLocaleString('id-ID')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-white p-2 rounded-2xl border border-slate-200 gap-1.5 text-xs font-bold w-fit">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Semua Kas ({pettyCash.length})
        </button>
        <button
          onClick={() => setFilterType('kas_keluar')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterType === 'kas_keluar' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Kas Keluar (Pengeluaran)
        </button>
        <button
          onClick={() => setFilterType('kas_masuk')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterType === 'kas_masuk' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Kas Masuk
        </button>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-3">Tipe</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Keterangan</th>
                <th className="py-3 px-3">Kasir</th>
                <th className="py-3 px-4 text-right">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((item) => {
                const isOut = item.type === 'kas_keluar';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(item.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          isOut ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOut ? 'KAS KELUAR' : 'KAS MASUK'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{item.category}</td>
                    <td className="py-3 px-3 text-slate-900 font-medium">{item.description}</td>
                    <td className="py-3 px-3 text-slate-500">{item.cashierName}</td>
                    <td className="py-3 px-4 text-right font-black text-sm">
                      <span className={isOut ? 'text-red-600' : 'text-emerald-700'}>
                        {isOut ? '-' : '+'} Rp {item.amount.toLocaleString('id-ID')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredEntries.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">
              Belum ada pencatatan kas operasional.
            </div>
          )}
        </div>
      </div>

      {/* CREATE ENTRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Catat Kas Operasional Laci</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {/* Type selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis Kas:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setType('kas_keluar');
                      setCategory('Operasional Toko');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      type === 'kas_keluar'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    - Kas Keluar (Biaya)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('kas_masuk');
                      setCategory('Modal Kasir');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      type === 'kas_masuk'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    + Kas Masuk
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  {type === 'kas_keluar' ? (
                    <>
                      <option value="Operasional Toko">Operasional Toko (Plastik, ATK, Sabun)</option>
                      <option value="Listrik & Air">Listrik, Token PLN &amp; Air</option>
                      <option value="Bayar Supplier">Bayar Sales / Supplier Barang</option>
                      <option value="Kebersihan & Keamanan">Iuran Kebersihan &amp; Keamanan</option>
                      <option value="Gaji Karyawan">Uang Makan / Gaji Kasir</option>
                      <option value="Prive">Pengambilan Pribadi (Prive)</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </>
                  ) : (
                    <>
                      <option value="Modal Kasir">Tambah Modal Kembalian Laci</option>
                      <option value="Pelunasan Bon">Pelunasan Utang Pelanggan</option>
                      <option value="Pendapatan Lain">Pendapatan Non-Penjualan</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </>
                  )}
                </select>
              </div>

              {/* Nominal with Dot Masking */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal (Rp):</label>
                <FormattedNumberInput
                  value={amount}
                  onChange={(val) => setAmount(val)}
                  prefix="Rp"
                  placeholder=""
                  className="bg-white"
                  inputClassName="text-base font-black py-2.5"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan Rinci:</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder=""
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEntry}
                disabled={amount <= 0 || !description.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs disabled:bg-slate-300"
              >
                Simpan Transaksi Kas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
