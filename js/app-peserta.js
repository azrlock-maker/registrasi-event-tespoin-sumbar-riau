/**
 * APP-PESERTA.JS - Logika Utama Portal Web Peserta (index.html)
 * Mengelola Form Pendaftaran 6 Field, Anti-Duplikasi, Generator QR Code,
 * Upload Transfer, Cek Status, dan Presensi Mandiri Scan Poster Venue.
 * 
 * ⚡ Developed & Crafted by: ReStore
 */

console.log("%c⚡ Event Registration System | Crafted & Developed by radh29", "color: #38bdf8; font-size: 12px; font-weight: bold; background: #0f172a; padding: 4px 10px; border-radius: 4px;");

document.addEventListener('DOMContentLoaded', () => {
  initTabNavigation();
  initRegistrationForm();
  initCopyAccount();
  initUploadForm();
  initCheckStatusForm();
  // Parallel: init event details + load event list
  Promise.all([
    Promise.resolve(initEventDetails()),
    loadPesertaEvents()
  ]);
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
  currentParentEventId = customInfo.parentId || "";
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

// Helper Parse Tanggal Deadline Universal (Kompatibel dengan semua browser: Chrome, Safari iOS, Edge, Firefox)
function parseDeadlineDate(dateStr) {
  if (!dateStr) return null;
  let s = String(dateStr).trim();
  if (s.includes('T')) {
    const parts = s.split('T');
    const timeParts = parts[1].split(':');
    if (timeParts.length === 2) {
      s = parts[0] + 'T' + parts[1] + ':00';
    }
  }
  let d = new Date(s);
  if (isNaN(d.getTime())) {
    d = new Date(s.replace(/-/g, '/').replace('T', ' '));
  }
  return isNaN(d.getTime()) ? null : d.getTime();
}

// Helper Cek Status Penutupan Pendaftaran Berdasarkan Waktu / Setting Admin
function isRegistrationClosed(customInfo) {
  if (!customInfo) return false;
  const mode = customInfo.deadlineMode || "unlimited";
  if (mode === "closed") return true;
  if (mode === "datetime" && customInfo.deadlineDateTime) {
    const deadlineMs = parseDeadlineDate(customInfo.deadlineDateTime);
    if (deadlineMs !== null && Date.now() > deadlineMs) {
      return true;
    }
  }
  return false;
}

// 1. Inisialisasi Info Event dari Config / Custom Admin Settings
// Urutan prioritas: GAS Cloud > localStorage cache > CONFIG default
// Global: parent event id (jika event saat ini adalah sub-event)
let currentParentEventId = "";

// Helper: ambil eventId dari URL (?event=EVTxxx) atau localStorage
function getCurrentEventId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('event');
  if (fromUrl) {
    localStorage.setItem('CURRENT_EVENT_ID', fromUrl);
    return fromUrl;
  }
  return localStorage.getItem('CURRENT_EVENT_ID') || "";
}

async function loadPesertaEvents() {
  const searchInput = document.getElementById('peserta-event-search');
  const dropdown = document.getElementById('peserta-event-dropdown');
  const cardsContainer = document.getElementById('peserta-event-cards');
  const hasEventParam = new URLSearchParams(window.location.search).has('event');

  const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  currentParentEventId = customInfo.parentId || "";
  const gasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;

  let allEvents = [];
  if (cardsContainer && !hasEventParam) {
    cardsContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:24px; color:var(--text-muted);"><i class="ri-loader-4-line ri-spin" style="font-size:1.5rem;"></i><p style="margin-top:8px;">Memuat event...</p></div>';
  }
  try {
    const resp = await fetch(gasUrl + '?action=getPublicEvents&t=' + Date.now(), { redirect: 'follow' });
    const json = await resp.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      // Filter: hanya tampilkan event aktif (fallback jika GAS lama)
      allEvents = json.data.filter(ev => ev.active !== false && String(ev.active).toLowerCase() !== 'false');
      if (allEvents.length === 0) allEvents = json.data; // fallback: tampilkan semua jika tidak ada active
    }
  } catch (e) {
    console.warn('[loadPesertaEvents]', e);
  }

  // Render dropdown items (filtered by search)
  function renderDropdown(filter) {
    if (!dropdown) return;
    const q = (filter || '').toLowerCase().trim();
    const filtered = q ? allEvents.filter(ev => ev.name.toLowerCase().includes(q)) : allEvents;
    dropdown.innerHTML = '';
    if (filtered.length === 0) {
      dropdown.innerHTML = '<div style="padding:10px 14px; color:var(--text-muted); font-size:0.9rem;">Tidak ada event ditemukan</div>';
      dropdown.style.display = 'block';
      return;
    }
    filtered.forEach(ev => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px 14px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.06);';
      const prefix = ev.parentId ? '\u21B3 ' : '';
      item.innerHTML = '<div style="font-weight:600; color:#fff;">' + escapeHtml(prefix + ev.name) + '</div><div style="font-size:0.8rem; color:var(--text-muted);">' + escapeHtml(formatEventDate(ev.date) || '') + ' ' + escapeHtml(ev.venue || '') + '</div>';
      item.addEventListener('click', () => {
        searchInput.value = '';
        dropdown.style.display = 'none';
        localStorage.setItem('CURRENT_EVENT_ID', ev.eventId);
        const url = new URL(window.location.href);
        url.searchParams.set('event', ev.eventId);
        window.location.href = url.toString();
      });
      dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
  }

  if (searchInput && dropdown) {
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim() === '') {
        dropdown.style.display = 'none';
      } else {
        renderDropdown(searchInput.value);
      }
    });
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim() !== '') {
        renderDropdown(searchInput.value);
      }
    });
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
    // Default: kosong (tidak tampil nama event)
  }

  // Render event cards (only if no event selected)
  if (cardsContainer) {
    if (hasEventParam) {
      cardsContainer.style.display = 'none';
        const listHeader = document.getElementById('peserta-event-list-header');
        if (listHeader) listHeader.style.display = 'none';
      const searchInput = document.getElementById('peserta-event-search');
      if (searchInput && searchInput.parentElement) searchInput.parentElement.style.display = 'none';
      const backDiv = document.getElementById('peserta-back-to-list');
      if (backDiv) backDiv.style.display = '';
    } else {
      cardsContainer.style.display = '';
        const listHeader2 = document.getElementById('peserta-event-list-header');
        if (listHeader2) listHeader2.style.display = '';
      const searchInput = document.getElementById('peserta-event-search');
      if (searchInput && searchInput.parentElement) searchInput.parentElement.style.display = '';
      const backDiv = document.getElementById('peserta-back-to-list');
      if (backDiv) backDiv.style.display = 'none';
      cardsContainer.innerHTML = '';
      allEvents.forEach(ev => {
        const card = document.createElement('div');
        card.className = 'glass-panel';
        card.style.cssText = 'padding:14px; cursor:pointer; transition:transform 0.2s;';
        const prefix = ev.parentId ? '\u21B3 ' : '';
        card.innerHTML = '<div style="font-weight:700; color:#fff; margin-bottom:4px;">' + escapeHtml(prefix + ev.name) + '</div><div style="font-size:0.85rem; color:var(--text-muted);">' + escapeHtml(formatEventDate(ev.date) || '') + '</div><div style="font-size:0.85rem; color:var(--text-muted);">' + escapeHtml(ev.venue || '') + '</div>';
        card.addEventListener('click', () => {
          localStorage.setItem('CURRENT_EVENT_ID', ev.eventId);
          const url = new URL(window.location.href);
          url.searchParams.set('event', ev.eventId);
          window.location.href = url.toString();
        });
        cardsContainer.appendChild(card);
      });
    }
  }
}

