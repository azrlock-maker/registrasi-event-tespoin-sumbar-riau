/**
 * APP-PESERTA.JS - Logika Utama Portal Web Peserta (index.html)
 * Mengelola Form Pendaftaran 6 Field, Anti-Duplikasi, Generator QR Code,
 * Upload Transfer, Cek Status, dan Presensi Mandiri Scan Poster Venue.
 * 
 * ⚡ Developed & Crafted by: ReStore
 */

console.log("%c⚡ Event Registration System | Crafted & Developed by ReStore", "color: #38bdf8; font-size: 12px; font-weight: bold; background: #0f172a; padding: 4px 10px; border-radius: 4px;");

document.addEventListener('DOMContentLoaded', () => {
  initEventDetails();
  initTabNavigation();
  initRegistrationForm();
  initCopyAccount();
  initUploadForm();
  initCheckStatusForm();
  initSelfPresensiScanner();
});

// Mock Storage Helper (Untuk Uji Coba Lokal)
const LOCAL_DB_KEY = "EVENT_REGISTRATIONS_DB";

function getLocalData() {
  const data = localStorage.getItem(LOCAL_DB_KEY);
  if (data !== null) {
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
        localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(list));
      }
      return list;
    } catch (e) { return []; }
  }
  // Inisialisasi awal database kosong []
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify([]));
  return [];
}

function saveLocalData(dataArray) {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(dataArray));
}

// Helper Cek Status Penutupan Pendaftaran Berdasarkan Waktu / Setting Admin
function isRegistrationClosed(customInfo) {
  const mode = customInfo.deadlineMode || "unlimited";
  if (mode === "closed") return true;
  if (mode === "datetime" && customInfo.deadlineDateTime) {
    const deadlineMs = new Date(customInfo.deadlineDateTime).getTime();
    if (!isNaN(deadlineMs) && Date.now() > deadlineMs) {
      return true;
    }
  }
  return false;
}

