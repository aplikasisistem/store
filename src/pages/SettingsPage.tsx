import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { 
  Settings, 
  Store, 
  FileText, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload,
  Volume2, 
  VolumeX, 
  Send,
  Save,
  ShieldCheck
} from 'lucide-react';
import { FormattedNumberInput } from '../components/FormattedNumberInput';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, isFirebaseActive, syncAllToGoogleSheets, reloadAllData, resetAllData } = useStore();
  const { currentUser, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    storeName: settings.storeName || 'PANDIR STORE',
    storeAddress: settings.storeAddress || 'Jl. Raya Sembako No. 88, Pasar Induk',
    storePhone: settings.storePhone || '0857-1704-6895',
    receiptFooterMessage: settings.receiptFooterMessage || '',
    targetWhatsApp: settings.targetWhatsApp || '085717046895',
    initialDrawerCapital: settings.initialDrawerCapital || 200000,
    gasWebhookUrl: settings.gasWebhookUrl || '',
    autoSyncGoogleSheets: settings.autoSyncGoogleSheets || false,
    soundEnabled: settings.soundEnabled !== false,
  });

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [importPendingData, setImportPendingData] = useState<any | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    setSaveSuccess(true);
    showToast('Pengaturan toko berhasil diperbarui!');
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTriggerGASSync = async () => {
    setSyncStatus('Mengirim data ke Google Sheets...');
    const res = await syncAllToGoogleSheets();
    setSyncStatus(res.message);
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        version: '1.0.8',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.name || 'Admin',
        storeName: settings.storeName,
        products: storage.getProducts(),
        categories: storage.getCategories(),
        transactions: storage.getTransactions(),
        debts: storage.getDebts(),
        pettyCash: storage.getPettyCash(),
        closingReports: storage.getClosingReports(),
        capitalLogs: storage.getCapitalLogs(),
        stockLogs: storage.getStockLogs(),
        settings: storage.getSettings(),
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute(
        'download',
        `Backup_PANDIR_STORE_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('File backup data toko berhasil diunduh!');
    } catch {
      showToast('Gagal mengekspor data backup.');
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], 'UTF-8');
      fileReader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (parsed && (parsed.products || parsed.transactions)) {
            setImportPendingData(parsed);
          } else {
            setImportErrorMessage('Format file backup JSON tidak valid.');
            setTimeout(() => setImportErrorMessage(null), 4000);
          }
        } catch {
          setImportErrorMessage('Gagal membaca file backup JSON.');
          setTimeout(() => setImportErrorMessage(null), 4000);
        }
      };
    }
  };

  const confirmImportBackup = () => {
    if (!importPendingData) return;
    const parsed = importPendingData;
    if (parsed.products) localStorage.setItem('pandir_products', JSON.stringify(parsed.products));
    if (parsed.categories) localStorage.setItem('pandir_categories', JSON.stringify(parsed.categories));
    if (parsed.transactions) localStorage.setItem('pandir_transactions', JSON.stringify(parsed.transactions));
    if (parsed.debts) localStorage.setItem('pandir_debts', JSON.stringify(parsed.debts));
    if (parsed.pettyCash) localStorage.setItem('pandir_petty_cash', JSON.stringify(parsed.pettyCash));
    if (parsed.closingReports) localStorage.setItem('pandir_closing_reports', JSON.stringify(parsed.closingReports));
    if (parsed.settings) localStorage.setItem('pandir_settings', JSON.stringify(parsed.settings));
    
    reloadAllData();
    setImportPendingData(null);
    showToast('Data toko berhasil dipulihkan dari file backup!');
  };

  const confirmResetData = () => {
    resetAllData();
    setIsResetModalOpen(false);
    showToast('Data toko berhasil di-reset ke kondisi bawaan!');
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-5 space-y-5 pb-24 lg:pb-6">
      
      {/* Admin Full Access Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Pengaturan Sistem &amp; Toko
              </h2>
              <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                Full Akses Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola identitas struk nota, WhatsApp closing, integrasi Google Sheets, serta backup &amp; pemulihan database
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Tersimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        
        {/* Identitas Toko & Header Struk (Section 1) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>1. Identitas Branding &amp; Struk Cetak</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nama Toko (PANDIR STORE):
              </label>
              <input
                type="text"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nomor Telepon Toko:
              </label>
              <input
                type="text"
                value={form.storePhone}
                onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Alamat Toko:
            </label>
            <input
              type="text"
              value={form.storeAddress}
              onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Pesan Footer Struk Nota Thermal:
            </label>
            <textarea
              value={form.receiptFooterMessage}
              onChange={(e) => setForm({ ...form, receiptFooterMessage: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 h-16 resize-none"
            />
          </div>
        </div>

        {/* Closing Shift & WhatsApp Target (Section 7) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Send className="w-4 h-4 text-emerald-600" />
            <span>2. Modul Closing Kasir &amp; WhatsApp Laci</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nomor WhatsApp Tujuan Closing Kasir:
              </label>
              <input
                type="text"
                value={form.targetWhatsApp}
                onChange={(e) => setForm({ ...form, targetWhatsApp: e.target.value })}
                placeholder="085717046895"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-emerald-800"
                required
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Default: 085717046895 (Otomatis membuka chat WA saat closing shift)
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Uang Modal Awal Laci Default (Rp):
              </label>
              <FormattedNumberInput
                value={form.initialDrawerCapital}
                onChange={(val) => setForm({ ...form, initialDrawerCapital: val })}
                prefix="Rp "
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Standar uang kembalian kasir sebelum shift dimulai (Rp 200.000)
              </p>
            </div>
          </div>
        </div>

        {/* Google Apps Script & Sheets Integration (Section 6, 14, 16) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>3. Integrasi Google Sheets (GAS Webhook)</span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              URL Webhook Google Apps Script (VITE_GAS_WEBHOOK_URL):
            </label>
            <input
              type="url"
              value={form.gasWebhookUrl}
              onChange={(e) => setForm({ ...form, gasWebhookUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-[11px]"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Pasang skrip dari file <code>code.gs</code> pada Apps Script Google Sheets Anda untuk merekap otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoSyncGoogleSheets}
                onChange={(e) => setForm({ ...form, autoSyncGoogleSheets: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="font-bold text-slate-700">
                Otomatis kirim setiap transaksi penjualan baru ke Google Sheets
              </span>
            </label>

            <button
              type="button"
              onClick={handleTriggerGASSync}
              disabled={!form.gasWebhookUrl}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan ke Google Sheets Sekarang</span>
            </button>
          </div>

          {syncStatus && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold">
              {syncStatus}
            </div>
          )}
        </div>

        {/* Backup & Restore Data Toko (Admin Full Access) */}
        {isAdmin && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>4. Cadangan &amp; Pemulihan Data Toko (Backup &amp; Restore)</span>
            </div>

            <p className="text-slate-600">
              Eksport seluruh database toko (produk, stok, transaksi, buku utang, dan closing) ke file cadangan JSON atau pulihkan data dari file backup.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Unduh File Backup Data (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Pulihkan Data dari File Backup</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Audio & Efek Suara */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            {form.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>5. Suara &amp; Feedback Transaksi</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.soundEnabled}
              onChange={(e) => setForm({ ...form, soundEnabled: e.target.checked })}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="font-bold text-slate-700">
              Aktifkan suara Beep Barcode Scanner, Voice Chime, dan Transaksi Selesai
            </span>
          </label>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan Pengaturan</span>
        </button>
      </form>

      {/* Database Maintenance & Demo Reset */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs space-y-3 text-xs">
          <div className="font-bold text-red-900 flex items-center gap-2 pb-2 border-b border-red-100">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Zona Risiko Tinggi: Reset Data Toko</span>
          </div>

          <p className="text-slate-600">
            Tombol ini akan membersihkan data lokal dan mengembalikan database produk dan stok ke kondisi awal.
          </p>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold rounded-xl transition active:scale-95"
          >
            Reset Seluruh Data Toko ke Kondisi Bawaan
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold border border-slate-700 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Import Error Message Banner */}
      {importErrorMessage && (
        <div className="fixed top-20 right-4 z-50 bg-red-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold border border-red-700 animate-in slide-in-from-top-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{importErrorMessage}</span>
        </div>
      )}

      {/* CUSTOM RESET DATA CONFIRMATION MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Reset Seluruh Data Toko?</h3>
                <p className="text-xs text-slate-500">Tindakan ini mengembalikan data ke kondisi bawaan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin me-reset <strong>SELURUH data toko</strong>? Riwayat transaksi, buku utang, pengeluaran kas, dan stok barang akan dikembalikan ke kondisi awal bawaan.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ya, Reset Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM IMPORT BACKUP CONFIRMATION MODAL */}
      {importPendingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Pulihkan Data Cadangan?</h3>
                <p className="text-xs text-slate-500">File Backup JSON Valid</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              File backup ini berisi data toko versi <strong>{importPendingData.version || '1.0'}</strong> ({importPendingData.exportedAt ? new Date(importPendingData.exportedAt).toLocaleDateString('id-ID') : 'Terbaru'}).
              <br /><br />
              Memulihkan data akan menggantikan data toko saat ini dengan isi file cadangan. Lanjutkan?
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setImportPendingData(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmImportBackup}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ya, Pulihkan Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