function initEventDetails() {
  // Langkah 1: Tampilkan dari localStorage/CONFIG dulu (instant, tidak ada loading)
  applyEventDetailsToUI();

  // Langkah 2: Fetch setting terbaru dari GAS cloud (agar sinkron dengan setting admin)
  const customInfoLocal = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  const targetGasUrl = customInfoLocal.gasApiUrl || CONFIG.GAS_API_URL;

  if (!CONFIG.USE_MOCK_DATA && targetGasUrl) {
    // Cache buster (?t=...) agar GAS tidak mengembalikan respons lama yang ter-cache
    const cacheBuster = Date.now();
    const eid = getCurrentEventId();
    const eidParam = eid ? `&eventId=${encodeURIComponent(eid)}` : "";
    fetch(`${targetGasUrl}?action=getSettings${eidParam}&t=${cacheBuster}`, {
      method: 'GET',
      redirect: 'follow'  // GAS selalu redirect sebelum merespons — wajib follow
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text(); // Baca sebagai teks dulu (lebih aman dari GAS redirect)
      })
      .then(text => {
        const json = JSON.parse(text);
        console.log('[GAS getSettings]', json);
        if (json.status === 'success' && json.settings) {
          const cloudSettings = json.settings;
          // Pertahankan posterUrl base64 dari localStorage jika cloud tidak punya
          if (!cloudSettings.posterUrl && customInfoLocal.posterUrl) {
            cloudSettings.posterUrl = customInfoLocal.posterUrl;
          }
          localStorage.setItem('CUSTOM_EVENT_INFO', JSON.stringify(cloudSettings));
          applyEventDetailsToUI();
        } else {
          console.warn('[GAS getSettings] Tidak ada setting di cloud atau status error:', json);
        }
      })
      .catch(err => {
        // GAS tidak bisa diakses (offline / URL salah) → tetap pakai cache lokal / CONFIG
        console.warn('[GAS getSettings] Fetch gagal, fallback ke lokal:', err);
      });
  }
}

