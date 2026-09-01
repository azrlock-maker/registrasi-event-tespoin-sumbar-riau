/**
 * APP-PANITIA.JS - Logika Utama Portal Web Panitia (admin.html)
 * Mengelola Auth Login Username & Password, Tabel Live Data, Verifikasi Bayar,
 * Form COD OTS, Scanner Kamera Panitia, & Mode Kios Tablet Hands-Free.
 * 
 * ⚡ Developed & Crafted by: ReStore
 */

console.log("%c⚡ Event Registration System | Crafted & Developed by ReStore", "color: #38bdf8; font-size: 12px; font-weight: bold; background: #0f172a; padding: 4px 10px; border-radius: 4px;");

document.addEventListener('DOMContentLoaded', () => {
  initAdminAuth();
  initAdminTabs();
  initGoogleSheetButton();
  initOTSForm();
  initAdminScanner();
  initKioskScanner();
  initEventSettings();
});

// Helper Get Data
function getLocalData() {
  const data = localStorage.getItem("EVENT_REGISTRATIONS_DB");
  if (data) {
    try {
      const list = JSON.parse(data);
      let needsSave = false;
      list.forEach(item => {
        if (!item.ticketCode) {
          const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
          const eventName = customInfo.name || CONFIG.EVENT_INFO.NAME;
          item.ticketCode = generateUniqueTicketCode(eventName);
          needsSave = true;
        }
      });
      if (needsSave) {
        localStorage.setItem("EVENT_REGISTRATIONS_DB", JSON.stringify(list));
      }
      return list;
    } catch (e) { return []; }
  }
  return [];
}

function saveLocalData(dataArray) {
  localStorage.setItem("EVENT_REGISTRATIONS_DB", JSON.stringify(dataArray));
}

// 1. Inisialisasi Auth Login Username & Password (Terpisah Admin vs Panitia)
function initAdminAuth() {
  const loginForm = document.getElementById('admin-login-form');
  const loginPanel = document.getElementById('login-panel');
  const dashboardPanel = document.getElementById('admin-dashboard');

  const savedRole = sessionStorage.getItem('ADMIN_ROLE');
  if (savedRole) {
    if (loginPanel) loginPanel.classList.add('d-none');
    if (dashboardPanel) dashboardPanel.classList.remove('d-none');
    applyRolePermissions(savedRole);
    loadAdminTableData();
    return;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const user = document.getElementById('admin-username').value.trim();
      const pass = document.getElementById('admin-password').value.trim();

      // Cek Role Super Admin (Akses Penuh + Setting & Reset)
      if (user === CONFIG.ADMIN_AUTH.ADMIN.USERNAME && pass === CONFIG.ADMIN_AUTH.ADMIN.PASSWORD) {
        sessionStorage.setItem('ADMIN_ROLE', 'ADMIN');
        loginPanel.classList.add('d-none');
        dashboardPanel.classList.remove('d-none');
        applyRolePermissions('ADMIN');
        loadAdminTableData();
        return;
      }

      // Cek Role Panitia Operasional (Akses Data, Scanner, Kios)
      if (user === CONFIG.ADMIN_AUTH.PANITIA.USERNAME && pass === CONFIG.ADMIN_AUTH.PANITIA.PASSWORD) {
        sessionStorage.setItem('ADMIN_ROLE', 'PANITIA');
        loginPanel.classList.add('d-none');
        dashboardPanel.classList.remove('d-none');
        applyRolePermissions('PANITIA');
        loadAdminTableData();
        return;
      }

      alert("Username atau Password yang Anda masukkan salah!\n\n👑 User Admin: admin / admin2026\n👤 User Panitia: panitia / panitia2026");
    });
  }
}

function applyRolePermissions(role) {
  const tabBtnSettings = document.getElementById('tab-btn-settings');
  const panelSettings = document.getElementById('panel-settings');
  const roleBadge = document.getElementById('admin-role-badge');

  if (role === 'PANITIA') {
    if (tabBtnSettings) tabBtnSettings.style.display = 'none';
    if (panelSettings) panelSettings.style.display = 'none';
    if (roleBadge) roleBadge.innerHTML = `<i class="ri-user-star-line"></i> Mode: Panitia Registrasi`;
  } else {
    if (tabBtnSettings) tabBtnSettings.style.display = 'inline-flex';
    if (roleBadge) roleBadge.innerHTML = `<i class="ri-shield-user-fill"></i> Mode: Super Admin (Akses Penuh)`;
  }
}

window.adminLogout = function() {
  sessionStorage.removeItem('ADMIN_ROLE');
  window.location.reload();
};

// 2. Direct Link Buka Google Sheets
function initGoogleSheetButton() {
  const btnSheet = document.getElementById('btn-open-sheet');
  if (btnSheet) {
    btnSheet.href = CONFIG.GOOGLE_SHEET_URL;
  }
}

// 3. Tab Navigasi Admin
function initAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabPanels = document.querySelectorAll('.admin-tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');

      if (targetId === 'panel-data') {
        loadAdminTableData();
      }
    });
  });
}

// Helper Normalisasi Nomor Telepon / WA (mendukung format 08xx, 628xx, 8xx, spasi, dash, +62)
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
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

