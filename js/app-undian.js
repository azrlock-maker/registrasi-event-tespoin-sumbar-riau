/**
 * APP-UNDIAN.JS - Halaman Undian No. Peserta (Panitia/Admin)
 * Mengundi No. Peserta dari data peserta yang terdaftar pada suatu event.
 * Awalan No. Peserta mengikuti nama event (mis. "Silaturahmi Akbar" → SA-001).
 *
 * Gaya undian: nomor dikocok acak cepat lalu berhenti di pemenang.
 * Durasi kocok dapat diatur (detik); bisa di-STOP manual kapan saja.
 */

let undiParticipants = [];   // seluruh peserta event terpilih
let undiWinners = [];        // pemenang yang sudah keluar (urutan)
let undiEventId = "";
let undiRolling = false;
let undiTimer = null;
let undiCurrent = null;      // peserta yang sedang tampil di panggung
let undiAnimToken = 0;       // penanda animasi aktif (untuk membatalkan timer lama)

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
function undiGasUrl() {
  try {
    const info = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
    return info.gasApiUrl || CONFIG.GAS_API_URL;
  } catch (e) {
    return CONFIG.GAS_API_URL;
  }
}

function undiToken() {
  return sessionStorage.getItem('ADMIN_TOKEN') || "";
}

function undiShowDashboard() {
  const login = document.getElementById('undi-login-panel');
  const dash = document.getElementById('undi-dashboard');
  if (login) login.classList.add('d-none');
  if (dash) dash.classList.remove('d-none');
  initUndian();
}

function initUndiAuth() {
  const savedToken = sessionStorage.getItem('ADMIN_TOKEN');
  if (savedToken) {
    undiShowDashboard();
    return;
  }

  const form = document.getElementById('undi-login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('undi-username').value.trim();
    const pass = document.getElementById('undi-password').value.trim();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Memverifikasi...'; }
    try {
      const resp = await fetch(undiGasUrl(), {
        method: 'POST',
        body: JSON.stringify({ action: 'login', username: user, password: pass })
      });
      const json = await resp.json();
      if (json.status === 'success' && json.token) {
        sessionStorage.setItem('ADMIN_TOKEN', json.token);
        sessionStorage.setItem('ADMIN_ROLE', json.role || '');
        undiShowDashboard();
      } else {
        showToast(json.message || 'Username atau Password salah!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal terhubung ke server. Periksa koneksi / URL GAS.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-login-box-line"></i> Masuk'; }
    }
  });
}

window.undiLogout = function () {
  sessionStorage.removeItem('ADMIN_TOKEN');
  sessionStorage.removeItem('ADMIN_ROLE');
  window.location.reload();
};

// ---------------------------------------------------------------------------
// LOAD EVENT & PESERTA
// ---------------------------------------------------------------------------
async function initUndian() {
  const sel = document.getElementById('undi-event-selector');
  if (!sel) return;

  if (CONFIG.USE_MOCK_DATA) {
    // Mode lokal: hanya event default dari localStorage
    sel.innerHTML = '<option value="">Event Lokal (Mock)</option>';
    undiEventId = 'LOCAL';
    undiParticipants = getLocalUndiData();
    updateUndiStage();
    return;
  }

  try {
    const resp = await fetch(`${undiGasUrl()}?action=getEvents&token=${encodeURIComponent(undiToken())}&t=${Date.now()}`, { redirect: 'follow' });
    const json = await resp.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) {
      showToast(json.message || 'Gagal memuat daftar event.', 'error');
      return;
    }
    sel.innerHTML = '';
    if (json.data.length === 0) {
      sel.innerHTML = '<option value="">Belum ada event</option>';
      return;
    }

    const savedCurrent = localStorage.getItem('CURRENT_ADMIN_EVENT_ID') || '';
    let defaultId = '';

    json.data.forEach(ev => {
      const opt = document.createElement('option');
      const isSub = !!ev.parentId;
      opt.value = ev.eventId;
      opt.textContent = (isSub ? '↳ ' : '') + ev.name + (ev.active ? ' (Aktif)' : '');
      opt.dataset.isSub = isSub ? '1' : '0';
      sel.appendChild(opt);
      // Default: event utama yang aktif (prioritas yang sedang dibuka di admin)
      if (!defaultId && !isSub && ev.active) defaultId = ev.eventId;
      if (ev.eventId === savedCurrent) defaultId = ev.eventId;
    });

    if (!defaultId) defaultId = json.data[0].eventId;
    sel.value = defaultId;
    sel.onchange = () => loadUndiParticipants(sel.value);
    await loadUndiParticipants(defaultId);
  } catch (e) {
    console.error('[initUndian]', e);
    showToast('Gagal terhubung ke server.', 'error');
  }
}

