import React, { useState } from 'react';
import { Transaction } from '../types';
import { useStore } from '../context/StoreContext';
import { Printer, X, Download, Bluetooth, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  const [isConnectingBt, setIsConnectingBt] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [bluetoothCharacteristic, setBluetoothCharacteristic] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const showStatus = (msg: string) => {
    setActionStatus(msg);
    setTimeout(() => setActionStatus(null), 3500);
  };

  const connectBluetoothPrinter = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert('Web Bluetooth API tidak didukung di browser ini. Gunakan Google Chrome atau Microsoft Edge.');
      return;
    }

    setIsConnectingBt(true);
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', 
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          '0000ff00-0000-1000-8000-00805f9b34fb'
        ]
      });

      setConnectedDeviceName(device.name || 'Printer Bluetooth');
      const server = await device.gatt?.connect();
      const services = await server?.getPrimaryServices();

      let foundChar: any = null;
      for (const service of services || []) {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            foundChar = char;
            break;
          }
        }
        if (foundChar) break;
      }

      setBluetoothCharacteristic(foundChar);
      showStatus(`Terhubung ke: ${device.name || 'Printer Bluetooth'}`);
    } catch (err) {
      console.warn('Bluetooth connection error:', err);
      alert('Gagal menghubungkan ke printer Bluetooth.');
    } finally {
      setIsConnectingBt(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (bluetoothCharacteristic) {
      try {
        const encoder = new TextEncoder();
        let escpos = `\x1b\x40\x1b\x61\x01${settings.storeName}\n${settings.storeAddress}\nTelp: ${settings.storePhone}\n--------------------------------\n`;
        escpos += `No: ${transaction.invoiceNumber}\nKasir: ${transaction.cashierName}\nWaktu: ${dateFormatted} ${timeFormatted}\n--------------------------------\n\x1b\x61\x00`;
        
        transaction.items.forEach((item) => {
          escpos += `${item.productName}\n  ${item.quantity} ${item.selectedUnit} x Rp ${item.unitPrice.toLocaleString('id-ID')} = Rp ${item.subtotal.toLocaleString('id-ID')}\n`;
        });

        escpos += `--------------------------------\n`;
        escpos += `TOTAL: Rp ${transaction.totalAmount.toLocaleString('id-ID')}\n`;
        escpos += `BAYAR: Rp ${(transaction.cashReceived || 0).toLocaleString('id-ID')}\n`;
        escpos += `KEMBALI: Rp ${(transaction.change || 0).toLocaleString('id-ID')}\n`;
        escpos += `--------------------------------\n`;
        escpos += `\x1b\x61\x01${settings.receiptFooterMessage}\n\n\n`;

        await bluetoothCharacteristic.writeValue(encoder.encode(escpos));
        showStatus('Berhasil mencetak via Bluetooth Thermal!');
        return;
      } catch (err) {
        console.warn('Bluetooth write error, falling back to window.print():', err);
      }
    }

    // Fallback to standard browser print
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-receipt');
    if (!element) return;
    try {
      showStatus('Memproses PDF...');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 160], // Standard thermal 80mm
      });
      const imgWidth = 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Struk_${transaction.invoiceNumber}_PANDIR.pdf`);
      showStatus('PDF berhasil diunduh!');
    } catch (err) {
      console.error('PDF export error:', err);
      window.print();
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs print:p-0 print:bg-white print:backdrop-blur-none print:items-start">
      <style>{`
        @media print {
          @page { size: auto; margin: 0; }
          body { margin: 0; }
          .print-hidden { display: none !important; }
          #printable-receipt {
            margin: 0 auto;
            page-break-inside: avoid;
            width: 80mm;
          }
        }
      `}</style>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[94vh] print:shadow-none print:w-full print:max-w-none">
        
        {/* Top Dialog Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 print-hidden">
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

        {/* Bluetooth Connection Status Banner */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs print-hidden">
          <div className="flex items-center gap-1.5">
            <Bluetooth className={`w-3.5 h-3.5 ${connectedDeviceName ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
            <span className="font-medium text-slate-700">
              {connectedDeviceName ? `Terhubung: ${connectedDeviceName}` : 'Printer Bluetooth: Belum Terhubung'}
            </span>
          </div>
          <button
            type="button"
            onClick={connectBluetoothPrinter}
            disabled={isConnectingBt}
            className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-[11px] font-bold transition shadow-2xs"
          >
            {isConnectingBt ? 'Mencari...' : connectedDeviceName ? 'Ganti Printer' : 'Cari Printer'}
          </button>
        </div>

        {actionStatus && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 print-hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionStatus}</span>
          </div>
        )}

        {/* Scrollable Receipt Preview (Printable Area) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50 flex-1 print:bg-white print:p-0 print:overflow-visible">
          <div
            id="printable-receipt"
            className="p-4 shadow-xs rounded-xl border text-xs font-mono max-w-[80mm] mx-auto print:border-none print:shadow-none print:p-0"
            style={{ 
              backgroundColor: '#ffffff', 
              color: '#000000', 
              borderColor: '#e2e8f0' 
            }}
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed" style={{ borderColor: '#e2e8f0' }}>
              <h2 className="text-base font-black tracking-wider uppercase">PANDIR STORE</h2>
              <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>{settings.storeAddress}</p>
              <p className="text-[10px]" style={{ color: '#475569' }}>Telp/WA: {settings.storePhone}</p>
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed text-[11px] space-y-1" style={{ borderColor: '#e2e8f0' }}>
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
                <div className="flex justify-between font-bold" style={{ color: '#065f46' }}>
                  <span>Pelanggan:</span>
                  <span>{transaction.customerName}</span>
                </div>
              )}
              {transaction.dueDate && (
                <div className="flex justify-between font-bold" style={{ color: '#b91c1c' }}>
                  <span>Jatuh Tempo:</span>
                  <span>{new Date(transaction.dueDate).toLocaleDateString('id-ID')}</span>
                </div>
              )}
            </div>

            {/* Purchased Items List */}
            <div className="py-2.5 border-b border-dashed space-y-2" style={{ borderColor: '#e2e8f0' }}>
              {transaction.items.map((item, index) => (
                <div key={index} className="text-[11px]">
                  <div className="font-bold truncate">{item.productName}</div>
                  <div className="flex justify-between pl-2" style={{ color: '#475569' }}>
                    <span>
                      {item.quantity} {item.selectedUnit} x Rp {item.unitPrice.toLocaleString('id-ID')}
                      {item.discount > 0 && ` (-Rp ${item.discount.toLocaleString('id-ID')})`}
                    </span>
                    <span className="font-semibold" style={{ color: '#0f172a' }}>
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 border-b border-dashed space-y-1.5 text-[11px]" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span style={{ color: '#065f46' }}>Rp {transaction.totalAmount.toLocaleString('id-ID')}</span>
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
                <div className="mt-1 p-1.5 rounded text-[10px] text-center font-bold" style={{ backgroundColor: '#fffbeb', color: '#78350f' }}>
                  * CATATAN BON BELANJA TOKO *
                </div>
              )}
            </div>

            {/* Receipt Footer Note */}
            <div className="pt-3 text-center text-[10px] whitespace-pre-line leading-relaxed" style={{ color: '#64748b' }}>
              {settings.receiptFooterMessage}
            </div>
          </div>
        </div>

        {/* 3 Primary Modal Footer Action Buttons */}
        <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-3 gap-2 shrink-0 print-hidden">
          <button
            onClick={onClose}
            className="py-2.5 px-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition text-center"
          >
            Tutup
          </button>
          <button
            onClick={handleDownloadPdf}
            className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition active:scale-95"
            title="Download Struk sebagai PDF"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">PDF</span>
          </button>
          <button
            onClick={handlePrintReceipt}
            className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition active:scale-95"
            title="Cetak Struk via Bluetooth / Printer Thermal"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cetak</span>
          </button>
        </div>
      </div>
    </div>
  );
};