function findParticipantByQuery(dataArray, query) {
  if (!dataArray || !query) return null;
  const qClean = String(query).trim();
  const qLower = qClean.toLowerCase();
  
  return dataArray.find(item => {
    // 1. Cek No. Peserta / ID Registrasi (misal: TP-001)
    if (item.regId && item.regId.toLowerCase() === qLower) return true;
    // 2. Cek Kode Tiket Resmi (misal: CGC26-UNQC9Y)
    if (item.ticketCode && item.ticketCode.toLowerCase() === qLower) return true;
    // 3. Cek Alamat Email
    if (item.email && item.email.toLowerCase() === qLower) return true;
    // 4. Cek Nama Lengkap atau Nama Panggilan / Parsial
    if (item.nama && (item.nama.toLowerCase() === qLower || item.nama.toLowerCase().includes(qLower))) return true;
    // 5. Cek Nomor WhatsApp (fleksibel: 08xx, 628xx, 8xx, +62, spasi, dash)
    if (item.noWa && isPhoneMatch(item.noWa, qClean)) return true;
    // 6. Cek Nama Toko / Domisili
    if (item.namaToko && item.namaToko.toLowerCase().includes(qLower)) return true;
    if (item.domisili && item.domisili.toLowerCase().includes(qLower)) return true;
    return false;
  });
}

