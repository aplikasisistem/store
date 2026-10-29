import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { usePWA } from '../hooks/usePWA';
import { 
  LogOut, 
  Wifi, 
  WifiOff, 
  Database, 
  Download, 
  RefreshCw, 
  User, 
  ShieldCheck, 
  Smartphone,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const { isOnline, isFirebaseActive } = useStore();
  const { isInstallable, isInstalled, isIOS, install, hasUpdate, applyUpdate } = usePWA();
  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <>
      {/* Seamless Auto-Update Notification Banner (Section 11) */}
      {hasUpdate && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md sticky top-0 z-50 animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Versi baru PANDIR STORE tersedia! Nikmati perbaikan & fitur terbaru.</span>
          </div>
          <button
            onClick={applyUpdate}
            className="bg-white text-amber-700 px-3 py-1 rounded font-bold hover:bg-amber-50 active:scale-95 transition text-xs shadow"
          >
            Perbarui Sekarang
          </button>
        </div>
      )}

      {/* Main Header with Logo Integrity */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          
          {/* Logo & Store Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 select-none">
            {/* Responsively bounded SVG Logo container: NEVER distorted */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-600 p-1.5 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
              <img 
                src="/logo.svg" 
                alt="PANDIR STORE Logo" 
                className="w-full h-full object-contain aspect-square drop-shadow-xs" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                  PANDIR STORE
                </h1>
                <span className="hidden xs:inline-block px-1.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded">
                  POS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Sistem Kasir &amp; Manajemen Sembako Multi-Satuan
              </p>
            </div>
          </div>

          {/* Right Action Icons & Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Real-time sync & Online status indicator */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-700">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Online</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Offline Mode</span>
                </span>
              )}

              <span className="text-slate-300">|</span>

              {isFirebaseActive ? (
                <span className="flex items-center gap-1 text-blue-600" title="Firebase Firestore Realtime Sync Aktif">
                  <Database className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Cloud Sync</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-600" title="Penyimpanan Lokal Aktif (Offline Ready)">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden lg:inline">Local DB</span>
                </span>
              )}
            </div>

            {/* PWA Install Button (Android / Chrome) */}
            {isInstallable && !isInstalled && (
              <button
                onClick={install}
                className="hidden sm:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs active:scale-95 transition"
                title="Install PANDIR STORE ke Layar Utama HP / Laptop"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install PWA</span>
              </button>
            )}

            {/* iOS Safari Guide Button */}
            {isIOS && !isInstalled && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Install iOS</span>
              </button>
            )}

            {/* User Profile Pill */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                  {isAdmin ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <div className="text-left leading-tight hidden xs:block">
                    <span className="text-xs font-bold block max-w-[90px] truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider block">
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => logout()}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Keluar dari akun"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* iOS Installation Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl text-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 p-1 flex items-center justify-center">
                <img src="/logo.svg" alt="PANDIR STORE" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Pasang di iPhone / iPad</h3>
                <p className="text-xs text-slate-500">Aplikasi PANDIR STORE PWA</p>
              </div>
            </div>

            <ol className="text-xs text-slate-600 space-y-2.5 mb-4 pl-1">
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600 bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                <span>Buka browser <strong>Safari</strong> di iPhone Anda.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600 bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                <span>Tekan tombol <strong>Share</strong> (ikon kotak dengan panah atas di bawah layar).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-emerald-600 bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                <span>Pilih <strong>"Add to Home Screen"</strong> (Tambah ke Layar Utama).</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
