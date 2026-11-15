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

// Awalan No. Peserta dari huruf awal 2 kata pertama nama event.
// Contoh: "Silaturahmi Akbar" -> "SA", "Lomba CGC" -> "LC".
function eventNamePrefix(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const clean = (w) => String(w).replace(/[^A-Za-z0-9]/g, "");
  if (words.length === 1) return clean(words[0]).substring(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => clean(w).charAt(0)).join("").toUpperCase();
}

// Generator No. Peserta: awalan dari nama event, mis. "Silaturahmi Akbar" -> SA-001
function generateParticipantRegId(existingArray, prefixBase) {
  let base = String(prefixBase || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!base) base = "EVT";
  const prefix = base + "-";
  const re = new RegExp("^" + base + "-(\\d+)$", "i");
  let max = 0;
  (existingArray || []).forEach(function (it) {
    const m = String((it && it.regId) || "").match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return prefix + String(max + 1).padStart(3, '0');
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

// Format tanggal event: ISO (YYYY-MM-DD) → "Sabtu, 15 Agustus 2026"; string biasa → as-is
function formatEventDate(dateStr) {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  if (/[a-zA-Z]/.test(s)) return s; // sudah terformat
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return s;
  const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}

// Konversi link Google Drive share ke URL thumbnail yang bisa ditampilkan sebagai gambar
function convertDriveLink(url) {
  if (!url) return url;
  const s = String(url).trim();
  // Format: https://drive.google.com/file/d/FILE_ID/view?...
  let m = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) {
    return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1200-h1600";
  }
  // Format: https://drive.google.com/open?id=FILE_ID
  m = s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (m) {
    return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1200-h1600";
  }
  // Format: https://drive.google.com/uc?id=FILE_ID
  m = s.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (m) {
    return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1200-h1600";
  }
  return s;
}

// Konversi nomor WA ke format internasional (62xxx) untuk link wa.me
function toWaInternational(phone) {
  const n = normalizePhone(phone);
  if (!n) return "";
  if (n.startsWith("0")) return "62" + n.slice(1);
  if (n.startsWith("62")) return n;
  return "62" + n;
}

// ===== Toast Notifications =====
function ensureToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function showToast(message, type) {
  if (!type) {
    const m = String(message || "").toLowerCase();
    if (/gagal|salah|error|tidak|maaf|invalid|terlalu/.test(m)) type = 'error';
    else if (/berhasil|sukses|tersimpan|terbit|diterima/.test(m)) type = 'success';
    else if (/peringatan|warning/.test(m)) type = 'warning';
    else type = 'info';
  }
  const c = ensureToastContainer();
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.setAttribute('role', 'status');
  t.setAttribute('aria-live', 'polite');
  const icon = type === 'success' ? 'ri-checkbox-circle-line' :
               type === 'error' ? 'ri-error-warning-line' :
               type === 'warning' ? 'ri-alert-line' : 'ri-information-line';
  t.innerHTML = `<i class="${icon}"></i><span>${escapeHtml(message)}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ===== Confirm Modal (returns Promise<boolean>) =====
function showConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="confirm-modal-box">
        <p>${escapeHtml(message)}</p>
        <div class="confirm-modal-actions">
          <button class="btn btn-secondary" data-action="cancel">Batal</button>
          <button class="btn btn-primary" data-action="ok">Ya, Lanjutkan</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const okBtn = overlay.querySelector('[data-action="ok"]');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    function close(result) {
      overlay.remove();
      resolve(result);
    }
    okBtn.addEventListener('click', () => close(true));
    cancelBtn.addEventListener('click', () => close(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', esc); close(false); }
    });
    okBtn.focus();
  });
}