// 4. Load & Render Tabel Live Data Peserta
function loadAdminTableData() {
  const tableBody = document.getElementById('admin-table-body');
  const countHadir = document.getElementById('stat-total-hadir');
  const countTotal = document.getElementById('stat-total-peserta');
  const countLunas = document.getElementById('stat-total-lunas');

  if (!tableBody) return;

  const data = getLocalData();
  const filterInput = document.getElementById('admin-search-input');
  const filterValue = filterInput ? filterInput.value.trim().toLowerCase() : "";

  const filteredData = data.filter(item => {
    if (!filterValue) return true;
    return (
      (item.nama && item.nama.toLowerCase().includes(filterValue)) ||
      (item.regId && item.regId.toLowerCase().includes(filterValue)) ||
      (item.ticketCode && item.ticketCode.toLowerCase().includes(filterValue)) ||
      (item.namaToko && item.namaToko.toLowerCase().includes(filterValue)) ||
      (item.domisili && item.domisili.toLowerCase().includes(filterValue)) ||
      (item.noWa && isPhoneMatch(item.noWa, filterValue))
    );
  });

  // Statistics (Fix logic BELUM HADIR agar tidak terhitung HADIR)
  const total = data.length;
  const hadirCount = data.filter(i => i.statusHadir !== 'BELUM HADIR' && i.statusHadir.includes('HADIR')).length;
  const lunasCount = data.filter(i => i.statusBayar === 'LUNAS').length;

  if (countHadir) countHadir.textContent = hadirCount;
  if (countTotal) countTotal.textContent = total;
  if (countLunas) countLunas.textContent = lunasCount;

  // Render Rekapitulasi Pesanan Baju per Ukuran
  renderShirtSizeSummary(data);

  tableBody.innerHTML = "";

  if (filteredData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center" style="color:var(--text-muted); padding:20px;">Tidak ada data peserta.</td></tr>`;
    return;
  }

  filteredData.forEach(item => {
    let badgeBayar = `<span class="badge badge-warning">${item.statusBayar}</span>`;
    if (item.statusBayar === "LUNAS") badgeBayar = `<span class="badge badge-success">LUNAS</span>`;
    if (item.statusBayar === "DITOLAK") badgeBayar = `<span class="badge badge-danger">DITOLAK</span>`;

    const isHadir = item.statusHadir !== 'BELUM HADIR' && item.statusHadir.includes("HADIR");
    let badgeHadir = `<span class="badge badge-danger">BELUM HADIR</span>`;
    if (isHadir) badgeHadir = `<span class="badge badge-success">${item.statusHadir}</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="color:var(--accent-cyan); font-family:monospace;">${item.regId}</strong></td>
      <td><strong>${item.nama}</strong></td>
      <td>${item.namaToko}</td>
      <td>${item.domisili}</td>
      <td><span style="color:var(--accent-rose); font-weight:bold;">${item.ukuranBaju}</span></td>
      <td>${item.noWa}</td>
      <td>${badgeBayar}</td>
      <td>${badgeHadir}</td>
      <td>
        <div style="display:flex; gap:6px; flex-wrap: wrap;">
          <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="viewAdminTicket('${item.regId}')">
            <i class="ri-qr-code-line"></i> Tiket
          </button>
          ${item.statusBayar !== 'LUNAS' ? `
            <button class="btn btn-emerald" style="padding:4px 8px; font-size:0.75rem;" onclick="adminSetLunas('${item.regId}')">
              <i class="ri-check-double-line"></i> Set Lunas
            </button>
          ` : ''}
          ${isHadir ? '' : `
            <button class="btn btn-primary" style="padding:4px 8px; font-size:0.75rem;" onclick="adminSetHadir('${item.regId}')">
              <i class="ri-user-check-line"></i> Presensi
            </button>
          `}
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Function Rekapitulasi Pesanan Baju per Ukuran
function renderShirtSizeSummary(data) {
  const container = document.getElementById('shirt-summary-grid');
  const totalBadge = document.getElementById('shirt-total-pcs');
  if (!container) return;

  const sizeCounts = {
    "M": 0,
    "L": 0,
    "XL": 0,
    "XXL": 0,
    "3XL (XXXL)": 0,
    "4XL (XXXXL)": 0,
    "5XL (XXXXXL)": 0
  };

  let totalPcs = 0;
  data.forEach(item => {
    const sz = item.ukuranBaju || "L";
    sizeCounts[sz] = (sizeCounts[sz] || 0) + 1;
    totalPcs++;
  });

  if (totalBadge) totalBadge.textContent = `Total: ${totalPcs} Pcs Baju`;

  container.innerHTML = "";
  Object.keys(sizeCounts).forEach(sizeKey => {
    const count = sizeCounts[sizeKey];
    const badgeEl = document.createElement('div');
    badgeEl.style.cssText = "background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 8px 14px; text-align: center; min-width: 100px; flex: 1;";
    badgeEl.innerHTML = `
      <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Ukuran ${sizeKey}</div>
      <div style="font-size: 1.3rem; font-weight: 800; color: ${count > 0 ? 'var(--accent-rose)' : 'var(--text-dim)'}; margin-top:2px;">${count} Pcs</div>
    `;
    container.appendChild(badgeEl);
  });
}

window.filterAdminTable = function() {
  loadAdminTableData();
};

window.adminSetLunas = async function(regId) {
  if (!confirm(`Konfirmasi setujui LUNAS untuk ${regId}?`)) return;

  const data = getLocalData();
  const item = data.find(i => i.regId === regId);
  if (item) {
    item.statusBayar = "LUNAS";
    item.statusTransfer = "Lunas - Terverifikasi Panitia";
    saveLocalData(data);
    loadAdminTableData();

    const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
    const targetGasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;

    if (!CONFIG.USE_MOCK_DATA && targetGasUrl) {
      try {
        await fetch(targetGasUrl, {
          method: "POST",
          body: JSON.stringify({ action: "verifyPayment", regId: regId, status: "LUNAS" })
        });
      } catch (e) {
        console.error("GAS verifyPayment error:", e);
      }
    }

    alert(`Status ${regId} berhasil diubah menjadi LUNAS!`);
  }
};

window.adminSetHadir = async function(regId) {
  const data = getLocalData();
  const item = data.find(i => i.regId === regId);
  if (item) {
    const jamNow = new Date().toLocaleString('id-ID');
    item.statusHadir = `HADIR (${jamNow})`;
    saveLocalData(data);
    loadAdminTableData();

    const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
    const targetGasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;

    if (!CONFIG.USE_MOCK_DATA && targetGasUrl) {
      try {
        await fetch(targetGasUrl, {
          method: "POST",
          body: JSON.stringify({ action: "presensi", regId: regId })
        });
      } catch (e) {
        console.error("GAS presensi error:", e);
      }
    }

    alert(`Status presensi ${item.nama} (${regId}) berhasil diubah menjadi HADIR!`);
  }
};

// Helper Generator Kode Tiket Unik (misal: CGC26-UNQC9Y)
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

// Helper Generator No. Peserta Registrasi (Format: TP-001, TP-002, dst.)
function generateParticipantRegId(existingArray) {
  const nextNum = (existingArray ? existingArray.length : 0) + 1;
  return `TP-${String(nextNum).padStart(3, '0')}`;
}

// 5. Form Pendaftaran On-The-Spot / COD Panitia
function initOTSForm() {
  const form = document.getElementById('ots-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nama = document.getElementById('ots-nama').value.trim();
    const email = document.getElementById('ots-email').value.trim() || `${Date.now()}@ots.com`;
    const noWa = document.getElementById('ots-nowa').value.trim();
    const namaToko = document.getElementById('ots-toko').value.trim();
    const domisili = document.getElementById('ots-domisili').value.trim();
    const ukuranBaju = document.getElementById('ots-baju').value;

    if (!nama || !noWa || !namaToko || !domisili || !ukuranBaju) {
      alert("Mohon lengkapi seluruh field pendaftaran OTS!");
      return;
    }

    const data = getLocalData();
    const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
    const currentEventName = customInfo.name || CONFIG.EVENT_INFO.NAME;

    const newRegId = generateParticipantRegId(data);
    const newTicketCode = generateUniqueTicketCode(currentEventName);
    const jamNow = new Date().toLocaleString('id-ID');

    const newRecord = {
      timestamp: jamNow,
      regId: newRegId,
      ticketCode: newTicketCode,
      nama,
      email,
      noWa,
      namaToko,
      domisili,
      ukuranBaju,
      statusTransfer: "Lunas (COD / Bayar di Tempat)",
      urlBukti: "-",
      statusBayar: "LUNAS",
      statusHadir: `HADIR (${jamNow})`
    };

    data.unshift(newRecord);
    saveLocalData(data);

    alert(`Pendaftaran COD/OTS Berhasil!\nNo. Peserta: ${newRegId}\nKode Tiket: ${newTicketCode}`);
    form.reset();
    loadAdminTableData();

    // Switch to data tab
    const tabDataBtn = document.querySelector('.admin-tab-btn[data-tab="panel-data"]');
    if (tabDataBtn) tabDataBtn.click();
  });
}

// 6. Scanner Kamera Panitia (`html5-qrcode`)
let adminQrScanner = null;

function initAdminScanner() {
  const btnStart = document.getElementById('btn-start-admin-scan');
  if (!btnStart) return;

  btnStart.addEventListener('click', () => {
    if (adminQrScanner) {
      adminQrScanner.clear();
    }

    adminQrScanner = new Html5QrcodeScanner("admin-reader", { fps: 10, qrbox: 250 });
    adminQrScanner.render((decodedText) => {
      adminQrScanner.clear();
      processAdminScanResult(decodedText);
    }, (err) => {});
  });
}

function processAdminScanResult(qrText) {
  let searchKey = qrText;
  try {
    const parsed = JSON.parse(qrText);
    if (parsed.ticketCode) searchKey = parsed.ticketCode;
    else if (parsed.regId) searchKey = parsed.regId;
    else if (parsed.noWa) searchKey = parsed.noWa;
  } catch (e) {}

  const data = getLocalData();
  const item = findParticipantByQuery(data, searchKey);
  const resultDiv = document.getElementById('admin-scan-result');
  if (!resultDiv) return;

  if (!item) {
    resultDiv.innerHTML = `
      <div class="glass-panel mt-3 animate-fadeIn" style="border-color: var(--accent-rose); background: rgba(244, 63, 94, 0.12); padding: 22px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <i class="ri-error-warning-fill" style="font-size: 2.2rem; color: var(--accent-rose);"></i>
          <div>
            <h3 style="color: var(--accent-rose); margin: 0; font-size: 1.25rem;">QR CODE / BARCODE TIDAK DIKENALI!</h3>
            <p class="mt-1" style="color: #cbd5e1; font-size: 0.92rem; margin: 4px 0 0 0;">
              Kode yang di-scan tidak terdaftar di sistem. Mohon periksa kembali tiket peserta.
            </p>
          </div>
        </div>
        <div class="mt-2" style="background: rgba(0, 0, 0, 0.4); padding: 10px 14px; border-radius: 8px; font-family: monospace; font-size: 0.88rem; color: #fda4af; word-break: break-all;">
          <strong>Isi Barcode:</strong> ${String(searchKey).replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </div>
        <div class="mt-2 text-center">
          <button class="btn btn-secondary" onclick="initAdminScanner()" style="font-size: 0.85rem; padding: 6px 14px;">
            <i class="ri-qr-scan-line"></i> Scan Ulang
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Update status presensi
  const isAlreadyHadir = item.statusHadir.includes('HADIR');
  const jamNow = new Date().toLocaleString('id-ID');

  if (!isAlreadyHadir) {
    item.statusHadir = `HADIR (${jamNow})`;
    saveLocalData(data);

    const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
    const targetGasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;

    if (!CONFIG.USE_MOCK_DATA && targetGasUrl) {
      fetch(targetGasUrl, {
        method: "POST",
        body: JSON.stringify({ action: "presensi", regId: item.regId })
      }).catch(err => console.error("GAS presensi scan sync error:", err));
    }
  }

  resultDiv.innerHTML = `
    <div class="ticket-card animate-fadeIn mt-2" style="border-color: ${item.statusBayar === 'LUNAS' ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
      <div class="brand-badge" style="background: ${isAlreadyHadir ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${isAlreadyHadir ? '#fbbf24' : '#34d399'};">
        <i class="ri-checkbox-circle-fill"></i> ${isAlreadyHadir ? 'PESERTA SUDAH PRESENSI SEBELUMNYA' : 'PRESENSI HARI-H BERHASIL!'}
      </div>
      
      <h2 class="mt-1" style="color: #fff;">${item.nama.toUpperCase()}</h2>
      <div style="font-family:monospace; color:var(--accent-cyan); font-size:1.2rem; font-weight:bold;">${item.regId}</div>
      
      <div class="mt-2">
        <span class="merch-size-badge">👕 UKURAN BAJU: ${item.ukuranBaju}</span>
      </div>

      <div class="ticket-info-grid mt-2">
        <div><strong>Nama Toko:</strong> ${item.namaToko}</div>
        <div><strong>Domisili:</strong> ${item.domisili}</div>
        <div><strong>No WA:</strong> ${item.noWa}</div>
        <div><strong>Status Bayar:</strong> <span class="badge ${item.statusBayar === 'LUNAS' ? 'badge-success' : 'badge-danger'}">${item.statusBayar}</span></div>
        <div><strong>Waktu Presensi:</strong> ${item.statusHadir}</div>
      </div>

      ${item.statusBayar !== 'LUNAS' ? `
        <div class="mt-3">
          <button class="btn btn-emerald" onclick="adminSetLunas('${item.regId}'); processAdminScanResult('${qrText}');">
            <i class="ri-money-dollar-circle-line"></i> Bayar Cash & Setujui LUNAS
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// 7. Mode Kios Tablet Hands-Free Auto-Loop
let kioskScanner = null;

function initKioskScanner() {
  const btnStartKiosk = document.getElementById('btn-start-kiosk');
  if (!btnStartKiosk) return;

  btnStartKiosk.addEventListener('click', () => {
    const kioskSetup = document.getElementById('kiosk-setup');
    const kioskActive = document.getElementById('kiosk-active');

    if (kioskSetup) kioskSetup.classList.add('d-none');
    if (kioskActive) kioskActive.classList.remove('d-none');

    startKioskLoop();
  });
}

function startKioskLoop() {
  if (kioskScanner) kioskScanner.clear();

  const kioskDisplay = document.getElementById('kiosk-display');
  if (kioskDisplay) {
    kioskDisplay.innerHTML = `
      <div style="color: var(--text-muted); padding: 10px;">
        <i class="ri-qr-scan-2-line" style="font-size: 2rem; color: var(--primary);"></i>
        <p>Silakan arahkan Barcode QR Tiket ke Kamera Tablet...</p>
      </div>
    `;
  }

  kioskScanner = new Html5QrcodeScanner("kiosk-reader", { fps: 10, qrbox: 280 });
  kioskScanner.render((decodedText) => {
    kioskScanner.clear();
    handleKioskScanSuccess(decodedText);
  }, (err) => {});
}

function handleKioskScanSuccess(qrText) {
  let searchKey = qrText;
  try {
    const parsed = JSON.parse(qrText);
    if (parsed.ticketCode) searchKey = parsed.ticketCode;
    else if (parsed.regId) searchKey = parsed.regId;
    else if (parsed.noWa) searchKey = parsed.noWa;
  } catch (e) {}

  const data = getLocalData();
  const item = findParticipantByQuery(data, searchKey);
  const kioskDisplay = document.getElementById('kiosk-display');

  if (!item) {
    if (kioskDisplay) {
      kioskDisplay.innerHTML = `
        <div class="glass-panel animate-fadeIn" style="border-color: var(--accent-rose); background: rgba(244, 63, 94, 0.2); padding: 30px;">
          <h2 style="color: var(--accent-rose); font-size: 1.8rem; margin: 0;">
            <i class="ri-error-warning-fill"></i> QR CODE TIDAK DIKENALI!
          </h2>
          <p class="mt-2" style="font-size: 1.1rem; color: #fff;">
            Barcode / QR yang di-scan tidak terdaftar di sistem event ini.
          </p>
          <div class="mt-2" style="background: rgba(0, 0, 0, 0.5); padding: 8px 12px; border-radius: 8px; font-family: monospace; color: #fca5a5;">
            ${String(searchKey).replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
          <p class="mt-2" style="color: #cbd5e1;">Silakan menuju ke Meja Registrasi Panitia.</p>
        </div>
      `;
    }
  } else {
    const jamNow = new Date().toLocaleString('id-ID');
    item.statusHadir = `HADIR (${jamNow})`;
    saveLocalData(data);

    const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
    const targetGasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;

    if (!CONFIG.USE_MOCK_DATA && targetGasUrl) {
      fetch(targetGasUrl, {
        method: "POST",
        body: JSON.stringify({ action: "presensi", regId: item.regId })
      }).catch(err => console.error("GAS kiosk presensi sync error:", err));
    }

    if (kioskDisplay) {
      kioskDisplay.innerHTML = `
        <div class="kiosk-welcome-card">
          <h1 style="color:#ffffff; font-size:2rem;"><i class="ri-checkbox-circle-fill" style="color:#34d399;"></i> PRESENSI BERHASIL!</h1>
          <h2 class="mt-1" style="color:var(--accent-cyan); font-size:2.2rem;">SELAMAT DATANG, ${item.nama.toUpperCase()}!</h2>
          <p style="font-size:1.1rem; color:#e2e8f0;">(${item.namaToko} - ${item.domisili})</p>
          
          <div class="mt-2">
            <span class="merch-size-badge" style="font-size:2rem; padding:12px 32px;">👕 UKURAN BAJU: ${item.ukuranBaju}</span>
          </div>

          <p class="mt-2" style="color:#a7f3d0; font-weight:600;">Silakan Ambil Kaos & Tiket Fisik No: ${item.regId}</p>
        </div>
      `;
    }
  }

  // Auto Reset kembali ke Mode Scanning setelah 4 detik (Hands-free Loop)
  setTimeout(() => {
    startKioskLoop();
  }, 4000);
}

// 8. Pengaturan Poster & Info Event + Reset Data Event + Google Integration
function initEventSettings() {
  const form = document.getElementById('event-settings-form');
  if (!form) return;

  // Load Existing Custom Event Info
  const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  const inputName = document.getElementById('set-event-name');
  const inputDate = document.getElementById('set-event-date');
  const inputVenue = document.getElementById('set-event-venue');
  const inputPosterUrl = document.getElementById('set-poster-url');
  const inputBankName = document.getElementById('set-bank-name');
  const inputBankAcc = document.getElementById('set-bank-acc');
  const inputBankHolder = document.getElementById('set-bank-holder');
  const inputSelfPresensi = document.getElementById('set-self-presensi');
  const inputDeadlineMode = document.getElementById('set-deadline-mode');
  const inputDeadlineDatetime = document.getElementById('set-deadline-datetime');
  const inputClosedMessage = document.getElementById('set-closed-message');
  const groupDeadlineDatetime = document.getElementById('group-deadline-datetime');

  // Integrasi Google
  const inputAdminEmail = document.getElementById('set-admin-email');
  const inputDriveFolder = document.getElementById('set-drive-folder');
  const inputGasUrl = document.getElementById('set-gas-url');
  const inputSheetUrl = document.getElementById('set-sheet-url');

  const paymentInfo = customInfo.paymentInfo || CONFIG.PAYMENT_INFO;

  if (inputName) inputName.value = customInfo.name || CONFIG.EVENT_INFO.NAME;
  if (inputDate) inputDate.value = customInfo.date || CONFIG.EVENT_INFO.DATE;
  if (inputVenue) inputVenue.value = customInfo.venue || CONFIG.EVENT_INFO.VENUE;
  if (inputPosterUrl) inputPosterUrl.value = customInfo.posterUrl || CONFIG.EVENT_INFO.POSTER_URL;
  if (inputBankName) inputBankName.value = paymentInfo.bankName || CONFIG.PAYMENT_INFO.BANK_NAME;
  if (inputBankAcc) inputBankAcc.value = paymentInfo.accountNumber || CONFIG.PAYMENT_INFO.ACCOUNT_NUMBER;
  if (inputBankHolder) inputBankHolder.value = paymentInfo.accountHolder || CONFIG.PAYMENT_INFO.ACCOUNT_HOLDER;
  if (inputSelfPresensi) {
    inputSelfPresensi.value = (customInfo.selfPresensiEnabled === false || customInfo.selfPresensiEnabled === "false") ? "false" : "true";
  }
  if (inputDeadlineMode) {
    inputDeadlineMode.value = customInfo.deadlineMode || "unlimited";
    if (groupDeadlineDatetime) {
      groupDeadlineDatetime.style.display = inputDeadlineMode.value === "datetime" ? "block" : "none";
    }
    inputDeadlineMode.addEventListener('change', () => {
      if (groupDeadlineDatetime) {
        groupDeadlineDatetime.style.display = inputDeadlineMode.value === "datetime" ? "block" : "none";
      }
    });
  }
  if (inputDeadlineDatetime) {
    inputDeadlineDatetime.value = customInfo.deadlineDateTime || "";
  }
  if (inputClosedMessage) {
    inputClosedMessage.value = customInfo.closedMessage || "";
  }

  // Isi data Integrasi Google
  if (inputAdminEmail) inputAdminEmail.value = customInfo.adminEmail || CONFIG.ADMIN_EMAIL || "";
  if (inputDriveFolder) inputDriveFolder.value = customInfo.driveFolder || "Bukti_Transfer_Event";
  if (inputGasUrl) inputGasUrl.value = customInfo.gasApiUrl || CONFIG.GAS_API_URL || "";
  if (inputSheetUrl) inputSheetUrl.value = customInfo.sheetUrl || CONFIG.GOOGLE_SHEET_URL || "";

  // Update Link Tombol Buka Sheet di Header Dashboard
  const btnOpenSheet = document.getElementById('btn-open-sheet');
  if (btnOpenSheet) {
    btnOpenSheet.href = customInfo.sheetUrl || CONFIG.GOOGLE_SHEET_URL || "#";
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = inputName.value.trim();
    const date = inputDate.value.trim();
    const venue = inputVenue.value.trim();
    const posterUrlText = inputPosterUrl.value.trim();
    const bankName = (inputBankName ? inputBankName.value.trim() : "") || CONFIG.PAYMENT_INFO.BANK_NAME;
    const accountNumber = (inputBankAcc ? inputBankAcc.value.trim() : "") || CONFIG.PAYMENT_INFO.ACCOUNT_NUMBER;
    const accountHolder = (inputBankHolder ? inputBankHolder.value.trim() : "") || CONFIG.PAYMENT_INFO.ACCOUNT_HOLDER;
    const selfPresensiEnabled = inputSelfPresensi ? inputSelfPresensi.value === "true" : true;
    const deadlineMode = inputDeadlineMode ? inputDeadlineMode.value : "unlimited";
    const deadlineDateTime = inputDeadlineDatetime ? inputDeadlineDatetime.value : "";
    const closedMessage = inputClosedMessage ? inputClosedMessage.value.trim() : "";

    const adminEmail = inputAdminEmail ? inputAdminEmail.value.trim() : "";
    const driveFolder = inputDriveFolder ? inputDriveFolder.value.trim() : "";
    const gasApiUrl = inputGasUrl ? inputGasUrl.value.trim() : "";
    const sheetUrl = inputSheetUrl ? inputSheetUrl.value.trim() : "";

    const savedPaymentInfo = {
      bankName: bankName,
      accountNumber: accountNumber,
      accountHolder: accountHolder
    };

    const updatedSettings = {
      name,
      date,
      venue,
      selfPresensiEnabled,
      paymentInfo: savedPaymentInfo,
      deadlineMode,
      deadlineDateTime,
      closedMessage,
      adminEmail,
      driveFolder,
      gasApiUrl,
      sheetUrl
    };

    if (btnOpenSheet && sheetUrl) {
      btnOpenSheet.href = sheetUrl;
    }

    const fileInput = document.getElementById('set-poster-file');
    const btnSave = form.querySelector('button[type="submit"]');

    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];

      // Kompres gambar dulu, lalu upload ke Google Drive via GAS
      // agar poster bisa diakses dari browser/HP mana pun (bukan base64 lokal)
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Mengupload Poster ke Google Drive...';
      }

      compressAndSavePoster(file, function(compressedBase64) {
        const targetGasUrl = updatedSettings.gasApiUrl || CONFIG.GAS_API_URL;

        if (!CONFIG.USE_MOCK_DATA && targetGasUrl) {
          // Upload poster ke Google Drive via GAS → dapat URL publik
          fetch(targetGasUrl, {
            method: "POST",
            body: JSON.stringify({
              action: "uploadPoster",
              fileData: compressedBase64,
              fileName: file.name
            })
          })
            .then(res => res.json())
            .then(json => {
              if (json.status === "success" && json.posterUrl) {
                // Gunakan URL Drive (bisa diakses semua HP/browser)
                updatedSettings.posterUrl = json.posterUrl;
              } else {
                // Fallback: simpan base64 lokal jika upload Drive gagal
                console.warn("Upload poster ke Drive gagal, fallback ke lokal:", json.message);
                updatedSettings.posterUrl = compressedBase64;
              }
              if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="ri-save-3-line"></i> Simpan Seluruh Pengaturan Event, Rekening, & Google Integration';
              }
              saveEventInfoToStorage(updatedSettings);
            })
            .catch(err => {
              // Fallback: simpan base64 lokal jika koneksi gagal
              console.error("Koneksi GAS gagal saat upload poster:", err);
              updatedSettings.posterUrl = compressedBase64;
              if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="ri-save-3-line"></i> Simpan Seluruh Pengaturan Event, Rekening, & Google Integration';
              }
              saveEventInfoToStorage(updatedSettings);
            });
        } else {
          // Mode lokal / mock: simpan base64 langsung
          updatedSettings.posterUrl = compressedBase64;
          if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="ri-save-3-line"></i> Simpan Seluruh Pengaturan Event, Rekening, & Google Integration';
          }
          saveEventInfoToStorage(updatedSettings);
        }
      });
    } else {
      updatedSettings.posterUrl = posterUrlText || CONFIG.EVENT_INFO.POSTER_URL;
      saveEventInfoToStorage(updatedSettings);
    }
  });
}

