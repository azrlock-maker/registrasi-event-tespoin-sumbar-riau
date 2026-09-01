# 🚀 PANDUAN LENGKAP DEPLOYMENT & UJI COBA APLIKASI REGISTRASI EVENT

Selamat! Seluruh kodingan Aplikasi Web Registrasi Event & Barcode QR Code 100% Gratis ini telah siap digunakan.

---

## 🧪 CARA 1: UJI COBA LOKAL DI ANTIGRAVITY IDE (TANPA DEPLOY DULU)

Aplikasi ini sudah dilengkapi dengan **Mode Mock Testing (`USE_MOCK_DATA: true`)** di file `js/config.js`.

1. Jalankan web server lokal di Antigravity IDE atau buka file `index.html` dan `admin.html` langsung dari browser Anda.
2. **Uji Coba Portal Peserta (`index.html`)**:
   - Coba isi Form Pendaftaran (6 Field: Nama, Email, No WA, Nama Toko, Domisili, Ukuran Baju).
   - Klik **Daftar Sekarang** -> E-Tiket Digital Barcode QR akan otomatis terbit & dapat di-download!
   - Coba daftar ulang dengan Email/WA yang sama -> Sistem akan menampilkan pesan **Anti-Duplikasi**.
   - Coba Tab Upload Transfer & Tab Cek Status.
3. **Uji Coba Portal Panitia (`admin.html`)**:
   - Masukkan Login Credentials:
     - 👑 **Super Admin**: Username `admin` | Password `admin2026` *(Akses Penuh)*
     - 👤 **Panitia Registrasi**: Username `panitia` | Password `panitia2026` *(Akses Operasional)*
   - Coba **Tab 1 (Data & Verifikasi)**: Lihat tabel peserta, klik *Set Lunas*, dan coba Form *+ Tambah Peserta COD/OTS*.
   - Coba **Tab 2 (Scanner Kamera)**: Izinkan akses kamera HP/Laptop untuk me-scan QR Code E-Tiket peserta.
   - Coba **Tab 3 (Mode Kios Tablet)**: Klik *Mulai Mode Kios* untuk simulasi layar tablet pintu masuk yang mereset otomatis setiap 4 detik!

---

## ☁️ CARA 2: HUBUKGAN KE GOOGLE SHEETS & GOOGLE DRIVE (PRODUCTION)

Setelah Anda puas mencoba di Antigravity IDE dan ingin mengaktifkan pencatatan data langsung ke Google Sheets:

### 📍 Step A: Deploy Backend Google Apps Script (`gas/Code.gs`)
1. Buka [Google Drive](https://drive.google.com/), buat file **Google Sheets baru** (beri nama misal *"Data Registrasi Event 2026"*).
2. Di dalam Google Sheet tersebut, klik menu **Ekstensi (Extensions)** -> **Apps Script**.
3. Hapus semua kode bawaan, lalu **Copy-Paste seluruh isi file `gas/Code.gs`**.
4. Klik **Simpan (Icon Disket)**.
5. Klik **Terapkan (Deploy)** -> **Terapkan Sebagai Aplikasi Web (New Deployment)**.
6. Atur Pengaturan:
   - **Deskripsi**: `v1.0 API Registrasi`
   - **Eksekusi sebagai (Execute as)**: `Me (Saya)`
   - **Siapa yang memiliki akses (Who has access)**: Pilih **"Siapa Saja (Anyone)"**.
7. Klik **Deploy** -> Berikan Izin Akses Google Sheets & Drive (*Allow Access*).
8. **Salin Web App URL** yang diberikan (misal: `https://script.google.com/macros/s/AKfycb.../exec`).

### 📍 Step B: Hubungkan Ke File `js/config.js`
1. Buka file `js/config.js` di laptop Anda.
2. Ubah `USE_MOCK_DATA: false`.
3. Tempelkan URL Google Apps Script yang disalin tadi ke bagian `GAS_API_URL`.
4. Tempelkan URL Google Sheets Anda ke bagian `GOOGLE_SHEET_URL`.

---

## 🌐 CARA 3: PUBLIKASI WEBSITES GRATIS DENGAN GITHUB PAGES

1. Buka [GitHub.com](https://github.com/), buat **Repository Baru** (misal nama repo: `registrasi-event`).
2. Upload seluruh file di folder `d:\Registrasi` ini ke repository tersebut.
3. Di GitHub, klik menu **Settings** -> **Pages** (di sidebar kiri).
4. Di bagian *Branch*, pilih **main** atau **master** -> Klik **Save**.
5. Tunggu 1-2 menit. GitHub Pages akan memberikan 2 Link Website Resmi Anda:
   - 🌐 **Web Peserta**: `https://username-anda.github.io/registrasi-event/index.html`
   - 🔑 **Web Panitia**: `https://username-anda.github.io/registrasi-event/admin.html`

---

*Aplikasi web registrasi event Anda kini telah aktif 100% dan siap digunakan!*
