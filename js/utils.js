/**
 * UTILS.JS - Helper bersama (escape, phone normalize, dll.)
 * Dipakai oleh app-peserta.js dan app-panitia.js
 */

// Escape HTML untuk mencegah XSS saat menyisipkan data user ke innerHTML
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Normalisasi nomor telepon Indonesia
function normalizePhone(phoneStr) {
  if (!phoneStr) return "";
  let digits = String(phoneStr).replace(/\D/g, "");
  if (digits.startsWith("62")) {
    digits = "0" + digits.slice(2);
  } else if (digits.startsWith("8")) {
    digits = "0" + digits;
  }
  return digits;
}

function isPhoneMatch(phoneA, phoneB) {
  const normA = normalizePhone(phoneA);
  const normB = normalizePhone(phoneB);
  if (!normA || !normB) return false;
  return normA === normB;
}

// Cari peserta berdasarkan query (No Reg, Kode Tiket, Email, WA, Nama)
function findParticipantByQuery(dataArray, query) {
  if (!dataArray || !query) return null;
  const qClean = String(query).trim();
  const qLower = qClean.toLowerCase();

  return dataArray.find(item => {
    if (item.regId && item.regId.toLowerCase().trim() === qLower) return true;
    if (item.ticketCode && item.ticketCode.toLowerCase().trim() === qLower) return true;
    if (item.email && item.email.toLowerCase().trim() === qLower) return true;
    if (item.noWa && isPhoneMatch(item.noWa, qClean)) return true;
    if (item.nama && (item.nama.toLowerCase().trim() === qLower || item.nama.toLowerCase().trim().startsWith(qLower))) return true;
    return false;
  });
}

// Generator kode tiket unik
function generateUniqueTicketCode(eventName) {
  const year = new Date().getFullYear();
  const randomChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomCode = "";
  for (let i = 0; i < 6; i++) {
    randomCode += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }
  let prefix = (eventName || "CGC").split(/\s+/).map(w => w[0]).join('').replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || "EVT";
  if (prefix.length < 2) prefix = "EVT";
  return `${prefix}${String(year).slice(-2)}-${randomCode}`;
}

// Generator No. Peserta (TSR-001, ...)
function generateParticipantRegId(existingArray) {
  const nextNum = (existingArray ? existingArray.length : 0) + 1;
  return `TSR-${String(nextNum).padStart(3, '0')}`;
}

// Merge data lokal + remote (GAS) tanpa kehilangan record lokal yang belum sync
function mergeData(localArr, remoteArr) {
  const local = Array.isArray(localArr) ? localArr.slice() : [];
  const remote = Array.isArray(remoteArr) ? remoteArr.slice() : [];
  const byKey = {};
  const keyOf = (it) => (it.regId || it.ticketCode || "").toLowerCase().trim();

  remote.forEach(it => { const k = keyOf(it); if (k) byKey[k] = it; });

  local.forEach(it => {
    const k = keyOf(it);
    if (!k) return;
    if (byKey[k]) {
      // Remote adalah source of truth, tapi pertahankan field yang remote kosong
      const merged = Object.assign({}, byKey[k]);
      Object.keys(it).forEach(f => {
        if (merged[f] === undefined || merged[f] === null || merged[f] === "" || merged[f] === "-") {
          merged[f] = it[f];
        }
      });
      byKey[k] = merged;
    } else {
      // Record lokal yang belum ada di remote (misal OTS gagal sync) → pertahankan
      byKey[k] = it;
    }
  });

  return Object.values(byKey);
}

// Validasi email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// Validasi nomor WA Indonesia (10-13 digit setelah normalisasi)
function isValidPhone(phone) {
  const n = normalizePhone(phone);
  return n.length >= 10 && n.length <= 13;
}