async function loadUndiParticipants(eventId) {
  cancelUndianAnimation();
  undiEventId = eventId;
  undiWinners = [];
  undiCurrent = null;
  renderUndiHistory();
  setUndiNumber('---', '');
  setUndiButton('idle');
  document.getElementById('undi-name').textContent = 'Memuat data peserta...';
  document.getElementById('undi-sub').innerHTML = '&nbsp;';

  if (CONFIG.USE_MOCK_DATA || eventId === 'LOCAL') {
    undiParticipants = getLocalUndiData();
    updateUndiStage();
    return;
  }

  try {
    const resp = await fetch(`${undiGasUrl()}?action=getData&eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(undiToken())}&t=${Date.now()}`, { redirect: 'follow' });
    const json = await resp.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      undiParticipants = json.data;
    } else {
      undiParticipants = [];
      showToast(json.message || 'Gagal memuat data peserta.', 'error');
    }
  } catch (e) {
    console.error('[loadUndiParticipants]', e);
    undiParticipants = [];
    showToast('Gagal terhubung ke server.', 'error');
  }
  updateUndiStage();
}

function updateUndiStage() {
  const sel = document.getElementById('undi-event-selector');
  const isSub = sel && sel.selectedOptions && sel.selectedOptions[0] && sel.selectedOptions[0].dataset.isSub === '1';
  const modeBadge = document.getElementById('undi-mode-badge');
  const totalBadge = document.getElementById('undi-total-badge');

  if (modeBadge) {
    modeBadge.textContent = isSub ? 'SUB-EVENT' : 'EVENT UTAMA';
    modeBadge.style.background = isSub ? 'rgba(244,63,94,0.15)' : 'rgba(34,211,238,0.15)';
    modeBadge.style.color = isSub ? 'var(--accent-rose)' : 'var(--accent-cyan)';
  }
  if (totalBadge) totalBadge.textContent = undiParticipants.length + ' PESERTA';

  const note = document.getElementById('undi-event-note');
  if (note) {
    note.textContent = isSub
      ? 'Catatan: ini SUB-EVENT. Untuk undian acara utama, pilih event utama (tanpa tanda ↳).'
      : 'Event utama terpilih — undian memakai No. Peserta event ini.';
  }

  if (undiParticipants.length === 0) {
    document.getElementById('undi-name').textContent = 'Tidak ada peserta terdaftar';
    setUndiNumber('---', '');
  } else {
    document.getElementById('undi-name').textContent = 'Tekan "Mulai Undian"';
    setUndiNumber('---', '');
  }
  setUndiButton('idle');
}

// ---------------------------------------------------------------------------
// KONTROL UNDIAN
// ---------------------------------------------------------------------------

// Tombol utama: klik = mulai, klik lagi (saat berjalan) = STOP manual
window.toggleUndian = function () {
  if (undiRolling) {
    stopUndian();
  } else {
    startUndian();
  }
};

function startUndian() {
  if (undiRolling) return;
  if (!undiParticipants || undiParticipants.length === 0) {
    showToast('Tidak ada peserta untuk diundi.', 'warning');
    return;
  }

  const excludeEl = document.getElementById('undi-exclude-winners');
  const excludeWinners = excludeEl ? excludeEl.checked : true;
  const wonIds = undiWinners.map(w => w.regId);
  const pool = excludeWinners
    ? undiParticipants.filter(p => !wonIds.includes(p.regId))
    : undiParticipants.slice();

  if (pool.length === 0) {
    showToast('Semua peserta sudah keluar sebagai pemenang.', 'warning');
    return;
  }

  cancelUndianAnimation();
  undiRolling = true;
  undiCurrent = null;
  setUndiButton('rolling');

  const nameEl = document.getElementById('undi-name');
  const subEl = document.getElementById('undi-sub');
  if (nameEl) nameEl.textContent = 'Mengocok...';
  if (subEl) subEl.innerHTML = '&nbsp;';

  startRandom(pool, undiAnimToken);
}

// Gaya acak: nomor berganti acak cepat, berhenti otomatis sesuai Durasi Kocok
function startRandom(pool, token) {
  const durasiEl = document.getElementById('undi-durasi');
  let durasi = durasiEl ? parseFloat(durasiEl.value) : 3;
  if (isNaN(durasi) || durasi < 0.5) durasi = 0.5;
  if (durasi > 30) durasi = 30;

  const tickMs = 70; // jeda antar nomor
  const totalTicks = Math.max(8, Math.round((durasi * 1000) / tickMs));
  let ticks = 0;
  const nameEl = document.getElementById('undi-name');

  const tick = () => {
    if (token !== undiAnimToken) return;
    const rnd = pool[Math.floor(Math.random() * pool.length)];
    undiCurrent = rnd;
    setUndiNumber(rnd.regId || '-', 'rolling');
    if (nameEl) nameEl.textContent = rnd.nama || '';
    ticks++;
    if (ticks >= totalTicks) {
      finishUndian(undiCurrent);
      return;
    }
    undiTimer = setTimeout(tick, tickMs);
  };
  tick();
}

