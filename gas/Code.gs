/**
 * CODE.GS - Source Code Backend Google Apps Script (GAS)
 * Untuk Aplikasi Web Registrasi Event & Database Google Sheets + Drive.
 * 
 * CARA MEMASANG:
 * 1. Buka Google Sheets Anda -> Klik menu 'Ekstensi' -> 'Apps Script'.
 * 2. Hapus semua kode default, lalu Paste seluruh isi kode di bawah ini.
 * 3. Klik Simpan (Icon Disket).
 * 4. Klik 'Terapkan' (Deploy) -> 'Terapkan Sebagai Aplikasi Web' (New Deployment).
 * 5. Pilih 'Akses: Siapa Saja (Anyone)' -> Klik Deploy -> Berikan Izin Akses (Allow).
 * 6. Copy Web App URL dan tempel ke GAS_API_URL pada file js/config.js.
 */

// =========================================================================
// ⚙️ KONFIGURASI GLOBAL GOOGLE SHEETS, DRIVE, & NOTIFIKASI EMAIL
// =========================================================================

// 1. Nama Tab / Sheet di dalam file Google Spreadsheet Anda
const SHEET_NAME = "Sheet1";

// 2. Nama Folder Google Drive tempat foto bukti transfer peserta disimpan otomatis
const DRIVE_FOLDER_NAME = "Bukti_Transfer_Event";

// (Opsional) Jika ingin menyimpan bukti transfer ke folder Google Drive spesifik, masukkan Folder ID-nya di sini:
// Contoh Folder ID diambil dari URL Google Drive: https://drive.google.com/drive/folders/[ID_FOLDER_DISINI]
const DRIVE_FOLDER_ID = ""; // Kosongkan "" jika ingin otomatis dibuatkan folder "Bukti_Transfer_Event"

// 3. Email Tujuan Notifikasi Pendaftaran & Upload Transfer Baru
// Masukkan email Gmail panitia (contoh: "panitia.event2026@gmail.com").
// Jika dibiarkan kosong "", otomatis terkirim ke Gmail pemilik/pembuat file Google Sheets ini.
const ADMIN_NOTIFICATION_EMAIL = "";

function doGet(e) {
  const params = e.parameter;
  const action = params.action;

  if (action === "checkDuplicate") {
    return handleCheckDuplicate(params.email, params.noWa);
  }

  if (action === "getData") {
    return handleGetAllData();
  }

  return responseJSON({ status: "success", message: "Google Apps Script Backend API Active!" });
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    if (action === "register") {
      return handleRegister(postData.data, postData.adminEmail);
    }

    if (action === "uploadTransfer") {
      return handleUploadTransfer(postData.regId, postData.fileData, postData.fileName, postData.adminEmail, postData.driveFolder);
    }

    if (action === "verifyPayment") {
      return handleVerifyPayment(postData.regId, postData.status);
    }

    if (action === "presensi") {
      return handlePresensi(postData.regId);
    }

    if (action === "resetAllData") {
      return handleResetAllData();
    }

    return responseJSON({ status: "error", message: "Action tidak dikenal." });
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}

// Helper Normalisasi WA Backend
function normalizePhone(phoneStr) {
  if (!phoneStr) return "";
  var digits = String(phoneStr).replace(/\D/g, "");
  if (digits.indexOf("62") === 0) {
    digits = "0" + digits.substring(2);
  } else if (digits.indexOf("8") === 0) {
    digits = "0" + digits;
  }
  return digits;
}

function handleCheckDuplicate(email, noWa) {
  var sheet = getOrCreateSheet();
  var rows = sheet.getDataRange().getValues();
  var normWa = normalizePhone(noWa);

  for (var i = 1; i < rows.length; i++) {
    var existingEmail = String(rows[i][3]).toLowerCase();
    var existingWa = normalizePhone(rows[i][4]);

    if ((email && existingEmail === String(email).toLowerCase()) || (normWa && existingWa === normWa)) {
      return responseJSON({
        exists: true,
        data: formatRowToObject(rows[i])
      });
    }
  }

  return responseJSON({ exists: false });
}

