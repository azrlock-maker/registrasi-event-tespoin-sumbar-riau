/**
 * CONFIG.JS - File Pengaturan Utama Aplikasi Web Registrasi Event
 * Semua konfigurasi URL, Kredensial, dan Rekening diatur di sini.
 */

const CONFIG = {
  // Mode Uji Coba Lokal di Antigravity IDE (Set true untuk test lokal tanpa Google Apps Script)
  USE_MOCK_DATA: false,

  // Endpoint Google Apps Script (Diisi setelah deploy backend Code.gs ke GAS Web App)
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbwXWQzOSeABF0Bm5KSYBJVsKy_tqSna15ADQTF_Jr2NR90u8FB3s9Yao3B8T96sVIoazA/exec",

  // Direct Link Google Sheets Panitia (Akan dibuka saat klik tombol 'Buka Google Sheets Data')
  GOOGLE_SHEET_URL: "https://docs.google.com/spreadsheets/d/1yGcg5QyqzFfFhvOra4iqyt6UQmpDk3B6QwtGDn0JXzk/edit?usp=sharing",

  // Proteksi Terpisah Login Admin & Panitia (admin.html)
  ADMIN_AUTH: {
    // 👑 Role 1: Super Admin (Akses Penuh Seluruh Tab termasuk Setting Poster & Reset Data)
    ADMIN: {
      USERNAME: "admin",
      PASSWORD: "admin1129"
    },
    // 👤 Role 2: Panitia Registrasi (Akses Operasional: Data Peserta, Verifikasi Bayar, Scanner, & Kios)
    PANITIA: {
      USERNAME: "panitia",
      PASSWORD: "panitia123"
    }
  },

  // Email Notifikasi Panitia
  ADMIN_EMAIL: "",

  // Info Rekening Bank Transfer Panitia (Untuk Pembayaran Peserta)
  PAYMENT_INFO: {
    BANK_NAME: "BANK BCA",
    ACCOUNT_NUMBER: "1234567890",
    ACCOUNT_HOLDER: "Panitia Registrasi Event 2026",
    PAYMENT_INSTRUCTIONS: "Silakan melakukan transfer sesuai nominal pendaftaran, lalu unggah struk bukti transfer pada Tab 'Upload Bukti Transfer'."
  },

  // Banner Poster Event & Informasi Event di Portal Peserta (index.html)
  EVENT_INFO: {
    NAME: "GRAND GATHERING & EXPO EVENT 2026",
    DATE: "Sabtu, 15 Agustus 2026",
    TIME: "08:00 - 17:00 WIB",
    VENUE: "Grand Ballroom Hotel Indonesia, Jakarta",
    POSTER_URL: "images/poster-event.jpg"
  }
};
