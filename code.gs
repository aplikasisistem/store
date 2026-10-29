/**
 * Google Apps Script (GAS) Webhook untuk PANDIR STORE POS System
 * 
 * CARA MEMASANG:
 * 1. Buat Google Sheets baru dengan judul "PANDIR STORE - Data Penjualan"
 * 2. Buat header di Baris 1:
 *    [ID Transaksi, Tanggal, Jam, Kasir, Tipe Pembayaran, Total Belanja, Modal (HPP), Keuntungan, Nama Pelanggan, Detail Barang]
 * 3. Buka menu Extensions (Ekstensi) > Apps Script
 * 4. Paste seluruh kode di bawah ini ke dalam Code.gs
 * 5. Klik Deploy > New deployment (Penerapan Baru)
 *    - Select type: Web App
 *    - Execute as: Me (email Anda)
 *    - Who has access: Anyone (Siapa saja)
 * 6. Copy URL Web App yang dihasilkan, lalu masukkan ke Pengaturan PANDIR STORE / VITE_GAS_WEBHOOK_URL
 */

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // Format waktu
    const now = new Date();
    const dateStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd");
    const timeStr = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");

    // Rangkum item barang
    const itemsSummary = (data.items || []).map(function(item) {
      return item.productName + " (" + item.quantity + " " + item.unit + " @ Rp " + item.price.toLocaleString("id-ID") + ")";
    }).join("; ");

    // Append baris ke Google Sheets
    sheet.appendRow([
      data.id || "TRX-" + new Date().getTime(),
      dateStr,
      timeStr,
      data.cashierName || "Kasir",
      data.paymentMethod || "Tunai",
      Number(data.totalAmount || 0),
      Number(data.totalCost || 0),
      Number(data.profit || 0),
      data.customerName || "-",
      itemsSummary
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data transaksi PANDIR STORE berhasil dicatat ke Google Sheets",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    app: "PANDIR STORE GAS Webhook Service",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
