# 📋 PROJECT PLAN LENGKAP: APLIKASI WEB REGISTRASI EVENT & SCANNER QR CODE (100% GRATIS)

> **Dokumen Rencana Teknis Terperinci & Panduan Setup A-Z**  
> *Dokumen ini dibuat agar dapat dibaca oleh AI Assistant (maupun developer) di akun/sesi mana pun untuk membangun kodenya secara bertahap tanpa ada detail yang terlewatkan.*

---

## 🎯 1. Ringkasan Proyek & Spesifikasi Kunci

Aplikasi Web Registrasi Event 100% Gratis berbasis **Frontend HTML/CSS/JS (di-host di GitHub Pages / Vercel)** dan **Backend Google Apps Script (GAS) + Google Sheets + Google Drive**.

### 🌟 Fitur Utama:
1. **6 Field Registrasi Peserta**: Nama Lengkap, Email, No. WhatsApp/HP, Nama Toko, Domisili, Ukuran Baju (M, L, XL, XXL, 3XL, 4XL Jumbo, 5XL Jumbo Super).
2. **Pemisahan Role Login Admin & Panitia**:
   - 👑 **Super Admin** (`admin` / `admin2026`): Akses penuh ke seluruh tab termasuk **Tab 4 (Setting Poster Event & Reset Data)**.
   - 👤 **Panitia Registrasi** (`panitia` / `panitia2026`): Akses khusus tab operasional (Data Peserta, Verifikasi Bayar, Scanner Kamera, & **Mode Scanner Mandiri**). **Tab 4 disembunyikan secara otomatis** untuk mencegah panitia salah mereset data.
3. **Responsive Multi-Device Layout**: Tampilan web secara otomatis menyesuaikan ukuran layar komputer PC, Laptop, Tablet, maupun Smartphone HP Android/iPhone dengan navigasi sentuh yang nyaman.
3. **Fitur Mock Testing Lokal (Bisa Ditest Langsung di Antigravity IDE)**:
   - Dilengkapi mode `USE_MOCK_DATA: true` di `js/config.js` agar bisa diuji coba 100% di Antigravity IDE (tampilan UI, QR Code generator, login admin, & camera scanner) **sebelum di-deploy ke GitHub/Google Sheets**!
4. **Pencegahan Duplikasi Data**: Pendaftaran dengan Email atau No WA yang sama akan ditolak secara otomatis dan diarahkan ke tombol *Lihat Tiket Saya*.
5. **Batas Waktu & Deadline Pendaftaran Dinamis**: Admin dapat mengatur tanggal & jam penutupan pendaftaran secara otomatis atau manual langsung dari dashboard admin tanpa perlu mengubah kode program.
6. **Notifikasi Email Panitia**: Otomatis mengirim email rangkuman ke Email Panitia saat ada pendaftaran atau upload transfer baru.
7. **Presensi & Merchandise Pass**: Saat QR Code di-scan (oleh Panitia, Tablet Kios, atau HP Peserta), sistem menampilkan **Struk Presensi Digital** dengan highlight ukuran baju (misal `XL`) dan No Registrasi fisik.
8. **Perhitungan Presensi Akurat**: Status presensi hanya terhitung `HADIR` jika peserta sudah melakukan scan presensi atau di-set presensi oleh panitia (status `BELUM HADIR` tidak akan pernah terhitung `HADIR`).

---

## 🏗️ 2. Arsitektur File & Struktur Folder Workspace (`d:\Registrasi`)

```
d:\Registrasi\
├── index.html            # Portal Web Peserta
├── admin.html            # Portal Web Panitia (Protected Login Username/Password)
├── css/
│   └── styles.css        # Responsive Glassmorphic UI & Styling System
├── js/
│   ├── config.js         # Pengaturan URL GAS, Sheet URL, Auth Admin, Rekening Bank, Poster, & Mock Mode
│   ├── app-peserta.js    # Logic Portal Peserta & QR Generator (qrcode.js)
│   └── app-panitia.js    # Logic Portal Panitia, Rekap Baju, Auth, Scanner (html5-qrcode), & Kios Mode
├── images/
│   └── poster-event.jpg  # Banner Poster Event
├── gas/
│   └── Code.gs           # Source Code Backend Google Apps Script (GAS API)
├── PROJECT_PLAN.md       # Master File Rencana Proyek ini
└── README.md             # Panduan Cara Pasang GAS & Deploy ke GitHub Pages
```