// Kompres gambar poster agar aman disimpan di localStorage (maks ~800KB)
function compressAndSavePoster(file, callback) {
  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1600;
      let width = img.width;
      let height = img.height;

      // Resize proporsional jika gambar terlalu besar
      if (width > MAX_WIDTH) {
        height = Math.round(height * MAX_WIDTH / width);
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width = Math.round(width * MAX_HEIGHT / height);
        height = MAX_HEIGHT;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Kompres ke JPEG kualitas 0.7 agar ukuran aman di localStorage
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      callback(compressedBase64);
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function saveEventInfoToStorage(infoObj) {
  // 1. Simpan ke localStorage admin sebagai cache lokal (instant, tanpa loading)
  try {
    localStorage.setItem('CUSTOM_EVENT_INFO', JSON.stringify(infoObj));
  } catch (err) {
    alert("⚠️ Gagal menyimpan! Ukuran gambar poster terlalu besar.\n\nCoba gunakan gambar poster dengan resolusi lebih kecil, atau masukkan Link/URL gambar online pada kolom di bawahnya.");
    console.error("localStorage save error:", err);
    return;
  }

  // 2. Kirim setting ke GAS (cloud) agar semua browser/HP bisa membacanya
  const targetGasUrl = infoObj.gasApiUrl || CONFIG.GAS_API_URL;
  if (!CONFIG.USE_MOCK_DATA && targetGasUrl) {
    // Kirim tanpa posterUrl base64 (terlalu besar, hanya disimpan lokal)
    const settingsForCloud = Object.assign({}, infoObj);
    if (settingsForCloud.posterUrl && settingsForCloud.posterUrl.startsWith('data:')) {
      delete settingsForCloud.posterUrl;
    }

    fetch(targetGasUrl, {
      method: "POST",
      body: JSON.stringify({ action: "saveSettings", settings: settingsForCloud })
    })
      .then(res => res.json())
      .then(json => {
        if (json.status === "success") {
          alert("🎉 Pengaturan Event berhasil disimpan!\n\n✅ Tersimpan di cloud (GAS) — Perubahan sudah langsung tampil di Web Peserta dari browser/HP mana pun.");
        } else {
          alert("⚠️ Tersimpan di perangkat ini, tapi gagal sinkronisasi ke cloud:\n" + json.message + "\n\nPastikan URL GAS sudah benar di kolom Integrasi Google.");
        }
      })
      .catch(err => {
        console.error("GAS saveSettings error:", err);
        alert("⚠️ Pengaturan tersimpan di perangkat ini, tapi gagal terhubung ke server cloud.\n\nPerubahan hanya tampil di browser ini. Periksa koneksi internet atau URL GAS di kolom Integrasi Google.");
      });
  } else {
    alert("🎉 Pengaturan Event berhasil disimpan!\n\n(Mode lokal — Untuk sinkronisasi ke semua HP/browser, pastikan URL GAS sudah diisi di tab Integrasi Google.)");
  }
}

window.resetAllEventData = function() {
  const modal = document.getElementById('reset-confirm-modal');
  if (modal) {
    modal.classList.remove('d-none');
    modal.style.display = 'flex';
  } else {
    if (confirm("Kosongkan seluruh data event untuk memulai event baru?")) {
      confirmResetAllEventData();
    }
  }
};

window.closeResetModal = function() {
  const modal = document.getElementById('reset-confirm-modal');
  if (modal) {
    modal.classList.add('d-none');
    modal.style.display = 'none';
  }
};

window.confirmResetAllEventData = async function() {
  localStorage.setItem("EVENT_REGISTRATIONS_DB", JSON.stringify([]));
  closeResetModal();
  loadAdminTableData();

  if (!CONFIG.USE_MOCK_DATA && CONFIG.GAS_API_URL) {
    try {
      await fetch(CONFIG.GAS_API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "resetAllData" })
      });
    } catch (e) {
      console.error("Gagal mereset data Google Sheet:", e);
    }
  }

  alert("🎉 Seluruh data event berhasil dikosongkan!\n\nDatabase pendaftaran kini bersih (0 peserta) dan siap digunakan untuk event baru.");
};

