import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { sound } from '../services/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'html5qr-code-full-region';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setErrorMessage(null);
    let mounted = true;

    const startScanner = async () => {
      try {
        // Wait a tick for DOM element to mount
        await new Promise((r) => setTimeout(r, 150));
        if (!mounted) return;

        const elem = document.getElementById(containerId);
        if (!elem) return;

        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            sound.playScanBeep();
            onScanSuccess(decodedText);
            onClose();
          },
          () => {
            // Frame failed to detect code - normal continuous loop
          }
        );

        if (mounted) {
          setIsScanning(true);
        }
      } catch (err) {
        console.warn('Camera scan start failed:', err);
        if (mounted) {
          setErrorMessage(
            'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser atau perangkat Anda.'
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [isOpen, onClose, onScanSuccess]);

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
          setIsScanning(false);
        })
        .catch(() => {});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Scanner Barcode Kamera</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Container */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[300px]">
          {errorMessage ? (
            <div className="text-center p-6 text-red-400 bg-red-950/40 rounded-xl border border-red-800/60 max-w-xs">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
              <p className="text-xs font-medium leading-relaxed">{errorMessage}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
              >
                Tutup Scanner
              </button>
            </div>
          ) : (
            <div className="relative w-full overflow-hidden rounded-xl">
              <div id={containerId} className="w-full overflow-hidden" />
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-slate-300 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="text-xs">Menyiapkan kamera...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer instructions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-600 font-medium">
            Arahkan kamera ke Barcode produk (contoh: 899... atau BRG-001). Produk otomatis masuk keranjang!
          </p>
        </div>
      </div>
    </div>
  );
};
