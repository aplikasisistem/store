# PANDIR STORE - PWA POS & Manajemen Toko Sembako

Aplikasi Web Point of Sale (POS), Manajemen Stok Multi-Satuan Bertingkat (Dus / Renteng / Pcs / Kg / Gram), Manajemen Piutang/Bon Pelanggan, Kas Masuk/Keluar (Petty Cash), Closing Shift Kasir terhubung WhatsApp (085717046895), Analisis Laba-Rugi, dan Ekspor Laporan Excel Custom Tanggal untuk **PANDIR STORE**.

---

## 🚀 Fitur Unggulan

1. **Branding & Logo Responsif PANDIR STORE:** Tampilan modern, bersih, dan logo SVG dengan `aspect-ratio` & `object-fit: contain` yang tidak pernah gepeng atau buram di Android, iOS, maupun Laptop.
2. **Konversi Stok Multi-Satuan Bertingkat:**
   - 1 Dus Mie = 40 Pcs
   - 1 Dus Kopi = 12 Renteng = 120 Saset
   - 1 Karung Beras = 50 Kg = 50.000 Gram
   - Otomatis sinkron saat stok masuk (restok) dan keluar (penjualan).
   - Timbangan desimal presisi tinggi (contoh: 250 gram = 0.25 kg).
3. **Manajemen Utang / Bon Pelanggan:** Checkout bon, catatan nomor WhatsApp, jatuh tempo, dan pencatatan cicilan/pelunasan.
4. **Kas Masuk & Keluar Non-Penjualan (Petty Cash):** Biaya operasional toko, listrik, sales supplier yang langsung dihitung pada closing kasir.
5. **Closing Kasir & Setoran Laci via WhatsApp (085717046895):**
   - Perhitungan Uang Modal Awal + Penjualan Tunai - Petty Cash = Total Uang Wajib.
   - Deteksi selisih fisik (Pas / Kurang / Lebih).
   - Tombol kirim laporan langsung ke WhatsApp nomor `085717046895` dengan format struk rapi.
6. **Laporan Keuangan & Grafik Interaktif:**
   - Omset, HPP, Pengeluaran Tambahan, Laba Bersih.
   - Grafik penjualan harian, bulanan, tahunan, dan per kategori.
   - Ekspor Excel (.xlsx) dengan Custom Date Range Picker (dari tanggal A s/d B).
7. **Pencarian Cepat, Barcode Scanner Kamera & Voice Command:**
   - Input SKU / Barcode dengan Enter instan.
   - Kamera scanner Barcode / QR Code.
   - Voice command Web Speech API: sebutkan "Minyak Goreng 1" langsung menambah kuantitas (+1) ke keranjang.
8. **Manajemen Pengguna & Force Logout Real-time:**
   - Akun Demo: `admin@pandirstore.com` / `admin123` & `kasir@pandirstore.com` / `kasir123`.
   - Admin bisa nonaktifkan akun kasir (`disabled: true`), kasir yang sedang aktif langsung auto-logout seketika via Firebase listener.
9. **PWA Offline-First & In-App Auto-Update:**
   - Dapat diinstall di Android & iPhone (Add to Home Screen).
   - Deteksi update Service Worker dengan tombol "Perbarui Sekarang" (skipWaiting).
10. **Cetak Struk Thermal Siap Pakai:** Format 58mm / 80mm dengan CSS `@media print` murni nota tanpa elemen UI.
11. **Sinkronisasi Google Sheets:** Skrip `code.gs` siap pakai untuk mencatat setiap transaksi ke spreadsheet.

---

## 🛠️ Langkah Menjalankan Secara Lokal

```bash
# 1. Clone repository
git clone https://github.com/username/pandir-store.git
cd pandir-store

# 2. Install dependensi
npm install

# 3. Jalankan server pengembangan
npm run dev
```

Buka browser di `http://localhost:3000`.

---

## 🌐 Panduan Deploy ke Vercel

1. **Push ke GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi PANDIR STORE PWA POS"
   git branch -M main
   git remote add origin https://github.com/<username>/pandir-store.git
   git push -u origin main
   ```
2. **Import ke Vercel:**
   - Masuk ke dashboard [vercel.com](https://vercel.com)
   - Klik **Add New Project** > Pilih repository `pandir-store`
   - Framework Preset: **Vite**
   - Masukkan Environment Variables opsional jika menggunakan Firebase eksternal:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_GAS_WEBHOOK_URL`
   - Klik **Deploy**.
3. **Konfigurasi vercel.json:**
   File `vercel.json` telah disediakan dengan SPA rewrites dan Service Worker headers anti-cache (`no-cache, must-revalidate`).

---

## 🔑 Akun Demo Bawaan

| Role | Email | Password | Hak Akses |
|---|---|---|---|
| **Admin** | `admin@pandirstore.com` | `admin123` | Akses Penuh (POS, Stok, Modal, Laba Rugi, Excel, User Management) |
| **Kasir** | `kasir@pandirstore.com` | `kasir123` | Kasir (POS), Petty Cash, Riwayat Harian, Closing WhatsApp |