// 9. Modal Preview & Download E-Tiket Resmi dari Portal Admin
window.viewAdminTicket = function(regId) {
  const data = getLocalData();
  const item = data.find(i => i.regId === regId || i.ticketCode === regId);
  if (!item) return;

  const modal = document.getElementById('admin-ticket-modal');
  const content = document.getElementById('admin-ticket-modal-content');
  if (!modal || !content) return;

  const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  const eventName = customInfo.name || CONFIG.EVENT_INFO.NAME;
  const eventDate = customInfo.date || CONFIG.EVENT_INFO.DATE;
  const eventVenue = customInfo.venue || CONFIG.EVENT_INFO.VENUE;

  let displayTicketCode = item.ticketCode;
  if (!displayTicketCode) {
    displayTicketCode = generateUniqueTicketCode(eventName);
    item.ticketCode = displayTicketCode;
    saveLocalData(data);
  }
  const displayRegId = item.regId || "TP-001";

  const isLunas = item.statusBayar === 'LUNAS';
  const statusBadgeText = isLunas ? 'LUNAS' : (item.statusBayar || 'BELUM LUNAS');
  const statusBadgeClass = isLunas ? 'lunas' : 'pending';
  const statusIcon = isLunas ? 'ri-shield-check-fill' : 'ri-time-line';

  const qrPayload = JSON.stringify({
    ticketCode: displayTicketCode,
    regId: displayRegId,
    nama: item.nama,
    noWa: item.noWa,
    ukuranBaju: item.ukuranBaju
  });

  const canvasId = "admin-qrcode-" + Math.floor(10000 + Math.random() * 90000);
  const cardId = "admin-card-" + Math.floor(10000 + Math.random() * 90000);

  content.innerHTML = `
    <div class="eticket-wrapper" style="margin:0 auto;">
      <div class="eticket-card" id="${cardId}">
        <!-- Header Banner Crimson Red -->
        <div class="eticket-header">
          <div class="eticket-header-info">
            <h3 class="eticket-header-title">E-TIKET RESMI</h3>
            <div class="eticket-header-event" title="${eventName}">${eventName}</div>
          </div>
          <div class="eticket-status-badge ${statusBadgeClass}">
            <i class="${statusIcon}"></i> ${statusBadgeText}
          </div>
        </div>

        <!-- Body Dark Card -->
        <div class="eticket-body">
          <!-- QR Code Center -->
          <div class="eticket-qr-center">
            <div class="eticket-qr-container">
              <div id="${canvasId}"></div>
            </div>
            <div class="eticket-main-code">${displayTicketCode}</div>
            <div class="eticket-sub-code">No. Peserta: ${displayRegId}</div>
          </div>

          <!-- Data Rows -->
          <hr class="eticket-divider">
          <div class="eticket-row">
            <span class="eticket-label">Nama</span>
            <span class="eticket-val">${item.nama}</span>
          </div>
          <div class="eticket-row">
            <span class="eticket-label">Ukuran Baju</span>
            <span class="eticket-val" style="color: #f43f5e; font-weight: 800;">${item.ukuranBaju || '-'}</span>
          </div>
          <div class="eticket-row">
            <span class="eticket-label">WhatsApp</span>
            <span class="eticket-val">${item.noWa}</span>
          </div>

          <!-- Event Meta Details (Date & Venue) -->
          <div class="eticket-meta-section">
            <div class="eticket-meta-item">
              <i class="ri-calendar-event-fill"></i>
              <span>${eventDate}</span>
            </div>
            <div class="eticket-meta-item">
              <i class="ri-map-pin-2-fill"></i>
              <span>${eventVenue}</span>
            </div>
          </div>

          <!-- Footer Disclaimer Note & Developer Watermark -->
          <div class="eticket-footer-note">
            Tunjukkan QR ini saat registrasi ulang di lokasi. Jangan bagikan ke orang lain.
          </div>
          <div style="font-size: 0.7rem; color: #94a3b8; text-align: center; margin-top: 8px; opacity: 0.85; letter-spacing: 0.5px;">
            ⚡ System Generated & Powered by <strong>ReStore</strong>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-3" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="downloadFullTicketCard('${cardId}', '${displayTicketCode}')">
          <i class="ri-download-2-line"></i> Download Gambar
        </button>
        <button class="btn btn-secondary" onclick="printTicketCard('${cardId}')">
          <i class="ri-printer-line"></i> Cetak E-Tiket
        </button>
        <button class="btn btn-secondary" onclick="closeAdminTicketModal()">
          <i class="ri-close-line"></i> Tutup
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('d-none');
  modal.style.display = 'flex';

  setTimeout(() => {
    const qrContainer = document.getElementById(canvasId);
    if (qrContainer) {
      qrContainer.innerHTML = "";
      try {
        if (typeof QRCode !== 'undefined') {
          new QRCode(qrContainer, {
            text: qrPayload,
            width: 175,
            height: 175,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
          });
          // Pastikan hanya 1 QR code yang ditampilkan (sembunyikan img cadangan)
          setTimeout(() => {
            const canvasEl = qrContainer.querySelector('canvas');
            const imgEl = qrContainer.querySelector('img');
            if (canvasEl && imgEl) {
              imgEl.style.display = 'none';
            }
          }, 50);
        } else {
          qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=175x175&data=${encodeURIComponent(qrPayload)}" alt="QR Code" style="width:175px; height:175px;" />`;
        }
      } catch (e) {
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=175x175&data=${encodeURIComponent(qrPayload)}" alt="QR Code" style="width:175px; height:175px;" />`;
      }
    }
  }, 100);
};