// 1. Registrasi Peserta Baru
function handleRegister(data, customEmail) {
  const sheet = getOrCreateSheet();
  const rows = sheet.getDataRange().getValues();
  const normWa = normalizePhone(data.noWa);

  // Cek Anti-Duplikasi
  for (let i = 1; i < rows.length; i++) {
    const existingEmail = String(rows[i][3]).toLowerCase();
    const existingWa = normalizePhone(rows[i][4]);

    if (existingEmail === String(data.email).toLowerCase() || (normWa && existingWa === normWa)) {
      return responseJSON({
        status: "duplicate",
        message: "Email atau Nomor WA sudah terdaftar sebelumnya.",
        data: formatRowToObject(rows[i])
      });
    }
  }

  // Buat No Registrasi & Kode Tiket Unik
  const regId = data.regId || ("TP-" + String(rows.length).padStart(3, '0'));
  const ticketCode = data.ticketCode || ("TK26-" + Math.random().toString(36).substring(2, 8).toUpperCase());
  const timestamp = new Date().toLocaleString('id-ID');

  const newRow = [
    timestamp,
    regId,
    data.nama,
    data.email,
    data.noWa,
    data.namaToko,
    data.domisili,
    data.ukuranBaju,
    "Belum Upload",
    "-",
    "BELUM LUNAS",
    "BELUM HADIR",
    ticketCode
  ];

  sheet.appendRow(newRow);

  // Kirim Email Notifikasi ke Panitia
  sendAdminNotification(
    `Pendaftaran Baru: ${data.nama} (${regId})`,
    `Terdapat pendaftaran peserta baru:\n\nNama: ${data.nama}\nNo. Peserta: ${regId}\nKode Tiket: ${ticketCode}\nNo WA: ${data.noWa}\nEmail: ${data.email}\nNama Toko: ${data.namaToko}\nDomisili: ${data.domisili}\nUkuran Baju: ${data.ukuranBaju}`,
    customEmail
  );

  data.regId = regId;
  data.ticketCode = ticketCode;
  data.timestamp = timestamp;
  data.statusTransfer = "Belum Upload";
  data.statusBayar = "BELUM LUNAS";
  data.statusHadir = "BELUM HADIR";

  return responseJSON({ status: "success", data: data });
}

// 2. Upload Bukti Transfer ke Drive & Update Sheet
function handleUploadTransfer(regId, base64Data, fileName, customEmail, customFolder) {
  const sheet = getOrCreateSheet();
  const rows = sheet.getDataRange().getValues();
  const qLower = String(regId).toLowerCase().trim();
  const qNormPhone = normalizePhone(regId);

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const rowRegId = String(rows[i][1]).toLowerCase();
    const rowNama = String(rows[i][2]).toLowerCase();
    const rowEmail = String(rows[i][3]).toLowerCase();
    const rowWa = normalizePhone(rows[i][4]);
    const rowTicket = rows[i][12] ? String(rows[i][12]).toLowerCase() : "";

    if (rowRegId === qLower || 
        rowTicket === qLower || 
        rowEmail === qLower || 
        rowNama === qLower || 
        (qNormPhone && rowWa === qNormPhone)) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  if (rowIndex === -1) {
    return responseJSON({ status: "error", message: "Data peserta dengan ID / No WA / Email tersebut tidak ditemukan." });
  }

  // Auto Create / Find Drive Folder
  const folder = getOrCreateDriveFolder(customFolder);
  const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
  const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
  const blob = Utilities.newBlob(bytes, contentType, `Bukti_${regId}_${fileName}`);
  
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileUrl = file.getUrl();

  // Update Sheet Column: Status Transfer (I), URL Drive (J), Status Bayar (K)
  sheet.getRange(rowIndex, 9).setValue("Menunggu Verifikasi");
  sheet.getRange(rowIndex, 10).setValue(fileUrl);
  sheet.getRange(rowIndex, 11).setValue("MENUNGGU VERIFIKASI");

  sendAdminNotification(
    `Upload Bukti Transfer: ${regId}`,
    `Peserta dengan ID/No WA: ${regId} baru saja mengunggah bukti transfer.\nURL File Google Drive: ${fileUrl}\n\nSilakan buka Google Sheet atau Portal Admin untuk memverifikasi.`,
    customEmail
  );

  return responseJSON({
    status: "success",
    message: "Bukti transfer berhasil diunggah.",
    data: { regId, fileUrl }
  });
}

// 3. Ambil Seluruh Data Peserta
function handleGetAllData() {
  const sheet = getOrCreateSheet();
  const rows = sheet.getDataRange().getValues();
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    data.push(formatRowToObject(rows[i]));
  }

  return responseJSON({ status: "success", data: data });
}

