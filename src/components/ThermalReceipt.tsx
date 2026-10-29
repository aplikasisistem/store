import React from 'react';
import { Transaction } from '../types';
import { useStore } from '../context/StoreContext';
import { Printer, X } from 'lucide-react';

interface ThermalReceiptProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { settings } = useStore();

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const dt = new Date(transaction.timestamp);
  const dateFormatted = dt.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatted = dt.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Dialog Bar (Hidden during print) */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Nota Belanja PANDIR STORE</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Preview (Printable Area) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50 flex-1">
          <div
            id="printable-receipt"
            className="bg-white p-4 shadow-xs rounded-xl border border-slate-200 text-slate-900 text-xs font-mono"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-black tracking-wider uppercase">PANDIR STORE</h2>
              <p className="text-[10px] text-slate-600 mt-0.5">{settings.storeAddress}</p>
              <p className="text-[10px] text-slate-600">Telp/WA: {settings.storePhone}</p>
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>No. Invoice:</span>
                <span className="font-bold">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{dateFormatted} {timeFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{transaction.cashierName}</span>
              </div>
              {transaction.customerName && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Pelanggan:</span>
                  <span>{transaction.customerName}</span>
                </div>
              )}
              {transaction.dueDate && (
                <div className="flex justify-between text-red-700 font-bold">
                  <span>Jatuh Tempo:</span>
                  <span>{new Date(transaction.dueDate).toLocaleDateString('id-ID')}</span>
                </div>
              )}
            </div>

            {/* Purchased Items List */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-2">
              {transaction.items.map((item, index) => (
                <div key={index} className="text-[11px]">
                  <div className="font-bold truncate">{item.productName}</div>
                  <div className="flex justify-between text-slate-600 pl-2">
                    <span>
                      {item.quantity} {item.selectedUnit} x Rp {item.unitPrice.toLocaleString('id-ID')}
                      {item.discount > 0 && ` (-Rp ${item.discount.toLocaleString('id-ID')})`}
                    </span>
                    <span className="font-semibold text-slate-900">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span className="text-emerald-700">Rp {transaction.totalAmount.toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between">
                <span>Metode Bayar:</span>
                <span className="font-bold uppercase tracking-wider">
                  {transaction.paymentMethod === 'tunai' ? 'Tunai' : 'Utang / Bon'}
                </span>
              </div>

              {transaction.paymentMethod === 'tunai' && (
                <>
                  <div className="flex justify-between">
                    <span>Tunai Diterima:</span>
                    <span>Rp {(transaction.cashReceived || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Kembalian:</span>
                    <span>Rp {(transaction.change || 0).toLocaleString('id-ID')}</span>
                  </div>
                </>
              )}

              {transaction.paymentMethod === 'utang' && (
                <div className="mt-1 p-1.5 bg-amber-50 text-amber-900 rounded text-[10px] text-center font-bold">
                  * CATATAN BON BELANJA TOKO *
                </div>
              )}
            </div>

            {/* Receipt Footer Note */}
            <div className="pt-3 text-center text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">
              {settings.receiptFooterMessage}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (Hidden during print) */}
        <div className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