window.closeAdminTicketModal = function() {
  const modal = document.getElementById('admin-ticket-modal');
  if (modal) {
    modal.classList.add('d-none');
    modal.style.display = 'none';
  }
};

window.downloadFullTicketCard = function(cardId, regId) {
  const cardEl = document.getElementById(cardId);
  if (!cardEl) return;

  if (typeof html2canvas !== 'undefined') {
    html2canvas(cardEl, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#09090b"
    }).then(canvas => {
      const a = document.createElement('a');
      a.download = `E-Tiket-${regId}.png`;
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }).catch(err => {
      console.error(err);
      downloadQRCode(cardId, regId);
    });
  } else {
    downloadQRCode(cardId, regId);
  }
};

window.printTicketCard = function(cardId) {
  const cardEl = document.getElementById(cardId);
  if (!cardEl) return;

  const printWindow = window.open('', '_blank', 'width=600,height=800');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cetak E-Tiket Resmi</title>
      <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
      <link rel="stylesheet" href="css/styles.css">
      <style>
        body {
          background: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
        }
        @media print {
          body { background: transparent; }
          .eticket-card { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      ${cardEl.outerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

window.downloadQRCode = function(containerId, regId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const qrImg = container.querySelector('img') || container.querySelector('canvas');
  if (!qrImg) return;

  let imgUrl = qrImg.src;
  if (qrImg.tagName.toLowerCase() === 'canvas') {
    imgUrl = qrImg.toDataURL("image/png");
  }

  const a = document.createElement('a');
  a.href = imgUrl;
  a.download = `E-Tiket-QR-${regId}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