// 4. Verifikasi Status Pembayaran (LUNAS / DITOLAK)
function handleVerifyPayment(regId, status) {
  const sheet = getOrCreateSheet();
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === String(regId).toLowerCase() || (rows[i][12] && String(rows[i][12]).toLowerCase() === String(regId).toLowerCase())) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return responseJSON({ status: "error", message: "Peserta tidak ditemukan." });
  }

  const statusBayar = (status === "LUNAS") ? "LUNAS" : "DITOLAK";
  const statusTransfer = (status === "LUNAS") ? "Lunas - Terverifikasi Panitia" : "Ditolak / Perlu Upload Ulang";

  sheet.getRange(rowIndex, 9).setValue(statusTransfer);
  sheet.getRange(rowIndex, 11).setValue(statusBayar);

  return responseJSON({ status: "success", message: "Status pembayaran berhasil diperbarui." });
}

// 5. Presensi / Check-in Peserta
function handlePresensi(regId) {
  const sheet = getOrCreateSheet();
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === String(regId).toLowerCase() || 
        (rows[i][12] && String(rows[i][12]).toLowerCase() === String(regId).toLowerCase()) || 
        normalizePhone(rows[i][4]) === normalizePhone(regId)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return responseJSON({ status: "error", message: "Peserta tidak ditemukan." });
  }

  const jamNow = new Date().toLocaleString('id-ID');
  sheet.getRange(rowIndex, 12).setValue(`HADIR (${jamNow})`);

  return responseJSON({ status: "success", message: "Presensi berhasil dicatat.", waktu: jamNow });
}

// 6. Reset / Kosongkan Seluruh Data Peserta di Google Sheet (Mempertahankan Baris Header)
function handleResetAllData() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    // Hapus seluruh baris data peserta mulai baris ke-2 hingga baris terakhir
    sheet.deleteRows(2, lastRow - 1);
  }
  return responseJSON({
    status: "success",
    message: "Seluruh baris data peserta di Google Sheet berhasil dikosongkan."
  });
}

// Helper Get / Auto Create Google Sheet Header
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    const headers = [
      "Timestamp", "No Registrasi", "Nama Peserta", "Email", "No WA",
      "Nama Toko", "Domisili", "Ukuran Baju", "Status Transfer",
      "URL Bukti Drive", "Status Pembayaran", "Status Kehadiran", "Kode Tiket"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
  }

  return sheet;
}

// Helper Get / Auto Create Drive Folder (Otomatis Berdampingan di Lokasi yang Sama dengan Google Sheet)
function getOrCreateDriveFolder(customFolder) {
  const folderTarget = (customFolder && customFolder.trim() !== "") ? customFolder.trim() : (DRIVE_FOLDER_ID || DRIVE_FOLDER_NAME);

  // Jika input berupa Folder ID spesifik (karakter acak panjang)
  if (folderTarget.length > 20 && !folderTarget.includes(" ")) {
    try {
      return DriveApp.getFolderById(folderTarget);
    } catch (e) {
      console.warn("Folder ID tidak valid, mencari/membuat folder otomatis.");
    }
  }

  // Deteksi lokasi folder tempat file Google Sheet ini berada
  try {
    const ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
    const parents = ssFile.getParents();

    if (parents.hasNext()) {
      const parentFolder = parents.next();
      const subFolders = parentFolder.getFoldersByName(folderTarget);
      if (subFolders.hasNext()) {
        return subFolders.next();
      } else {
        // Buat folder bukti transfer tepat berdampingan di folder yang sama dengan Google Sheet
        return parentFolder.createFolder(folderTarget);
      }
    }
  } catch (err) {
    console.warn("Fallback deteksi parent folder:", err);
  }

  // Fallback: cari atau buat di root Google Drive
  const folders = DriveApp.getFoldersByName(folderTarget);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderTarget);
  }
}

// Helper Response JSON
function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper Format Row to Object
function formatRowToObject(row) {
  return {
    timestamp: row[0],
    regId: row[1],
    nama: row[2],
    email: row[3],
    noWa: row[4],
    namaToko: row[5],
    domisili: row[6],
    ukuranBaju: row[7],
    statusTransfer: row[8],
    urlBukti: row[9],
    statusBayar: row[10],
    statusHadir: row[11],
    ticketCode: row[12] || ""
  };
}

// Kirim Email Notifikasi ke Panitia
function sendAdminNotification(subject, bodyText) {
  try {
    const targetEmail = (ADMIN_NOTIFICATION_EMAIL && ADMIN_NOTIFICATION_EMAIL.trim() !== "")
      ? ADMIN_NOTIFICATION_EMAIL.trim()
      : Session.getActiveUser().getEmail();

    if (targetEmail) {
      MailApp.sendEmail(targetEmail, "[NOTIFIKASI EVENT] " + subject, bodyText);
    }
  } catch (e) {
    console.error("Gagal mengirim notifikasi email:", e);
  }
}
