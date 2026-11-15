/**
 * SETTINGS.JS - Tabbed settings UI helpers for admin.html
 */

// Switch between settings sub-tabs
window.switchSettingsTab = function (tab) {
  const panels = document.querySelectorAll('.settings-tab-panel');
  const btns = document.querySelectorAll('[data-stab]');
  panels.forEach(p => {
    p.style.display = (p.getAttribute('data-stab') === tab) ? '' : 'none';
  });
  btns.forEach(b => {
    if (b.getAttribute('data-stab') === tab) b.classList.add('active');
    else b.classList.remove('active');
  });
};

// Helper: collect all current settings field values
function collectSettings() {
  if (typeof window.syncDeadlineHidden === 'function') {
    window.syncDeadlineHidden();
  }
  const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const gc = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
  return {
    name: g('set-event-name'),
    date: g('set-event-date'),
    venue: g('set-event-venue'),
    posterUrl: convertDriveLink(g('set-poster-url')),
    parentId: g('set-parent-event') || '',
    isSubEvent: gc('set-sub-event-mode'),
    participantFields: {
      email: gc('pf-email'),
      noWa: gc('pf-nowa'),
      namaToko: gc('pf-toko'),
      domisili: gc('pf-domisili'),
      ukuranBaju: gc('pf-baju'),
      showUploadTab: gc('pf-upload')
    },
    paymentInfo: {
      bankName: g('set-bank-name') || (window.CONFIG ? CONFIG.PAYMENT_INFO.BANK_NAME : ''),
      accountNumber: g('set-bank-acc') || (window.CONFIG ? CONFIG.PAYMENT_INFO.ACCOUNT_NUMBER : ''),
      accountHolder: g('set-bank-holder') || (window.CONFIG ? CONFIG.PAYMENT_INFO.ACCOUNT_HOLDER : '')
    },
    deadlineMode: g('set-deadline-mode') || 'unlimited',
    deadlineDateTime: g('set-deadline-datetime'),
    closedMessage: g('set-closed-message'),
    adminEmail: g('set-admin-email'),
    waPanitiaNumber: (typeof toWaInternational === 'function') ? toWaInternational(g('set-wa-panitia')) : g('set-wa-panitia'),
    driveFolder: g('set-drive-folder'),
    gasApiUrl: g('set-gas-url'),
    sheetUrl: g('set-sheet-url'),
    eventId: (typeof currentAdminEventId !== 'undefined') ? currentAdminEventId : ''
  };
}

// Compress image helper
function compressImageFile(file, callback) {
  const reader = new FileReader();
  reader.onload = function (evt) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200, MAX_HEIGHT = 1600;
      let width = img.width, height = img.height;
      if (width > MAX_WIDTH) { height = Math.round(height * MAX_WIDTH / width); width = MAX_WIDTH; }
      if (height > MAX_HEIGHT) { width = Math.round(width * MAX_HEIGHT / height); height = MAX_HEIGHT; }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

// Save a section (merges with existing settings)
window.saveSettingsSection = async function (section) {
  const token = (typeof getAdminToken === 'function') ? getAdminToken() : (sessionStorage.getItem('ADMIN_TOKEN') || '');
  const customInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
  // GAS URL untuk operasi save: gunakan global config (sama untuk semua event)
  let gasUrl = (window.CONFIG ? CONFIG.GAS_API_URL : '') || customInfo.gasApiUrl || '';
  // Untuk sub-event, coba warisi dari event induk
  if (customInfo.parentId) {
    try {
      const pResp = await fetch(gasUrl + '?action=getSettings&eventId=' + encodeURIComponent(customInfo.parentId));
      const pJson = await pResp.json();
      if (pJson.status === 'success' && pJson.settings && pJson.settings.gasApiUrl) {
        gasUrl = pJson.settings.gasApiUrl;
      }
    } catch (e) {}
  }
  // Fallback: field integrasi (jika terisi)
  const inputGasUrl = document.getElementById('set-gas-url');
  if (inputGasUrl && inputGasUrl.value.trim()) {
    gasUrl = inputGasUrl.value.trim();
  }
  if (!gasUrl) {
    showToast('URL GAS belum diisi. Isi di tab Integrasi.', 'error');
    return;
  }

  const allSettings = collectSettings();
  // If a poster file is selected and section is 'info', upload first
  const fileInput = document.getElementById('set-poster-file');
  if (section === 'info' && fileInput && fileInput.files && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const btn = document.querySelector('[onclick*="saveSettingsSection(\'info\')"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Mengupload poster...'; }
    compressImageFile(file, async function (compressedBase64) {
      try {
        const upResp = await fetch(gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'uploadPoster', fileData: compressedBase64, fileName: file.name, token: token })
        });
        const upJson = await upResp.json();
        if (upJson.status === 'success' && upJson.posterUrl) {
          allSettings.posterUrl = upJson.posterUrl;
          const urlInput = document.getElementById('set-poster-url');
          if (urlInput) urlInput.value = upJson.posterUrl;
        } else {
          allSettings.posterUrl = compressedBase64;
        }
      } catch (e) {
        allSettings.posterUrl = compressedBase64;
      }
      await doSaveSettings(gasUrl, token, allSettings, btn);
    });
    return;
  }

  const btn = document.querySelector(`[onclick*="saveSettingsSection('${section}')"]`);
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Menyimpan...'; }
  await doSaveSettings(gasUrl, token, allSettings, btn);
};