// Fungsi internal: Terapkan setting event ke seluruh elemen UI
function applyEventDetailsToUI() {
  const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  currentParentEventId = customInfo.parentId || "";
  const hasEventParam = new URLSearchParams(window.location.search).has('event');
  const posterUrl = convertDriveLink(customInfo.posterUrl) || CONFIG.EVENT_INFO.POSTER_URL;
  // Jika belum memilih event, gunakan judul generik (bukan nama event terakhir)
  const name = hasEventParam ? (customInfo.name || CONFIG.EVENT_INFO.NAME) : "";
  const date = customInfo.date || CONFIG.EVENT_INFO.DATE;
  const venue = customInfo.venue || CONFIG.EVENT_INFO.VENUE;

  const posterImg = document.getElementById('poster-img');
  const eventName = document.getElementById('event-name');
  const siteTitleHeading = document.getElementById('site-title-heading');
  const eventDate = document.getElementById('event-date');
  const eventVenue = document.getElementById('event-venue');

  if (posterImg) posterImg.src = posterUrl;
  if (eventName) { eventName.textContent = name; eventName.style.display = name ? '' : 'none'; }
  if (siteTitleHeading) { siteTitleHeading.textContent = name; siteTitleHeading.style.display = name ? '' : 'none'; }
  if (eventDate) eventDate.innerHTML = `<i class="ri-calendar-event-line"></i> ${formatEventDate(date)}`;
  if (eventVenue) eventVenue.innerHTML = `<i class="ri-map-pin-line"></i> ${venue}`;

  // Fill Dynamic Bank Info from Admin Settings / Config
  const paymentInfo = customInfo.paymentInfo || CONFIG.PAYMENT_INFO;
  const bankName = document.getElementById('bank-name');
  const accNum = document.getElementById('acc-number');
  const accHolder = document.getElementById('acc-holder');

  if (bankName) bankName.textContent = paymentInfo.bankName || CONFIG.PAYMENT_INFO.BANK_NAME;
  if (accNum) accNum.textContent = paymentInfo.accountNumber || CONFIG.PAYMENT_INFO.ACCOUNT_NUMBER;
  if (accHolder) accHolder.textContent = `a.n ${paymentInfo.accountHolder || CONFIG.PAYMENT_INFO.ACCOUNT_HOLDER}`;

  // Jika event non-aktif, tampilkan pesan dan sembunyikan form
  const isActive = customInfo.active !== false; // default true jika tidak ada
  const inactiveBanner = document.getElementById('event-inactive-banner');
  if (inactiveBanner) {
    inactiveBanner.style.display = isActive ? 'none' : '';
  }
  const regForm = document.getElementById('registration-form');
  if (regForm) {
    regForm.style.display = isActive ? '' : 'none';
  }

  // Toggle field form peserta berdasarkan pengaturan event (participantFields)
  const pf = customInfo.participantFields || {};

  // Toggle tab Upload Transfer
  const showUpload = pf.showUploadTab !== false;
  const uploadTabBtn = document.querySelector('.tab-btn[data-tab="panel-upload"]');
  const uploadPanel = document.getElementById('panel-upload');
  if (uploadTabBtn) uploadTabBtn.style.display = showUpload ? '' : 'none';
  if (uploadPanel && !showUpload) uploadPanel.classList.remove('active');
  const fieldMap = {
    'reg-email': pf.email !== false,
    'reg-nowa': pf.noWa !== false,
    'reg-toko': pf.namaToko !== false,
    'reg-domisili': pf.domisili !== false,
    'reg-baju': pf.ukuranBaju !== false
  };
  Object.keys(fieldMap).forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      const group = input.closest('.form-group');
      if (group) {
        group.style.display = fieldMap[id] ? '' : 'none';
      }
      // set required attribute
      if (fieldMap[id]) input.setAttribute('required', 'required');
      else input.removeAttribute('required');
    }
  });

  // Tampilkan poster & konten utama hanya jika event sudah dipilih
  const heroCard = document.querySelector('.hero-poster-card');
  if (heroCard) {
    heroCard.style.display = hasEventParam ? '' : 'none';
  }
  const mainContent = document.getElementById('peserta-main-content');
  if (mainContent) {
    mainContent.style.display = hasEventParam ? '' : 'none';
  }

  // Handle Batas Waktu & Penutupan Akses Form Pendaftaran
  const closed = isRegistrationClosed(customInfo);
  const regForm2 = document.getElementById('registration-form');
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

    if (regForm2) {
      regForm2.style.display = 'none';
    }
  } else {
    if (existingClosedBanner) {
      existingClosedBanner.remove();
    }
    if (regForm2) {
      regForm2.style.display = '';
    }
  }
}