// 1. Inisialisasi Info Event dari Config / Custom Admin Settings
function initEventDetails() {
  const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  const posterUrl = customInfo.posterUrl || CONFIG.EVENT_INFO.POSTER_URL;
  const name = customInfo.name || CONFIG.EVENT_INFO.NAME;
  const date = customInfo.date || CONFIG.EVENT_INFO.DATE;
  const venue = customInfo.venue || CONFIG.EVENT_INFO.VENUE;

  const posterImg = document.getElementById('poster-img');
  const eventName = document.getElementById('event-name');
  const siteTitleHeading = document.getElementById('site-title-heading');
  const eventDate = document.getElementById('event-date');
  const eventVenue = document.getElementById('event-venue');

  if (posterImg) posterImg.src = posterUrl;
  if (eventName) eventName.textContent = name;
  if (siteTitleHeading) siteTitleHeading.textContent = name;
  if (eventDate) eventDate.innerHTML = `<i class="ri-calendar-event-line"></i> ${date}`;
  if (eventVenue) eventVenue.innerHTML = `<i class="ri-map-pin-line"></i> ${venue}`;

  // Fill Dynamic Bank Info from Admin Settings / Config
  const paymentInfo = customInfo.paymentInfo || CONFIG.PAYMENT_INFO;
  const bankName = document.getElementById('bank-name');
  const accNum = document.getElementById('acc-number');
  const accHolder = document.getElementById('acc-holder');

  if (bankName) bankName.textContent = paymentInfo.bankName || CONFIG.PAYMENT_INFO.BANK_NAME;
  if (accNum) accNum.textContent = paymentInfo.accountNumber || CONFIG.PAYMENT_INFO.ACCOUNT_NUMBER;
  if (accHolder) accHolder.textContent = `a.n ${paymentInfo.accountHolder || CONFIG.PAYMENT_INFO.ACCOUNT_HOLDER}`;

  // Kontrol Tampil / Sembunyi Tab Presensi Mandiri dari Setting Admin (Support Boolean & String "false")
  const isSelfPresensiEnabled = !(
    customInfo.selfPresensiEnabled === false ||
    customInfo.selfPresensiEnabled === "false" ||
    customInfo.selfPresensiEnabled === 0 ||
    customInfo.selfPresensiEnabled === "0"
  );

  const selfPresensiBtn = document.getElementById('tab-btn-self-presensi') || document.querySelector('.tab-btn[data-tab="panel-self-presensi"]');
  const selfPresensiPanel = document.getElementById('panel-self-presensi');

  if (selfPresensiBtn) {
    if (isSelfPresensiEnabled) {
      selfPresensiBtn.style.display = '';
      selfPresensiBtn.classList.remove('d-none');
    } else {
      selfPresensiBtn.style.setProperty('display', 'none', 'important');
      selfPresensiBtn.classList.add('d-none');
      // Jika peserta sedang membuka tab presensi mandiri saat dinonaktifkan, alihkan ke form registrasi
      if (selfPresensiBtn.classList.contains('active')) {
        const regTabBtn = document.querySelector('.tab-btn[data-tab="panel-register"]');
        if (regTabBtn) regTabBtn.click();
      }
    }
  }

  if (selfPresensiPanel) {
    if (!isSelfPresensiEnabled) {
      selfPresensiPanel.classList.remove('active');
      selfPresensiPanel.style.setProperty('display', 'none', 'important');
    } else {
      selfPresensiPanel.style.display = '';
    }
  }

  // Handle Batas Waktu & Penutupan Akses Form Pendaftaran
  const closed = isRegistrationClosed(customInfo);
  const regForm = document.getElementById('registration-form');
  const regPanelHeader = document.querySelector('#panel-register .panel-header');
  const existingClosedBanner = document.getElementById('reg-closed-banner');

  if (closed) {
    const closedMsg = customInfo.closedMessage || "Pendaftaran event telah resmi ditutup. Terima kasih atas antusiasme dan partisipasi Anda!";
    
    if (!existingClosedBanner && regPanelHeader) {
      const banner = document.createElement('div');
      banner.id = "reg-closed-banner";
      banner.className = "glass-panel mt-2 animate-fadeIn";
      banner.style.cssText = "border-color: var(--accent-rose); background: rgba(244, 63, 94, 0.15); padding: 24px; text-align: center;";
      banner.innerHTML = `
        <div style="font-size: 2.8rem; color: var(--accent-rose); margin-bottom: 8px;">
          <i class="ri-forbid-2-line"></i>
        </div>
        <h2 style="color: #ffffff; font-size: 1.45rem; margin: 0;">PENDAFTARAN RESMI DITUTUP</h2>
        <p class="mt-1" style="color: #fecaca; font-size: 0.95rem; max-width: 580px; margin: 8px auto 0; line-height: 1.4;">
          ${closedMsg}
        </p>
        <div class="mt-3" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" onclick="document.querySelector('.tab-btn[data-tab=\\'panel-status\\']').click()">
            <i class="ri-search-eye-line"></i> Cek Status & E-Tiket Saya
          </button>
          <button type="button" class="btn btn-secondary" onclick="document.querySelector('.tab-btn[data-tab=\\'panel-upload\\']').click()">
            <i class="ri-upload-cloud-line"></i> Upload Bukti Transfer
          </button>
        </div>
      `;
      regPanelHeader.insertAdjacentElement('afterend', banner);
    }

    if (regForm) {
      regForm.style.display = 'none';
    }
  } else {
    if (existingClosedBanner) {
      existingClosedBanner.remove();
    }
    if (regForm) {
      regForm.style.display = '';
    }
  }
}

// Sinkronisasi Real-time saat Admin mengubah setting di tab/jendela lain
window.addEventListener('storage', (e) => {
  if (e.key === 'CUSTOM_EVENT_INFO') {
    initEventDetails();
  }
});

// 2. Tab Navigation Switcher
function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