async function doSaveSettings(gasUrl, token, settings, btn) {
  const originalText = btn ? btn.innerHTML : '';
  try {
    const resp = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveSettings', settings: settings, token: token })
    });
    const json = await resp.json();
    if (json.status === 'success') {
      const prevInfo = JSON.parse(localStorage.getItem('CUSTOM_EVENT_INFO') || '{}');
      localStorage.setItem('CUSTOM_EVENT_INFO', JSON.stringify(Object.assign({}, prevInfo, settings)));
      showToast('Pengaturan berhasil disimpan!', 'success');
      // update google sheet link
      const btnSheet = document.getElementById('btn-open-sheet');
      if (btnSheet && settings.sheetUrl) btnSheet.href = settings.sheetUrl;
    } else {
      showToast(json.message || 'Gagal menyimpan pengaturan.', 'error');
    }
  } catch (e) {
    console.error(e);
    showToast('Gagal terhubung ke server.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText || '<i class="ri-save-3-line"></i> Simpan';
    }
  }
}

// -------------------------------------------------------------------------// DEADLINE 24 JAM
// Input `datetime-local` bawaan browser mengikuti format lokal OS (bisa AM/PM).
// Agar selalu format 24 jam murni, dipakai: date picker + dropdown Jam (00-23) &
// Menit (00-59). Nilai gabungan disimpan di hidden input #set-deadline-datetime
// sehingga seluruh logika simpan & pratinjau yang lama tetap berjalan.
// ---------------------------------------------------------------------------
window.fillDeadlineControls = function () {
  const hidden = document.getElementById('set-deadline-datetime');
  const dateEl = document.getElementById('set-deadline-date');
  const hourEl = document.getElementById('set-deadline-hour');
  const minEl = document.getElementById('set-deadline-minute');
  if (!hidden || !dateEl || !hourEl || !minEl) return;
  const val = String(hidden.value || '').trim();
  if (!val) {
    dateEl.value = '';
    hourEl.value = '23';
    minEl.value = '59';
    if (typeof window.updateDeadlinePreview === 'function') {
      window.updateDeadlinePreview();
    }
    return;
  }
  const parts = val.split('T');
  dateEl.value = parts[0] || '';
  const tp = String(parts[1] || '23:59').split(':');
  const h = String(tp[0] || '23').padStart(2, '0');
  const m = String(tp[1] || '59').padStart(2, '0');
  hourEl.value = h;
  minEl.value = m;
  // Jika nilai menit tidak ada di daftar (mis. data lama), tambahkan opsinya.
  if (hourEl.value !== h) hourEl.appendChild(new Option(h, h, true, true));
  if (minEl.value !== m) minEl.appendChild(new Option(m, m, true, true));

  if (typeof window.updateDeadlinePreview === 'function') {
    window.updateDeadlinePreview();
  }
};

// Preset helper untuk tombol cepat format 24 jam
window.setDeadlinePreset = function (h, m) {
  const hourEl = document.getElementById('set-deadline-hour');
  const minEl = document.getElementById('set-deadline-minute');
  const pad = (n) => String(n).padStart(2, '0');
  if (hourEl) hourEl.value = pad(h);
  if (minEl) minEl.value = pad(m);
  if (typeof window.syncDeadlineHidden === 'function') {
    window.syncDeadlineHidden();
  }
};

