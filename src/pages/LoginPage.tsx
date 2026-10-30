import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, sessionRevokedMessage, clearSessionMessage } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearSessionMessage();

    if (!email.trim() || !password.trim()) {
      setError('Silakan masukkan email/username dan kata sandi.');
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Login gagal.');
      setPassword(''); // Clear password on error securely
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Decorative Circles */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-teal-600/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 border border-slate-100">
        
        {/* PANDIR STORE Brand Header with SVG Logo Integrity */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-emerald-600 p-2.5 shadow-lg shadow-emerald-600/20 flex items-center justify-center mb-3 overflow-hidden">
            <img 
              src="/logo.svg" 
              alt="PANDIR STORE Logo" 
              className="w-full h-full object-contain aspect-square" 
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            PANDIR STORE
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
            Point of Sale &amp; Manajemen Toko Sembako
          </p>
        </div>

        {/* Force Logout Alert Banner */}
        {sessionRevokedMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Sesi Dikeluarkan Otomatis:</span>
              <p className="mt-0.5 text-red-800">{sessionRevokedMessage}</p>
            </div>
          </div>
        )}

        {/* Standard Login Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Email atau Username:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Kata Sandi (Password):
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-95 disabled:bg-slate-300"
          >
            <span>{isLoading ? 'Memeriksa Akun...' : 'Masuk ke Sistem POS'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 text-center text-[11px] text-slate-400">
          PWA Cross-Platform (Android, iPhone &amp; Desktop) • Vercel Ready
        </div>
      </div>
    </div>
  );
};