// STOP manual: hentikan animasi dan jadikan nomor yang sedang tampil sebagai pemenang
function stopUndian() {
  if (!undiRolling) return;
  cancelUndianAnimation();
  finishUndian(undiCurrent);
}

// Tetapkan pemenang (nomor yang sedang tampil / hasil undian)
function finishUndian(winner) {
  if (undiTimer) { clearTimeout(undiTimer); undiTimer = null; }
  undiRolling = false;

  if (!winner) {
    setUndiButton('idle');
    return;
  }

  setUndiNumber(winner.regId || '-', 'winner');
  const nameEl = document.getElementById('undi-name');
  const subEl = document.getElementById('undi-sub');
  if (nameEl) nameEl.textContent = winner.nama || '';
  if (subEl) {
    subEl.innerHTML =
      '<i class="ri-store-2-line"></i> ' + escapeHtml(winner.namaToko || '-') +
      ' &nbsp;·&nbsp; <i class="ri-map-pin-line"></i> ' + escapeHtml(winner.domisili || '-');
  }

  undiWinners.push({
    regId: winner.regId,
    nama: winner.nama,
    namaToko: winner.namaToko,
    domisili: winner.domisili
  });
  renderUndiHistory();
  setUndiButton('again');
}

window.resetUndian = function () {
  cancelUndianAnimation();
  undiWinners = [];
  undiCurrent = null;
  renderUndiHistory();
  setUndiNumber('---', '');
  document.getElementById('undi-name').textContent =
    undiParticipants.length ? 'Tekan "Mulai Undian"' : 'Tidak ada peserta terdaftar';
  document.getElementById('undi-sub').innerHTML = '&nbsp;';
  setUndiButton('idle');
  showToast('Riwayat undian direset.', 'success');
};

// Batalkan animasi yang sedang berjalan (dipakai saat ganti event / reset)
function cancelUndianAnimation() {
  undiAnimToken++;
  if (undiTimer) {
    clearTimeout(undiTimer);
    clearInterval(undiTimer);
    undiTimer = null;
  }
  undiRolling = false;
}

// ---------------------------------------------------------------------------
// TAMPILAN
// ---------------------------------------------------------------------------
function setUndiNumber(text, cls) {
  const el = document.getElementById('undi-number');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('rolling', 'winner');
  if (cls) el.classList.add(cls);
}

function setUndiButton(state) {
  const btn = document.getElementById('undi-start-btn');
  if (!btn) return;
  if (state === 'rolling') {
    btn.innerHTML = '<i class="ri-stop-circle-line"></i> STOP';
    btn.style.background = 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)';
    btn.disabled = false;
  } else if (state === 'again') {
    btn.innerHTML = '<i class="ri-shuffle-line"></i> Undi Lagi';
    btn.style.background = '';
    btn.disabled = false;
  } else {
    btn.innerHTML = '<i class="ri-play-circle-line"></i> Mulai Undian';
    btn.style.background = '';
    btn.disabled = false;
  }
}

function renderUndiHistory() {
  const box = document.getElementById('undi-history');
  if (!box) return;
  if (undiWinners.length === 0) {
    box.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; margin:0;">Belum ada pemenang.</p>';
    return;
  }
  box.innerHTML = undiWinners.map((w, i) => `
    <div class="undi-winner-item">
      <div style="font-weight:800; color:var(--accent-emerald); min-width:28px;">#${i + 1}</div>
      <div style="font-family:monospace; font-weight:800; color:var(--accent-cyan); min-width:90px;">${escapeHtml(w.regId || '-')}</div>
      <div style="flex:1;">
        <div style="color:#fff; font-weight:700;">${escapeHtml(w.nama || '-')}</div>
        <div style="color:var(--text-muted); font-size:0.82rem;">${escapeHtml(w.namaToko || '-')} · ${escapeHtml(w.domisili || '-')}</div>
      </div>
    </div>
  `).join('');
}

// Mode mock lokal (tanpa GAS)
function getLocalUndiData() {
  try {
    const raw = localStorage.getItem('EVENT_REGISTRATIONS_DB');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Boot
document.addEventListener('DOMContentLoaded', initUndiAuth);