// Gabungkan date + jam + menit ke hidden input, lalu beri tahu pratinjau.
window.syncDeadlineHidden = function () {
  const hidden = document.getElementById('set-deadline-datetime');
  if (!hidden) return;
  const dateEl = document.getElementById('set-deadline-date');
  const hourEl = document.getElementById('set-deadline-hour');
  const minEl = document.getElementById('set-deadline-minute');
  const d = dateEl ? dateEl.value : '';
  if (!d) {
    hidden.value = '';
  } else {
    const h = (hourEl && hourEl.value) ? hourEl.value : '23';
    const m = (minEl && minEl.value) ? minEl.value : '59';
    hidden.value = d + 'T' + h + ':' + m;
  }
  // Picu pratinjau
  hidden.dispatchEvent(new Event('input', { bubbles: true }));
  if (typeof window.updateDeadlinePreview === 'function') {
    window.updateDeadlinePreview();
  }
};

// Update preview deadline dengan format jam 24 jam Indonesia yang jelas
window.updateDeadlinePreview = function () {
  const previewEl = document.getElementById('deadline-status-preview');
  if (!previewEl) return;
  const hidden = document.getElementById('set-deadline-datetime');
  const val = hidden ? hidden.value.trim() : '';
  if (!val) {
    previewEl.innerHTML = `
      <div style="font-size:0.8rem; color:var(--text-muted); padding:8px 12px; background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.15); border-radius:6px;">
        <i class="ri-information-line"></i> Belum ada batas tanggal & jam yang dipilih.
      </div>`;
    return;
  }

  let s = val;
  if (s.includes('T')) {
    const parts = s.split('T');
    const timeParts = parts[1].split(':');
    if (timeParts.length === 2) s = parts[0] + 'T' + parts[1] + ':00';
  }
  let deadlineMs = new Date(s).getTime();
  if (isNaN(deadlineMs)) {
    deadlineMs = new Date(s.replace(/-/g, '/').replace('T', ' ')).getTime();
  }

  const parts = val.split('T');
  const datePart = parts[0] || '';
  const timePart = parts[1] || '00:00';
  let formattedDate = datePart;
  try {
    const [y, m, d] = datePart.split('-');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    if (y && m && d) {
      formattedDate = `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
    }
  } catch (e) {}

  const fullDisplay24 = `${formattedDate} pukul ${timePart} WIB (Format 24 Jam)`;
  const now = Date.now();

  if (!isNaN(deadlineMs)) {
    const isPassed = now > deadlineMs;
    if (isPassed) {
      previewEl.innerHTML = `
        <div style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); border-radius:8px; padding:10px 14px;">
          <div style="font-size:0.85rem; color:#f8fafc; margin-bottom:6px;">
            <i class="ri-calendar-close-line" style="color:var(--accent-rose);"></i> Deadline Terpilih: 
            <strong style="color:#fecaca; font-family:monospace; font-size:0.95rem;">${fullDisplay24}</strong>
          </div>
          <div class="badge badge-danger" style="display:inline-flex; align-items:center; gap:6px; padding:5px 10px; font-size:0.8rem;">
            <i class="ri-forbid-line"></i> <strong>SUDAH LEWAT:</strong> Waktu ini sudah terlewati. Form web peserta saat ini <strong>TERKUNCI / DITUTUP</strong>.
          </div>
        </div>
      `;
    } else {
      const diffMin = Math.round((deadlineMs - now) / 60000);
      const diffHours = (diffMin / 60).toFixed(1);
      const diffDays = Math.floor(diffMin / (60 * 24));
      const remainingText = diffDays > 0 ? `~${diffDays} hari ${Math.round((diffMin % (60 * 24)) / 60)} jam lagi` : `~${diffHours} jam lagi`;
      previewEl.innerHTML = `
        <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:10px 14px;">
          <div style="font-size:0.85rem; color:#f8fafc; margin-bottom:6px;">
            <i class="ri-calendar-check-line" style="color:var(--accent-emerald);"></i> Deadline Terpilih: 
            <strong style="color:#a7f3d0; font-family:monospace; font-size:0.95rem;">${fullDisplay24}</strong>
          </div>
          <div class="badge badge-success" style="display:inline-flex; align-items:center; gap:6px; padding:5px 10px; font-size:0.8rem;">
            <i class="ri-time-line"></i> <strong>MASIH AKTIF (${remainingText}):</strong> Form web peserta akan <strong>TETAP BUKA</strong> hingga waktu tersebut.
          </div>
        </div>
      `;
    }
  }
};

document.addEventListener('DOMContentLoaded', function () {
  const dateEl = document.getElementById('set-deadline-date');
  const hourEl = document.getElementById('set-deadline-hour');
  const minEl = document.getElementById('set-deadline-minute');
  [dateEl, hourEl, minEl].forEach(function (el) {
    if (el) {
      el.addEventListener('change', window.syncDeadlineHidden);
      el.addEventListener('input', window.syncDeadlineHidden);
    }
  });
  window.fillDeadlineControls();
});
