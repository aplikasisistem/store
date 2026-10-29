import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { CustomerDebt } from '../types';
import { 
  BookOpen, 
  Search, 
  CheckCircle, 
  Clock, 
  Phone, 
  MessageSquare, 
  DollarSign, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { FormattedNumberInput } from '../components/FormattedNumberInput';

export const DebtPage: React.FC = () => {
  const { debts, payDebtInstallment } = useStore();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'belum_lunas' | 'cicilan' | 'lunas'>('all');

  // Installment payment modal
  const [activeDebt, setActiveDebt] = useState<CustomerDebt | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState<string>('Cicilan Pembayaran Bon');

  // Total summary calculations
  const totalReceivables = debts
    .filter((d) => d.status !== 'lunas')
    .reduce((acc, d) => acc + d.remainingAmount, 0);

  const totalPaid = debts.reduce((acc, d) => acc + d.paidAmount, 0);

  const filteredDebts = debts.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      d.customerName.toLowerCase().includes(q) ||
      d.customerPhone.includes(q) ||
      d.invoiceNumber.toLowerCase().includes(q);

    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleOpenPayModal = (debt: CustomerDebt) => {
    setActiveDebt(debt);
    setPayAmount(debt.remainingAmount); // default to full payoff
    setPayNotes('Pembayaran Bon Toko');
  };

  const handleExecutePayment = () => {
    if (!activeDebt || payAmount <= 0) return;
    payDebtInstallment(
      activeDebt.id,
      payAmount,
      currentUser?.name || 'Kasir',
      payNotes
    );
    setActiveDebt(null);
  };

  const sendWhatsAppReminder = (debt: CustomerDebt) => {
    const cleanPhone = debt.customerPhone.replace(/\D/g, '').replace(/^0/, '62');
    if (!cleanPhone || cleanPhone.length < 8) {
      alert('Nomor WhatsApp pelanggan tidak valid atau belum diisi.');
      return;
    }

    const dueDateStr = debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('id-ID') : '-';
    const message = 
`Halo Kak *${debt.customerName}*, kami dari *PANDIR STORE*.
Mengingatkan catatan bon belanja:
- No. Invoice: ${debt.invoiceNumber}
- Total Bon: Rp ${debt.totalDebt.toLocaleString('id-ID')}
- Sisa Tagihan: *Rp ${debt.remainingAmount.toLocaleString('id-ID')}*
- Jatuh Tempo: ${dueDateStr}

Mohon dapat melakukan pelunasan sebelum jatuh tempo. Terima kasih banyak atas kepercayaannya berbelanja di PANDIR STORE! 🙏`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-4 pb-24 lg:pb-6">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Buku Utang &amp; Piutang Pelanggan (Bon Toko)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan cicilan, jatuh tempo, dan arus kas pelunasan real-time
          </p>
        </div>

        {/* Quick Receivable Summary Card */}
        <div className="flex items-center gap-2 sm:gap-4 bg-emerald-50 border border-emerald-200/80 px-3.5 py-2 rounded-xl">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Total Piutang Belum Lunas
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-950">
              Rp {totalReceivables.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="hidden sm:block border-l border-emerald-200 pl-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Telah Dibayar
            </span>
            <span className="text-xs font-bold text-slate-700">
              Rp {totalPaid.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama pelanggan, nomor WA, atau no. invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
        >
          <option value="all">Semua Status Bon</option>
          <option value="belum_lunas">Belum Lunas</option>
          <option value="cicilan">Dalam Cicilan</option>
          <option value="lunas">Lunas</option>
        </select>
      </div>

      {/* Debts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-3">No. Invoice &amp; Tgl</th>
                <th className="py-3 px-3">Jatuh Tempo</th>
                <th className="py-3 px-3">Total Bon</th>
                <th className="py-3 px-3">Sudah Dibayar</th>
                <th className="py-3 px-3">Sisa Tagihan</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDebts.map((debt) => {
                const isOverdue =
                  debt.status !== 'lunas' &&
                  debt.dueDate &&
                  new Date(debt.dueDate) < new Date();

                return (
                  <tr key={debt.id} className="hover:bg-slate-50/80 transition">
                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{debt.customerName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{debt.customerPhone || '-'}</span>
                      </div>
                    </td>

                    {/* Invoice */}
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] font-semibold text-slate-700 block">
                        {debt.invoiceNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(debt.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </td>

                    {/* Due date */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}>
                          {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </div>
                      {isOverdue && (
                        <span className="text-[10px] font-extrabold text-red-600 bg-red-50 px-1 rounded">
                          Lewat Jatuh Tempo
                        </span>
                      )}
                    </td>

                    {/* Total Debt */}
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      Rp {debt.totalDebt.toLocaleString('id-ID')}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3 px-3 text-slate-600">
                      Rp {debt.paidAmount.toLocaleString('id-ID')}
                    </td>

                    {/* Remaining */}
                    <td className="py-3 px-3">
                      <span className="font-black text-red-700 text-sm">
                        Rp {debt.remainingAmount.toLocaleString('id-ID')}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      {debt.status === 'lunas' ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                          LUNAS
                        </span>
                      ) : debt.status === 'cicilan' ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold text-[10px]">
                          CICILAN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[10px]">
                          BELUM LUNAS
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {debt.status !== 'lunas' && (
                          <>
                            {/* Pay Installment Button */}
                            <button
                              onClick={() => handleOpenPayModal(debt)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition active:scale-95 shadow-xs"
                              title="Catat Cicilan / Pelunasan"
                            >
                              Bayar Bon
                            </button>

                            {/* WhatsApp Reminder */}
                            {debt.customerPhone && debt.customerPhone !== '-' && (
                              <button
                                onClick={() => sendWhatsAppReminder(debt)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition"
                                title="Kirim Tagihan WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                        {debt.status === 'lunas' && (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Lunas
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredDebts.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">
              Tidak ada catatan utang pelanggan yang sesuai.
            </div>
          )}
        </div>
      </div>

      {/* MODAL CATAT PELUNASAN / CICILAN */}
      {activeDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Catat Pembayaran Bon / Utang</h3>
                <p className="text-xs text-slate-400">{activeDebt.customerName} - {activeDebt.invoiceNumber}</p>
              </div>
              <button onClick={() => setActiveDebt(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Total Bon Awal:</span>
                  <span>Rp {activeDebt.totalDebt.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sudah Dibayar:</span>
                  <span>Rp {activeDebt.paidAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-red-700 pt-1 border-t border-slate-200">
                  <span>Sisa Tagihan:</span>
                  <span>Rp {activeDebt.remainingAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nominal Pembayaran Diterima (Rp):
                </label>
                <FormattedNumberInput
                  value={payAmount}
                  onChange={(val) => setPayAmount(val)}
                  max={activeDebt.remainingAmount}
                  prefix="Rp"
                  placeholder="0"
                  className="bg-slate-50"
                  inputClassName="text-base font-black py-2.5"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(activeDebt.remainingAmount)}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold"
                >
                  Lunasi Penuh (Rp {activeDebt.remainingAmount.toLocaleString('id-ID')})
                </button>
                {activeDebt.remainingAmount >= 50000 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(50000)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    Rp 50.000
                  </button>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Pembayaran:
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Sisa setelah pembayaran */}
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex justify-between font-bold text-emerald-900 text-xs">
                <span>Sisa Tagihan Baru:</span>
                <span>
                  Rp {Math.max(0, activeDebt.remainingAmount - payAmount).toLocaleString('id-ID')}
                  {activeDebt.remainingAmount - payAmount <= 0 && ' (LUNAS)'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setActiveDebt(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleExecutePayment}
                disabled={payAmount <= 0 || payAmount > activeDebt.remainingAmount}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs disabled:bg-slate-300"
              >
                Simpan Pelunasan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