// Sinkronisasi Real-time saat Admin mengubah setting di tab/jendela lain (same browser)
window.addEventListener('storage', (e) => {
  if (e.key === 'CUSTOM_EVENT_INFO') {
    applyEventDetailsToUI();
  }
});

// 2. Tab Navigation Switcher
function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.setAttribute('role', 'tab');
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

// (Helper normalizePhone, isPhoneMatch, findParticipantByQuery, generateUniqueTicketCode,
//  generateParticipantRegId kini di js/utils.js)

// 4. Form Registrasi 6 Field & Generator QR Code
function initRegistrationForm() {
  const form = document.getElementById('registration-form');
  if (!form) return;

  // Auto-fill dari event induk untuk sub-event (saat email/WA diisi)
  async function tryAutoFillFromParent() {
    if (!currentParentEventId) return;
    const email = document.getElementById('reg-email').value.trim();
    const noWa = document.getElementById('reg-nowa').value.trim();
    if (!email && !noWa) return;
    const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
    const gasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;
    try {
      const resp = await fetch(`${gasUrl}?action=checkDuplicate&email=${encodeURIComponent(email)}&noWa=${encodeURIComponent(noWa)}&eventId=${encodeURIComponent(currentParentEventId)}&t=${Date.now()}`, { redirect: 'follow' });
      const json = await resp.json();
      if (json.exists && json.data) {
        const found = json.data;
        const namaEl = document.getElementById('reg-nama');
        const tokoEl = document.getElementById('reg-toko');
        const domEl = document.getElementById('reg-domisili');
        const bajuEl = document.getElementById('reg-baju');
        if (namaEl && !namaEl.value) namaEl.value = found.nama || '';
        if (tokoEl && !tokoEl.value) tokoEl.value = found.namaToko || '';
        if (domEl && !domEl.value) domEl.value = found.domisili || '';
        if (bajuEl && !bajuEl.value) bajuEl.value = found.ukuranBaju || '';
        showToast("Data dari event utama ditemukan & diisi otomatis.", "success");
      }
    } catch (e) { console.warn("[auto-fill]", e); }
  }
  const emailEl = document.getElementById('reg-email');
  const noWaEl = document.getElementById('reg-nowa');
  if (emailEl) emailEl.addEventListener('blur', tryAutoFillFromParent);
  if (noWaEl) noWaEl.addEventListener('blur', tryAutoFillFromParent);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let nama = document.getElementById('reg-nama').value.trim();
    let email = document.getElementById('reg-email').value.trim();
    let noWa = document.getElementById('reg-nowa').value.trim();
    let namaToko = document.getElementById('reg-toko').value.trim();
    let domisili = document.getElementById('reg-domisili').value.trim();
    let ukuranBaju = document.getElementById('reg-baju').value;

    const customInfoReg = JSON.parse(localStorage.getItem("CUSTOM_EVENT_INFO") || "{}");
    const pf = customInfoReg.participantFields || {};
    const emailRequired = pf.email !== false;
    const noWaRequired = pf.noWa !== false;
    const tokoRequired = pf.namaToko !== false;
    const domisiliRequired = pf.domisili !== false;
    const bajuRequired = pf.ukuranBaju !== false;

    if (!nama) { showToast("Mohon isi Nama Lengkap!", "warning"); return; }
    if (emailRequired && !email) { showToast("Mohon isi Alamat Email!", "warning"); return; }
    if (email && !isValidEmail(email)) { showToast("Format email tidak valid. Contoh: nama@gmail.com", "error"); return; }
    if (noWaRequired && !noWa) { showToast("Mohon isi No. WhatsApp / HP!", "warning"); return; }
    if (noWa && !isValidPhone(noWa)) { showToast("Nomor WhatsApp tidak valid. Gunakan 10-13 digit (contoh: 081234567890).", "error"); return; }
    if (tokoRequired && !namaToko) { showToast("Mohon isi Nama Toko!", "warning"); return; }
    if (domisiliRequired && !domisili) { showToast("Mohon isi Domisili!", "warning"); return; }
    if (bajuRequired && !ukuranBaju) { showToast("Mohon pilih Ukuran Baju!", "warning"); return; }

    // Cek Batas Waktu Pendaftaran
    const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  currentParentEventId = customInfo.parentId || "";
    if (isRegistrationClosed(customInfo)) {
      showToast("Mohon maaf, pendaftaran event saat ini telah resmi ditutup.");
      initEventDetails();
      return;
    }

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Memproses Pendaftaran...`;

    // Jika sub-event: cek apakah peserta sudah terdaftar di event induk
    // Pastikan currentParentEventId terisi (fetch settings jika perlu)
    if (!currentParentEventId) {
      try {
        const customInfoTmp = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
        const gasUrlTmp = customInfoTmp.gasApiUrl || CONFIG.GAS_API_URL;
        const eidTmp = getCurrentEventId() || customInfoTmp.eventId || '';
        const respTmp = await fetch(`${gasUrlTmp}?action=getSettings&eventId=${encodeURIComponent(eidTmp)}&t=${Date.now()}`, { redirect: 'follow' });
        const jsonTmp = await respTmp.json();
        if (jsonTmp.status === 'success' && jsonTmp.settings) {
          currentParentEventId = jsonTmp.settings.parentId || '';
          localStorage.setItem('CUSTOM_EVENT_INFO', JSON.stringify(jsonTmp.settings));
        }
      } catch (e) { console.warn('[parent check fetch]', e); }
    }
    if (currentParentEventId) {
      const customInfoParent = JSON.parse(localStorage.getItem("CUSTOM_EVENT_INFO") || "{}");
      const gasUrlParent = customInfoParent.gasApiUrl || CONFIG.GAS_API_URL;
      let parentRegistered = false;
      let fetchFailed = false;
      let parentData = null;
      try {
        const respP = await fetch(`${gasUrlParent}?action=checkDuplicate&email=${encodeURIComponent(email)}&noWa=${encodeURIComponent(noWa)}&eventId=${encodeURIComponent(currentParentEventId)}&t=${Date.now()}`, { redirect: "follow" });
        const jsonP = await respP.json();
        if (jsonP.exists && jsonP.data) {
          parentData = jsonP.data;
          parentRegistered = true;
        }
      } catch (e) {
        console.warn("[parent check]", e);
        fetchFailed = true;
      }

      const showRegError = (icon, color, title, desc) => {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="ri-send-plane-fill"></i> Daftar Sekarang & Terbitkan E-Tiket`;
        const container = document.getElementById("reg-result-container");
        if (container) {
          container.innerHTML = `
            <div class="glass-panel mt-3" style="border-color: ${color}; background: ${color}22; padding: 24px; text-align: center;">
              <div style="font-size: 2.5rem; color: ${color}; margin-bottom: 8px;"><i class="${icon}"></i></div>
              <h3 style="color: #fff; font-size: 1.2rem; margin: 0;">${title}</h3>
              <p style="color: #e5e7eb; font-size: 0.95rem; margin: 8px 0 16px 0; line-height: 1.4;">${desc}</p>
              ${(title === "BELUM TERDAFTAR DI EVENT UTAMA") ? `<a href="index.html?event=${encodeURIComponent(currentParentEventId)}" class="btn btn-primary"><i class="ri-arrow-right-line"></i> Daftar Event Utama</a>` : ``}
            </div>
          `;
          container.scrollIntoView({ behavior: "smooth" });
        }
      };

      if (fetchFailed) {
        showRegError("ri-wifi-off-line", "#f59e0b", "GAGAL MEMVERIFIKASI", "Tidak dapat memverifikasi pendaftaran event utama. Periksa koneksi internet Anda dan coba lagi.");
        showToast("Gagal memverifikasi. Periksa koneksi internet.", "error");
        return;
      }

      if (!parentRegistered) {
        showRegError("ri-forbid-2-line", "#f43f5e", "BELUM TERDAFTAR DI EVENT UTAMA", "Untuk mendaftar sub-event ini, Anda harus terdaftar di event utama terlebih dahulu. Silakan daftar event utama, lalu kembali ke sini.");
        showToast("Anda harus terdaftar di event utama terlebih dahulu.", "error");
        return;
      }

      // Ambil participantFields dari event utama (field yang dicentang wajib identik)
      let pFields = {};
      try {
        const pSetResp = await fetch(`${gasUrlParent}?action=getSettings&eventId=${encodeURIComponent(currentParentEventId)}&t=${Date.now()}`, { redirect: "follow" });
        const pSetJson = await pSetResp.json();
        if (pSetJson.status === "success" && pSetJson.settings) {
          pFields = pSetJson.settings.participantFields || {};
        }
      } catch (e) { console.warn("[parent fields]", e); }

      // Data sub-event WAJIB identik dengan event utama. Karena itu nilainya
      // cukup DISELARASKAN otomatis dengan pendaftaran event utama (tidak memblokir),
      // sehingga peserta tetap memakai identitas yang sama (anti-kecurangan).
      const aligned = [];
      const alignVal = (key, elId, val, label) => {
        if (pFields[key] === false) return val;   // field tidak diwajibkan identik
        const pv = parentData[key];
        if (!pv) return val;                       // event utama tidak punya nilai
        if (String(val || "").trim() === String(pv).trim()) return val;
        const el = document.getElementById(elId);
        if (el) el.value = pv;
        aligned.push(label);
        return pv;
      };
      nama = alignVal("nama", "reg-nama", nama, "Nama");
      email = alignVal("email", "reg-email", email, "Email");
      noWa = alignVal("noWa", "reg-nowa", noWa, "No. WA");
      namaToko = alignVal("namaToko", "reg-toko", namaToko, "Nama Toko");
      domisili = alignVal("domisili", "reg-domisili", domisili, "Domisili");
      ukuranBaju = alignVal("ukuranBaju", "reg-baju", ukuranBaju, "Ukuran Baju");

      if (aligned.length > 0) {
        showToast("Data disamakan otomatis dengan event utama (" + aligned.join(", ") + ").", "success");
      }
    }

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
    const newRegId = generateParticipantRegId(localData, eventNamePrefix(currentEventName));
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
      statusHadir: "BELUM HADIR",
      eventId: getCurrentEventId() || customInfo.eventId || ""
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
          const savedData = resJson.data || newRecord;
          const currentLocal = getLocalData();
          currentLocal.unshift(savedData);
          saveLocalData(currentLocal);
          renderTicketSuccess(savedData, 'reg-result-container');
          form.reset();
        } else if (resJson.status === "closed") {
          showToast("Pemberitahuan: " + (resJson.message || "Pendaftaran event saat ini telah resmi ditutup."));
          initEventDetails();
        } else {
          showToast("Gagal melakukan pendaftaran: " + resJson.message);
        }
      } catch (err) {
        console.error(err);
        showToast("Terjadi kesalahan jaringan saat mengirim pendaftaran.");
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
  currentParentEventId = customInfo.parentId || "";
    const targetGasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;
    try {
      const eid = getCurrentEventId() || (JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}').eventId || "");
       const url = `${targetGasUrl}?action=checkDuplicate&email=${encodeURIComponent(email)}&noWa=${encodeURIComponent(noWa)}${eid ? `&eventId=${encodeURIComponent(eid)}` : ""}`;
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
        Email <strong>${escapeHtml(existing.email)}</strong> atau No WhatsApp <strong>${escapeHtml(existing.noWa)}</strong> telah terdaftar sebelumnya atas nama <strong>${escapeHtml(existing.nama)}</strong>.
      </p>
      <div class="mt-2">
        <span class="badge badge-warning">NO PESERTA: ${existing.regId} | TIKET: ${existing.ticketCode || existing.regId}</span>
      </div>
      <div class="mt-3">
        <button class="btn btn-emerald" onclick="renderTicketSuccess(${JSON.stringify(existing).replace(/"/g, '&quot;')}, 'reg-result-container')">
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
  currentParentEventId = customInfo.parentId || "";
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
  const displayRegId = record.regId || "EVT-001";

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
            <div class="eticket-header-event" title="${escapeHtml(eventName)}">${escapeHtml(eventName)}</div>
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
            <span class="eticket-val">${escapeHtml(record.nama)}</span>
          </div>
          <div class="eticket-row">
            <span class="eticket-label">Ukuran Baju</span>
            <span class="eticket-val" style="color: #f43f5e; font-weight: 800;">${escapeHtml(record.ukuranBaju || '-')}</span>
          </div>
          <div class="eticket-row">
            <span class="eticket-label">WhatsApp</span>
            <span class="eticket-val">${escapeHtml(record.noWa)}</span>
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
            ⚡ System Generated & Powered by <strong>TESPOIN SUMBAR-RIAU</strong>
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

  const fileInput = document.getElementById('upload-file');
  const preview = document.getElementById('upload-preview');
  if (fileInput && preview) {
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) {
        const url = URL.createObjectURL(f);
        preview.src = url;
        preview.classList.add('show');
      } else {
        preview.classList.remove('show');
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const regId = document.getElementById('upload-search-id').value.trim();
    const fileInput = document.getElementById('upload-file');

    if (!regId || !fileInput.files || fileInput.files.length === 0) {
      showToast("Masukkan ID Registrasi / No. WA / Kode Tiket dan pilih foto bukti transfer!");
      return;
    }

    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Mengunggah Struk...`;

    const file = fileInput.files[0];
    if (file.size > 2 * 1024 * 1024) {
      showToast("Ukuran file terlalu besar (maks 2MB).", "error");
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="ri-upload-cloud-line"></i> Unggah Bukti Transfer`;
      return;
    }
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
          showToast("ID Registrasi / Nomor WA / Kode Tiket tidak ditemukan. Mohon periksa kembali!");
        }
      } else {
        // Send to GAS (Mendukung Konfigurasi Dinamis dari Admin)
        const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  currentParentEventId = customInfo.parentId || "";
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
              driveFolder: customInfo.driveFolder || "",
              eventId: getCurrentEventId() || customInfo.eventId || ""
            })
          });
          const json = await resp.json();
          if (json.status === "success") {
            showUploadSuccessMessage(json.data);
            form.reset();
          } else {
            showToast("Gagal mengunggah bukti: " + json.message);
          }
        } catch (err) {
          console.error(err);
          showToast("Terjadi kesalahan koneksi saat upload.");
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

  const participantName = (item && item.nama) ? item.nama : ((item && item.regId) ? item.regId : "Peserta");
  const participantRegId = (item && item.regId) ? item.regId : "-";
  const ticketCode = (item && item.ticketCode) ? item.ticketCode : "-";
  const noWa = (item && item.noWa) ? item.noWa : "-";
  const ukuranBaju = (item && item.ukuranBaju) ? item.ukuranBaju : "-";
  const urlBukti = (item && item.urlBukti) ? item.urlBukti : "";

  const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  currentParentEventId = customInfo.parentId || "";
  const waPanitia = toWaInternational(customInfo.waPanitiaNumber || "");
  let waButtonHtml = "";
  if (waPanitia) {
    const text = `Halo Panitia, bukti transfer baru:%0A%0ANama: ${encodeURIComponent(participantName)}%0ANo. Peserta: ${encodeURIComponent(participantRegId)}%0AKode Tiket: ${encodeURIComponent(ticketCode)}%0ANo WA: ${encodeURIComponent(noWa)}%0AUkuran Baju: ${encodeURIComponent(ukuranBaju)}%0A%0ALink Bukti Transfer: ${encodeURIComponent(urlBukti)}%0A%0AMohon verifikasi. Terima kasih.`;
    const waLink = `https://wa.me/${waPanitia}?text=${text}`;
    waButtonHtml = `
      <div class="mt-3">
        <a class="btn btn-emerald btn-full" href="${waLink}" target="_blank" rel="noopener">
          <i class="ri-whatsapp-line"></i> Kirim Notifikasi ke WA Panitia
        </a>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;">Klik tombol di atas untuk mengirim ringkasan + link bukti transfer ke WA panitia yang ditunjuk.</p>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="glass-panel mt-3" style="border-color: var(--accent-emerald);">
      <div class="panel-title" style="color: var(--accent-emerald);">
        <i class="ri-checkbox-circle-line"></i> Bukti Transfer Berhasil Diunggah!
      </div>
      <p class="mt-1" style="color: #cbd5e1;">
        Bukti transfer untuk <strong>${escapeHtml(participantName)}</strong> (${escapeHtml(participantRegId)}) telah diterima.
      </p>
      <div class="mt-2">
        <span class="badge badge-warning">Status: Menunggu Verifikasi Panitia</span>
      </div>
      ${waButtonHtml}
      ${!waPanitia ? '<p style="font-size:0.78rem; color:var(--text-muted); margin-top:8px;">Notifikasi WA belum diatur oleh panitia. Hubungi panitia via email/telepon.</p>' : ''}
    </div>
  `;
  container.scrollIntoView({ behavior: 'smooth' });
}

// 6. Cek Status Pendaftaran (Mendukung Cari via No WA 08xx, 628xx, 8xx, No Peserta, Kode Tiket)
// 6. Cek Status Pendaftaran — Fallback Fetch GAS jika tidak ada di localStorage
function initCheckStatusForm() {
  const form = document.getElementById('check-status-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const query = document.getElementById('status-query').value.trim();
    if (!query) return;

    const resultDiv = document.getElementById('status-result-container');
    if (!resultDiv) return;

    // Tampilkan loading
    resultDiv.innerHTML = `
      <div class="glass-panel mt-3 text-center" style="padding: 24px;">
        <i class="ri-loader-4-line ri-spin" style="font-size: 1.8rem; color: var(--primary);"></i>
        <p style="color: var(--text-muted); margin-top: 8px;">Sedang mencari data...</p>
      </div>
    `;

    // Langkah 1: Cari di localStorage lokal
    let data = getLocalData();
    let found = findParticipantByQuery(data, query);

    // Langkah 2: Jika tidak ditemukan lokal, fetch dari GAS (untuk peserta yang daftar di HP/browser lain)
    if (!found && !CONFIG.USE_MOCK_DATA) {
      try {
        const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  currentParentEventId = customInfo.parentId || "";
        const targetGasUrl = customInfo.gasApiUrl || CONFIG.GAS_API_URL;
        const cacheBuster = Date.now();
        const eid = getCurrentEventId() || (JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}').eventId || "");
         const resp = await fetch(`${targetGasUrl}?action=findParticipant&query=${encodeURIComponent(query)}${eid ? `&eventId=${encodeURIComponent(eid)}` : ""}&t=${cacheBuster}`, { redirect: 'follow' });
        const text = await resp.text();
        const json = JSON.parse(text);
        if (json.exists && json.data) {
          const merged = mergeData(getLocalData(), [json.data]);
           saveLocalData(merged); // Cache ke lokal untuk query berikutnya
          found = findParticipantByQuery(merged, query);
        }
      } catch(e) {
        console.warn('[GAS getData fallback]', e);
      }
    }

    if (found) {
      let badgeBayarClass = "badge-warning";
      if (found.statusBayar === "LUNAS") badgeBayarClass = "badge-success";
      if (found.statusBayar === "DITOLAK") badgeBayarClass = "badge-danger";

      resultDiv.innerHTML = `
        <div class="glass-panel mt-3">
          <div class="panel-header">
            <h3 class="panel-title" style="color:var(--accent-cyan); font-size:1.15rem;">
              <i class="ri-user-search-line"></i> Hasil Pencarian: ${escapeHtml(found.nama)}
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