// 3. Copy No Rekening Bank
function initCopyAccount() {
  const btnCopy = document.getElementById('btn-copy-acc');
  if (!btnCopy) return;

  btnCopy.addEventListener('click', () => {
    const accNumEl = document.getElementById('acc-number');
    const accNum = accNumEl ? accNumEl.textContent.trim() : CONFIG.PAYMENT_INFO.ACCOUNT_NUMBER;
    navigator.clipboard.writeText(accNum).then(() => {
      const origText = btnCopy.innerHTML;
      btnCopy.innerHTML = `<i class="ri-check-line"></i> Tersalin!`;
      btnCopy.classList.replace('btn-secondary', 'btn-emerald');
      setTimeout(() => {
        btnCopy.innerHTML = origText;
        btnCopy.classList.replace('btn-emerald', 'btn-secondary');
      }, 2000);
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

// 4. Form Registrasi 6 Field & Generator QR Code
function initRegistrationForm() {
  const form = document.getElementById('registration-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nama = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const noWa = document.getElementById('reg-nowa').value.trim();
    const namaToko = document.getElementById('reg-toko').value.trim();
    const domisili = document.getElementById('reg-domisili').value.trim();
    const ukuranBaju = document.getElementById('reg-baju').value;

    if (!nama || !email || !noWa || !namaToko || !domisili || !ukuranBaju) {
      alert("Mohon lengkapi seluruh field pendaftaran!");
      return;
    }

    // Cek Batas Waktu Pendaftaran
    const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
    if (isRegistrationClosed(customInfo)) {
      alert("Mohon maaf, pendaftaran event saat ini telah resmi ditutup.");
      initEventDetails();
      return;
    }

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Memproses Pendaftaran...`;

    // Cek Anti-Duplikasi
    const isDuplicate = await checkDuplicateRegistration(email, noWa);
    if (isDuplicate.exists) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="ri-send-plane-fill"></i> Daftar Sekarang & Terbitkan E-Tiket`;
      showDuplicateAlert(isDuplicate.existingData);
      return;
    }

    // Ambil Info Event untuk Prefix Tiket
    const currentEventName = customInfo.name || CONFIG.EVENT_INFO.NAME;
    const localData = getLocalData();

    // Buat No Peserta (TP-001) dan Kode Tiket Berbeda (CGC26-UNQC9Y)
    const newRegId = generateParticipantRegId(localData);
    const newTicketCode = generateUniqueTicketCode(currentEventName);

    const newRecord = {
      timestamp: new Date().toLocaleString('id-ID'),
      regId: newRegId,
      ticketCode: newTicketCode,
      nama,
      email,
      noWa,
      namaToko,
      domisili,
      ukuranBaju,
      statusTransfer: "Belum Upload",
      urlBukti: "-",
      statusBayar: "BELUM LUNAS",
      statusHadir: "BELUM HADIR"
    };

    if (CONFIG.USE_MOCK_DATA) {
      // Simpan ke LocalStorage Mock
      localData.unshift(newRecord);
      saveLocalData(localData);
      renderTicketSuccess(newRecord, 'reg-result-container');
      form.reset();
    } else {
      // Send API ke Google Apps Script (Mendukung URL Dinamis dari Admin)
      const targetGasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;
      try {
        const response = await fetch(targetGasUrl, {
          method: "POST",
          body: JSON.stringify({ 
            action: "register", 
            data: newRecord,
            adminEmail: customInfo.adminEmail || ""
          })
        });
        const resJson = await response.json();
        if (resJson.status === "success") {
          renderTicketSuccess(resJson.data || newRecord, 'reg-result-container');
          form.reset();
        } else {
          alert("Gagal melakukan pendaftaran: " + resJson.message);
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan jaringan saat mengirim pendaftaran.");
      }
    }

    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<i class="ri-send-plane-fill"></i> Daftar Sekarang & Terbitkan E-Tiket`;
  });
}

// Check Anti-Duplikasi Function (Fleksibel dengan/tanpa 62 pada No WA)
async function checkDuplicateRegistration(email, noWa) {
  if (CONFIG.USE_MOCK_DATA) {
    const data = getLocalData();
    const found = data.find(item => 
      (item.email && item.email.toLowerCase() === email.toLowerCase()) || 
      (item.noWa && isPhoneMatch(item.noWa, noWa))
    );
    return { exists: !!found, existingData: found };
  } else {
    const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
    const targetGasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;
    try {
      const url = `${targetGasUrl}?action=checkDuplicate&email=${encodeURIComponent(email)}&noWa=${encodeURIComponent(noWa)}`;
      const resp = await fetch(url);
      const json = await resp.json();
      return { exists: json.exists, existingData: json.data };
    } catch (e) {
      return { exists: false };
    }
  }
}

// Display Duplicate Alert
function showDuplicateAlert(existing) {
  const resultContainer = document.getElementById('reg-result-container');
  if (!resultContainer) return;

  resultContainer.innerHTML = `
    <div class="glass-panel mt-3" style="border-color: var(--accent-amber); background: rgba(245, 158, 11, 0.1);">
      <div class="panel-title" style="color: var(--accent-amber);">
        <i class="ri-error-warning-fill"></i> Data Sudah Terdaftar!
      </div>
      <p class="mt-1" style="color: #cbd5e1;">
        Email <strong>${existing.email}</strong> atau No WhatsApp <strong>${existing.noWa}</strong> telah terdaftar sebelumnya atas nama <strong>${existing.nama}</strong>.
      </p>
      <div class="mt-2">
        <span class="badge badge-warning">NO PESERTA: ${existing.regId} | TIKET: ${existing.ticketCode || existing.regId}</span>
      </div>
      <div class="mt-3">
        <button class="btn btn-emerald" onclick="showExistingTicket('${existing.regId}')">
          <i class="ri-qr-code-line"></i> Tampilkan Barcode QR Tiket Saya
        </button>
      </div>
    </div>
  `;
  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

window.showExistingTicket = function(regId) {
  const data = getLocalData();
  const found = data.find(i => i.regId === regId || i.ticketCode === regId);
  if (found) {
    renderTicketSuccess(found, 'reg-result-container');
  }
};

// Render E-Ticket Pass & Generate QR Code (Sesuai Desain E-Tiket Resmi Crimson-Dark)
function renderTicketSuccess(record, targetContainerId = 'reg-result-container') {
  const resultContainer = document.getElementById(targetContainerId);
  if (!resultContainer) return;

  const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  const eventName = customInfo.name || CONFIG.EVENT_INFO.NAME;
  const eventDate = customInfo.date || CONFIG.EVENT_INFO.DATE;
  const eventVenue = customInfo.venue || CONFIG.EVENT_INFO.VENUE;

  // Pastikan No Peserta dan No Tiket berbeda dan bersifat permanen (tidak berubah-ubah)
  let displayTicketCode = record.ticketCode;
  if (!displayTicketCode) {
    displayTicketCode = generateUniqueTicketCode(eventName);
    record.ticketCode = displayTicketCode;
    // Simpan permanen ke database
    const localData = getLocalData();
    const existing = localData.find(i => i.regId === record.regId);
    if (existing) {
      existing.ticketCode = displayTicketCode;
      saveLocalData(localData);
    }
  }
  const displayRegId = record.regId || "TP-001";

  const isLunas = record.statusBayar === 'LUNAS';
  const statusBadgeText = isLunas ? 'LUNAS' : (record.statusBayar || 'BELUM LUNAS');
  const statusBadgeClass = isLunas ? 'lunas' : 'pending';
  const statusIcon = isLunas ? 'ri-shield-check-fill' : 'ri-time-line';

  const qrPayload = JSON.stringify({
    ticketCode: displayTicketCode,
    regId: displayRegId,
    nama: record.nama,
    noWa: record.noWa,
    ukuranBaju: record.ukuranBaju
  });

  const canvasId = "qrcode-canvas-" + Math.floor(10000 + Math.random() * 90000);
  const cardId = "eticket-card-" + Math.floor(10000 + Math.random() * 90000);

  resultContainer.innerHTML = `
    <div class="eticket-wrapper">
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
            <span class="eticket-val">${record.nama}</span>
          </div>
          <div class="eticket-row">
            <span class="eticket-label">Ukuran Baju</span>
            <span class="eticket-val" style="color: #f43f5e; font-weight: 800;">${record.ukuranBaju || '-'}</span>
          </div>
          <div class="eticket-row">
            <span class="eticket-label">WhatsApp</span>
            <span class="eticket-val">${record.noWa}</span>
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
        <button class="btn btn-primary" onclick="downloadFullTicketCard('${cardId}', '${record.regId}')">
          <i class="ri-download-2-line"></i> Download Gambar E-Tiket
        </button>
        <button class="btn btn-secondary" onclick="printTicketCard('${cardId}')">
          <i class="ri-printer-line"></i> Cetak E-Tiket
        </button>
        ${!isLunas ? `
          <button class="btn btn-emerald" onclick="switchTabToUpload('${record.regId}')">
            <i class="ri-upload-cloud-2-line"></i> Upload Bukti Transfer
          </button>
        ` : ''}
      </div>
    </div>
  `;

  // Generate QR Code dengan fallback ganda (qrcode.js -> qrserver API)
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
          // Pastikan hanya 1 QR code yang ditampilkan (sembunyikan elemen img cadangan qrcodejs)
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

  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

window.renderTicketSuccess = renderTicketSuccess;

// Download Card E-Tiket Utuh sebagai Gambar PNG (Resolusi HD)
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

// Cetak E-Tiket via Dialog Print Browser
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

window.switchTabToUpload = function(regId) {
  const tabBtn = document.querySelector('.tab-btn[data-tab="panel-upload"]');
  if (tabBtn) tabBtn.click();

  const searchInput = document.getElementById('upload-search-id');
  if (searchInput) {
    searchInput.value = regId;
    searchInput.focus();
  }
};

// 5. Upload Bukti Transfer
function initUploadForm() {
  const form = document.getElementById('upload-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const regId = document.getElementById('upload-search-id').value.trim();
    const fileInput = document.getElementById('upload-file');

    if (!regId || !fileInput.files || fileInput.files.length === 0) {
      alert("Masukkan ID Registrasi / No. WA / Kode Tiket dan pilih foto bukti transfer!");
      return;
    }

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Mengunggah Struk...`;

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(event) {
      const base64Data = event.target.result;

      if (CONFIG.USE_MOCK_DATA) {
        const localData = getLocalData();
        const item = findParticipantByQuery(localData, regId);
        
        if (item) {
          item.statusTransfer = "Menunggu Verifikasi";
          item.statusBayar = "MENUNGGU VERIFIKASI";
          item.urlBukti = base64Data;
          saveLocalData(localData);

          showUploadSuccessMessage(item);
          form.reset();
        } else {
          alert("ID Registrasi / Nomor WA / Kode Tiket tidak ditemukan. Mohon periksa kembali!");
        }
      } else {
        // Send to GAS (Mendukung Konfigurasi Dinamis dari Admin)
        const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
        const targetGasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;
        try {
          const resp = await fetch(targetGasUrl, {
            method: "POST",
            body: JSON.stringify({
              action: "uploadTransfer",
              regId: regId,
              fileData: base64Data,
              fileName: file.name,
              adminEmail: customInfo.adminEmail || "",
              driveFolder: customInfo.driveFolder || ""
            })
          });
          const json = await resp.json();
          if (json.status === "success") {
            showUploadSuccessMessage(json.data);
            form.reset();
          } else {
            alert("Gagal mengunggah bukti: " + json.message);
          }
        } catch (err) {
          console.error(err);
          alert("Terjadi kesalahan koneksi saat upload.");
        }
      }

      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="ri-upload-cloud-line"></i> Unggah Bukti Transfer`;
    };

    reader.readAsDataURL(file);
  });
}

function showUploadSuccessMessage(item) {
  const container = document.getElementById('upload-result-container');
  if (!container) return;

  container.innerHTML = `
    <div class="glass-panel mt-3" style="border-color: var(--accent-emerald);">
      <div class="panel-title" style="color: var(--accent-emerald);">
        <i class="ri-checkbox-circle-line"></i> Bukti Transfer Berhasil Diunggah!
      </div>
      <p class="mt-1" style="color: #cbd5e1;">
        Bukti transfer untuk <strong>${item.nama}</strong> (${item.regId}) telah diterima.
      </p>
      <div class="mt-2">
        <span class="badge badge-warning">Status: Menunggu Verifikasi Panitia</span>
      </div>
    </div>
  `;
}

// 6. Cek Status Pendaftaran (Mendukung Cari via No WA 08xx, 628xx, 8xx, No Peserta, Kode Tiket)
function initCheckStatusForm() {
  const form = document.getElementById('check-status-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const query = document.getElementById('status-query').value.trim();
    if (!query) return;

    const data = getLocalData();
    const found = findParticipantByQuery(data, query);

    const resultDiv = document.getElementById('status-result-container');
    if (!resultDiv) return;

    if (found) {
      let badgeBayarClass = "badge-warning";
      if (found.statusBayar === "LUNAS") badgeBayarClass = "badge-success";
      if (found.statusBayar === "DITOLAK") badgeBayarClass = "badge-danger";

      resultDiv.innerHTML = `
        <div class="glass-panel mt-3">
          <div class="panel-header">
            <h3 class="panel-title" style="color:var(--accent-cyan); font-size:1.15rem;">
              <i class="ri-user-search-line"></i> Hasil Pencarian: ${found.nama}
            </h3>
          </div>
          <div class="ticket-info-grid mt-2">
            <div><strong>No. Peserta:</strong> <span style="color:var(--accent-rose); font-weight:bold;">${found.regId}</span></div>
            <div><strong>Kode Tiket:</strong> <span style="color:var(--accent-cyan); font-weight:bold;">${found.ticketCode || '-'}</span></div>
            <div><strong>Nama Peserta:</strong> ${found.nama}</div>
            <div><strong>Nama Toko:</strong> ${found.namaToko}</div>
            <div><strong>Domisili:</strong> ${found.domisili}</div>
            <div><strong>Ukuran Baju:</strong> <strong style="color:var(--accent-rose);">${found.ukuranBaju}</strong></div>
            <div><strong>No WhatsApp:</strong> ${found.noWa}</div>
            <div><strong>Status Bayar:</strong> <span class="badge ${badgeBayarClass}">${found.statusBayar}</span></div>
            <div><strong>Status Presensi:</strong> <span class="badge ${found.statusHadir.includes('HADIR') ? 'badge-success' : 'badge-danger'}">${found.statusHadir}</span></div>
          </div>
          <div class="mt-3">
            <button class="btn btn-primary" onclick="renderTicketSuccess(${JSON.stringify(found).replace(/"/g, '&quot;')}, 'status-ticket-card-wrapper')">
              <i class="ri-qr-code-line"></i> Tampilkan Barcode QR Tiket
            </button>
          </div>
          <div id="status-ticket-card-wrapper"></div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="glass-panel mt-3" style="border-color: var(--accent-rose);">
          <div class="panel-title" style="color: var(--accent-rose);">
            <i class="ri-error-warning-line"></i> Data Tidak Ditemukan
          </div>
          <p class="mt-1" style="color:#cbd5e1;">Tidak ditemukan pendaftaran dengan No. WA / ID / Kode <strong>${query}</strong>. Mohon periksa kembali.</p>
        </div>
      `;
    }
  });
}

// 7. Presensi Mandiri (Peserta Scan Poster Venue)
let html5QrcodeScannerSelf = null;

function initSelfPresensiScanner() {
  const btnStart = document.getElementById('btn-start-self-scanner');
  if (!btnStart) return;

  btnStart.addEventListener('click', () => {
    const regInput = document.getElementById('self-scan-reg-id').value.trim();
    if (!regInput) {
      alert("Masukkan No. Peserta / Kode Tiket / No WA Anda terlebih dahulu!");
      return;
    }

    const scannerContainer = document.getElementById('self-scanner-wrapper');
    scannerContainer.classList.remove('d-none');

    if (html5QrcodeScannerSelf) {
      html5QrcodeScannerSelf.clear();
    }

    html5QrcodeScannerSelf = new Html5QrcodeScanner("self-reader", { fps: 10, qrbox: 250 });
    html5QrcodeScannerSelf.render((decodedText, decodedResult) => {
      // Scanned QR Poster Venue
      html5QrcodeScannerSelf.clear();
      processSelfPresensi(regInput, decodedText);
    }, (error) => {
      // Scan failure silent
    });
  });
}

function processSelfPresensi(userQuery, qrDecoded) {
  const localData = getLocalData();
  const item = findParticipantByQuery(localData, userQuery);

  const resultContainer = document.getElementById('self-scan-result');
  if (!resultContainer) return;

  if (!item) {
    resultContainer.innerHTML = `
      <div class="glass-panel mt-3 animate-fadeIn" style="border-color: var(--accent-rose); background: rgba(244, 63, 94, 0.12); padding: 22px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <i class="ri-error-warning-fill" style="font-size: 2rem; color: var(--accent-rose);"></i>
          <div>
            <h4 style="color: var(--accent-rose); margin: 0; font-size: 1.15rem;">Data Peserta Tidak Ditemukan!</h4>
            <p class="mt-1" style="color: #cbd5e1; font-size: 0.9rem; margin: 4px 0 0 0;">
              Nomor WA / No. Peserta / Kode Tiket <strong>${String(userQuery).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong> tidak terdaftar di sistem.
            </p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (item.statusBayar !== "LUNAS") {
    resultContainer.innerHTML = `
      <div class="glass-panel mt-2" style="border-color: var(--accent-rose);">
        <h4 style="color: var(--accent-rose);"><i class="ri-error-warning-line"></i> Presensi Gagal - Pembayaran Belum Lunas</h4>
        <p>Status pembayaran Anda saat ini: <strong>${item.statusBayar}</strong>. Silakan selesaikan pembayaran atau menuju ke Meja Registrasi Panitia.</p>
      </div>
    `;
    return;
  }

  // Update status ke HADIR
  const jamNow = new Date().toLocaleString('id-ID');
  item.statusHadir = `HADIR (${jamNow})`;
  saveLocalData(localData);

  resultContainer.innerHTML = `
    <div class="ticket-card animate-fadeIn" style="border-color: var(--accent-emerald);">
      <div class="brand-badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">
        <i class="ri-checkbox-circle-fill"></i> PRESENSI MANDIRI BERHASIL!
      </div>
      <h3 class="mt-1" style="color: #fff;">SELAMAT DATANG ATAS NAMA ${item.nama.toUpperCase()}</h3>
      
      <div class="mt-2">
        <span class="merch-size-badge">👕 UKURAN BAJU: ${item.ukuranBaju}</span>
      </div>

      <div class="ticket-info-grid mt-2">
        <div><strong>No Registrasi:</strong> ${item.regId}</div>
        <div><strong>Nama Toko:</strong> ${item.namaToko}</div>
        <div><strong>Domisili:</strong> ${item.domisili}</div>
        <div><strong>Waktu Presensi:</strong> ${jamNow}</div>
      </div>
      <p class="mt-2" style="color: #cbd5e1; font-size: 0.9rem;">
        Silakan tunjukkan layar ini ke Meja Souvenir untuk mengambil Kaos Ukuran <strong>${item.ukuranBaju}</strong> & Tiket Fisik No <strong>${item.regId}</strong>.
      </p>
    </div>
  `;
}
