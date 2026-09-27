// =======================================================================
// ADMIN.JS — Panel Admin Roxy Square Jakarta
// Berkomunikasi langsung dengan GitHub REST API memakai Personal Access
// Token (PAT) yang dimasukkan pengguna saat login, sehingga panel ini
// bisa membaca & menulis data/db.json TANPA server backend — cocok
// untuk GitHub Pages yang sepenuhnya statis.
//
// CATATAN KEAMANAN:
// Token disimpan di localStorage/sessionStorage milik browser pengguna
// sendiri. Ini adalah pola umum untuk "CMS ringan berbasis GitHub API"
// pada situs statis. Gunakan SELALU Fine-grained Personal Access Token
// yang scope-nya dibatasi hanya ke satu repository ini dengan permission
// "Contents: Read and write", jangan token classic dengan akses penuh.
// =======================================================================

(function () {
  'use strict';

  var GITHUB_API = 'https://api.github.com';

  var TAB_TITLES = {
    dashboard: 'Dashboard',
    connection: 'Cek Koneksi GitHub',
    hero: 'Hero Slider',
    office: 'Our Office Space',
    training: 'Our Training Facility',
    tenants: 'Our Tenants',
    pricing: 'Pricelist',
    access: 'Access / Lokasi',
    about: 'About Us',
    contact: 'Contact & Sosial Media',
    users: 'Manajemen User Admin'
  };

  /* Konfigurasi kolom untuk 3 koleksi galeri sederhana yang bentuknya sama */
  var MEDIA_TABS = {
    office: { key: 'officeGallery', label: 'Foto Office Space' },
    training: { key: 'trainingFacility', label: 'Foto Training Facility' },
    tenants: { key: 'tenants', label: 'Tenant' }
  };

  var state = {
    owner: '', repo: '', branch: 'main', path: 'data/db.json',
    token: '', rememberToken: false,
    username: null, db: null, sha: null
  };

  /* ---------------------------------------------------------------
     UTIL: escaping & storage
     --------------------------------------------------------------- */
  function escAttr(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escHtml(str) { return escAttr(str); }

  function saveConfigToStorage() {
    localStorage.setItem('roxyAdminOwner', state.owner);
    localStorage.setItem('roxyAdminRepo', state.repo);
    localStorage.setItem('roxyAdminBranch', state.branch);
    localStorage.setItem('roxyAdminPath', state.path);
    localStorage.setItem('roxyAdminRemember', state.rememberToken ? '1' : '0');
    if (state.rememberToken) {
      localStorage.setItem('roxyAdminToken', state.token);
      sessionStorage.removeItem('roxyAdminToken');
    } else {
      sessionStorage.setItem('roxyAdminToken', state.token);
      localStorage.removeItem('roxyAdminToken');
    }
  }

  function loadConfigFromStorage() {
    state.owner = localStorage.getItem('roxyAdminOwner') || '';
    state.repo = localStorage.getItem('roxyAdminRepo') || '';
    state.branch = localStorage.getItem('roxyAdminBranch') || 'main';
    state.path = localStorage.getItem('roxyAdminPath') || 'data/db.json';
    state.rememberToken = localStorage.getItem('roxyAdminRemember') === '1';
    state.token = localStorage.getItem('roxyAdminToken') || sessionStorage.getItem('roxyAdminToken') || '';
  }

  function clearTokenStorage() {
    localStorage.removeItem('roxyAdminToken');
    sessionStorage.removeItem('roxyAdminToken');
    state.token = '';
  }

  /* ---------------------------------------------------------------
     GITHUB API WRAPPER
     --------------------------------------------------------------- */
  function encodePath(p) {
    return p.split('/').map(encodeURIComponent).join('/');
  }

  function b64DecodeUnicode(str) {
    return decodeURIComponent(Array.prototype.map.call(atob(str), function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }
  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  }

  function ghFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      'Authorization': 'Bearer ' + state.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }, opts.headers || {});
    return fetch(GITHUB_API + path, opts).catch(function (networkErr) {
      // fetch() sendiri gagal (offline, DNS, diblokir jaringan/ekstensi browser, dsb),
      // BUKAN error dari GitHub API — beri pesan yang lebih jelas daripada
      // pesan bawaan browser seperti "Failed to fetch".
      throw new Error('Tidak bisa menghubungi api.github.com. Periksa koneksi internet Anda, atau kemungkinan ada firewall/ekstensi browser yang memblokir permintaan. (' + networkErr.message + ')');
    }).then(function (res) {
      return res.text().then(function (text) {
        var body = {};
        try { body = text ? JSON.parse(text) : {}; } catch (e) { /* non-JSON, ignore */ }
        if (!res.ok) {
          var msg = (body && body.message) ? body.message : ('HTTP ' + res.status);
          if (res.status === 401) msg = 'Token tidak valid atau sudah kedaluwarsa. (' + msg + ')';
          if (res.status === 403) msg = 'Akses ditolak — periksa scope/permission token Anda, atau kuota API sudah habis. (' + msg + ')';
          if (res.status === 404) msg = 'Tidak ditemukan (404) — periksa nama Owner/Repository/Branch/Path. (' + msg + ')';
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }
        return body;
      });
    });
  }

  function checkConnection() {
    return Promise.all([
      ghFetch('/user'),
      ghFetch('/repos/' + state.owner + '/' + state.repo),
      ghFetch('/rate_limit')
    ]).then(function (results) {
      var user = results[0], repo = results[1], rate = results[2];
      return {
        username: user.login,
        avatar: user.avatar_url,
        repoFullName: repo.full_name,
        defaultBranch: repo.default_branch,
        canPush: !!(repo.permissions && repo.permissions.push),
        rateRemaining: rate.rate ? rate.rate.remaining : null,
        rateLimit: rate.rate ? rate.rate.limit : null
      };
    });
  }

  function getDbFile() {
    return ghFetch('/repos/' + state.owner + '/' + state.repo + '/contents/' + encodePath(state.path) + '?ref=' + encodeURIComponent(state.branch))
      .then(function (data) {
        var content = (data.content || '').replace(/\n/g, '');
        var json = JSON.parse(b64DecodeUnicode(content));
        state.sha = data.sha;
        return json;
      });
  }

  function saveDbFile(newDb, message) {
    // Ambil sha TERBARU dulu tepat sebelum menyimpan, untuk memperkecil
    // kemungkinan konflik jika ada perubahan lain di repo sejak login.
    return ghFetch('/repos/' + state.owner + '/' + state.repo + '/contents/' + encodePath(state.path) + '?ref=' + encodeURIComponent(state.branch))
      .then(function (data) {
        var body = {
          message: message || 'Update data/db.json via Panel Admin',
          content: b64EncodeUnicode(JSON.stringify(newDb, null, 2)),
          sha: data.sha,
          branch: state.branch
        };
        return ghFetch('/repos/' + state.owner + '/' + state.repo + '/contents/' + encodePath(state.path), {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      })
      .then(function (result) {
        if (result.content && result.content.sha) state.sha = result.content.sha;
        return result;
      });
  }

  /* Diekspos supaya bagian file berikutnya (render & CRUD) bisa memakai
     variabel/fungsi di atas tanpa membungkus ulang semuanya. */
  window.__roxyAdminCore = {
    state: state, TAB_TITLES: TAB_TITLES, MEDIA_TABS: MEDIA_TABS,
    escAttr: escAttr, escHtml: escHtml,
    saveConfigToStorage: saveConfigToStorage, loadConfigFromStorage: loadConfigFromStorage,
    clearTokenStorage: clearTokenStorage,
    ghFetch: ghFetch, checkConnection: checkConnection,
    getDbFile: getDbFile, saveDbFile: saveDbFile
  };

})();
// =======================================================================
// BAGIAN 2: UI — login flow, navigasi tab, render & CRUD tiap koleksi.
// Memakai variabel/fungsi dari window.__roxyAdminCore (lihat Bagian 1).
// =======================================================================
(function () {
  'use strict';

  var core = window.__roxyAdminCore;
  var state = core.state;
  var esc = core.escAttr;

  function $(id) { return document.getElementById(id); }
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function lower(s) { return String(s || '').toLowerCase(); }

  /* ---------------------------------------------------------------
     TOAST NOTIFIKASI
     --------------------------------------------------------------- */
  var toastTimer = null;
  function toast(message, type) {
    var el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'admin-toast admin-toast--' + (type || 'success');
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 4500);
  }

  /* ---------------------------------------------------------------
     LOGIN VIEW: alert helper & form handling
     --------------------------------------------------------------- */
  function showLoginAlert(message, type) {
    var el = $('loginAlert');
    if (!message) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = message;
    el.className = 'admin-alert' + (type ? ' admin-alert--' + type : '');
  }

  function readFormIntoState() {
    state.owner = $('fOwner').value.trim();
    state.repo = $('fRepo').value.trim();
    state.branch = $('fBranch').value.trim() || 'main';
    state.path = $('fPath').value.trim() || 'data/db.json';
    state.token = $('fToken').value.trim();
    state.rememberToken = $('fRemember').checked;
  }

  function fillFormFromState() {
    $('fOwner').value = state.owner || '';
    $('fRepo').value = state.repo || '';
    $('fBranch').value = state.branch || 'main';
    $('fPath').value = state.path || 'data/db.json';
    $('fToken').value = state.token || '';
    $('fRemember').checked = !!state.rememberToken;
  }

  function setLoginLoading(loading) {
    var btn = qs('#loginForm button[type="submit"]');
    var testBtn = $('testConnBtn');
    if (btn) { btn.disabled = loading; btn.textContent = loading ? 'Memeriksa…' : 'Login'; }
    if (testBtn) testBtn.disabled = loading;
  }

  function doLogin() {
    readFormIntoState();
    core.saveConfigToStorage();
    showLoginAlert('', null);
    setLoginLoading(true);

    core.checkConnection().then(function (conn) {
      state.username = conn.username;
      if (!conn.canPush) {
        throw new Error('Token valid, tapi akun ini tidak punya akses tulis (push) ke repository tersebut. Pastikan permission "Contents: Read and write" sudah diberikan pada token.');
      }
      return core.getDbFile().then(function (db) { return { db: db, conn: conn }; });
    }).then(function (result) {
      state.db = result.db;
      if (!state.db.admins) state.db.admins = [];
      var admins = state.db.admins;
      var isAllowed = admins.length === 0 || admins.map(lower).indexOf(lower(state.username)) !== -1;
      if (!isAllowed) {
        throw new Error('Akun GitHub "' + state.username + '" tidak terdaftar sebagai admin di data/db.json. Minta admin lain menambahkan username Anda lewat tab Manajemen User.');
      }
      enterDashboard(result.conn);
      if (admins.length === 0) {
        toast('Anda masuk sebagai admin pertama (daftar admin masih kosong). Segera tambahkan username Anda di tab "Manajemen User".', 'success');
      }
    }).catch(function (err) {
      showLoginAlert(err.message, 'error');
    }).finally(function () {
      setLoginLoading(false);
    });
  }

  function doTestConnection() {
    readFormIntoState();
    showLoginAlert('Memeriksa koneksi ke GitHub…', null);
    core.checkConnection().then(function (conn) {
      var msg = '✅ Terhubung sebagai "' + conn.username + '". Akses tulis ke ' + conn.repoFullName + ': ' +
        (conn.canPush ? 'Ya' : 'Tidak — periksa permission token') + '. Sisa kuota API: ' + conn.rateRemaining + '/' + conn.rateLimit + '.';
      showLoginAlert(msg, conn.canPush ? 'success' : 'warn');
    }).catch(function (err) {
      showLoginAlert('❌ ' + err.message, 'error');
    });
  }

  function logout() {
    core.clearTokenStorage();
    state.db = null; state.sha = null; state.username = null;
    $('dashboardView').hidden = true;
    $('loginView').hidden = false;
    showLoginAlert('', null);
  }

  /* ---------------------------------------------------------------
     MASUK DASHBOARD & NAVIGASI TAB
     --------------------------------------------------------------- */
  function enterDashboard(conn) {
    $('loginView').hidden = true;
    $('dashboardView').hidden = false;
    $('sidebarUser').textContent = '👤 ' + state.username + '\n' + state.owner + '/' + state.repo + ' (' + state.branch + ')';
    renderConnBadge(conn);
    renderAllTabs();
    switchTab('dashboard');
  }

  function renderConnBadge(conn) {
    var badge = $('connBadge');
    if (!badge) return;
    if (conn && conn.canPush) {
      badge.textContent = '● Terhubung (' + conn.rateRemaining + '/' + conn.rateLimit + ' kuota API)';
      badge.className = 'admin-badge admin-badge--ok';
    } else if (conn) {
      badge.textContent = '● Terhubung, tanpa akses tulis';
      badge.className = 'admin-badge admin-badge--error';
    } else {
      badge.textContent = '● Status tidak diketahui';
      badge.className = 'admin-badge';
    }
  }

  function switchTab(tab) {
    qsa('.admin-nav__item').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-tab') === tab); });
    qsa('.admin-tab').forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-tab-panel') === tab); });
    $('tabTitle').textContent = core.TAB_TITLES[tab] || tab;
    if (tab === 'dashboard') renderDashboard();
    if (tab === 'connection') renderConnectionTab();
  }

  /* ---------------------------------------------------------------
     TAB: DASHBOARD
     --------------------------------------------------------------- */
  function renderDashboard() {
    var db = state.db;
    var stats = [
      { n: (db.hero || []).length, label: 'Hero Slides' },
      { n: (db.officeGallery || []).length, label: 'Foto Office Space' },
      { n: (db.trainingFacility || []).length, label: 'Foto Training' },
      { n: (db.tenants || []).length, label: 'Tenants' },
      { n: (db.pricing || []).length, label: 'Paket Harga' },
      { n: (db.access || []).length, label: 'Kategori Akses' },
      { n: (db.admins || []).length, label: 'Admin Terdaftar' }
    ];
    $('dashboardStats').innerHTML = stats.map(function (s) {
      return '<div class="admin-stat-card"><strong>' + s.n + '</strong><span>' + esc(s.label) + '</span></div>';
    }).join('');
  }

  /* ---------------------------------------------------------------
     TAB: CEK KONEKSI
     --------------------------------------------------------------- */
  function renderConnectionTab() {
    var box = $('connDetails');
    box.innerHTML = 'Memeriksa koneksi...';
    core.checkConnection().then(function (conn) {
      renderConnBadge(conn);
      box.innerHTML =
        '<p><strong>Login sebagai:</strong> ' + esc(conn.username) + '</p>' +
        '<p><strong>Repository:</strong> ' + esc(conn.repoFullName) + ' (branch default: ' + esc(conn.defaultBranch) + ')</p>' +
        '<p><strong>Akses tulis (push):</strong> ' + (conn.canPush ? '✅ Ya' : '❌ Tidak — perbarui permission token Anda') + '</p>' +
        '<p><strong>Sisa kuota API:</strong> ' + conn.rateRemaining + ' / ' + conn.rateLimit + '</p>';
    }).catch(function (err) {
      renderConnBadge(null);
      box.innerHTML = '<p style="color:#991b1b;">❌ ' + esc(err.message) + '</p>';
    });
  }
  $('recheckConnBtn') && $('recheckConnBtn').addEventListener('click', renderConnectionTab);

  /* ---------------------------------------------------------------
     SIMPAN KE GITHUB (dipakai semua tombol "Simpan ke GitHub")
     --------------------------------------------------------------- */
  function saveCollection(label, btn) {
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Menyimpan…';
    core.saveDbFile(state.db, 'Update ' + label + ' via Panel Admin').then(function () {
      toast('Perubahan "' + label + '" berhasil disimpan ke GitHub. GitHub Pages akan membangun ulang situs dalam ~30-60 detik.', 'success');
    }).catch(function (err) {
      toast('Gagal menyimpan: ' + err.message, 'error');
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = originalText;
    });
  }

  qsa('.admin-save-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { saveCollection(btn.getAttribute('data-save'), btn); });
  });

  /* ---------------------------------------------------------------
     GENERIC: MEDIA COLLECTION (Office Space / Training / Tenants)
     Field: image, alt, title, desc
     --------------------------------------------------------------- */
  function renderMediaList(dbKey, listElId) {
    var arr = state.db[dbKey] || (state.db[dbKey] = []);
    var el = $(listElId);
    if (!el) return;
    el.innerHTML = arr.map(function (item, i) {
      var thumb = item.image ? '<img class="admin-item-card__thumb" src="../' + esc(item.image) + '" alt="">' : '';
      return '' +
        '<div class="admin-item-card" data-index="' + i + '">' +
          '<div class="admin-item-card__head">' +
            '<strong>Item #' + (i + 1) + '</strong>' +
            '<div class="admin-item-card__actions">' +
              '<button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete" title="Hapus">🗑</button>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;">' +
            thumb +
            '<div style="flex:1;min-width:200px;">' +
              '<div class="admin-form__field"><label>Path Gambar</label><input data-field="image" value="' + esc(item.image) + '" placeholder="images/nama-file.png"></div>' +
              '<div class="admin-form__field"><label>Alt Text</label><input data-field="alt" value="' + esc(item.alt) + '"></div>' +
            '</div>' +
          '</div>' +
          '<div class="admin-form__field"><label>Judul (ditampilkan di Lightbox)</label><input data-field="title" value="' + esc(item.title) + '"></div>' +
          '<div class="admin-form__field"><label>Deskripsi (ditampilkan di Lightbox)</label><textarea data-field="desc">' + esc(item.desc) + '</textarea></div>' +
        '</div>';
    }).join('') || '<p class="admin-tab__desc">Belum ada data. Klik "+ Tambah" untuk menambahkan.</p>';
  }

  function bindMediaListEvents(dbKey, listElId) {
    var el = $(listElId);
    if (!el) return;
    el.addEventListener('input', function (e) {
      var field = e.target.getAttribute('data-field');
      if (!field) return;
      var card = e.target.closest('.admin-item-card');
      var idx = parseInt(card.getAttribute('data-index'), 10);
      state.db[dbKey][idx][field] = e.target.value;
      if (field === 'image') {
        var img = card.querySelector('.admin-item-card__thumb');
        if (img) img.setAttribute('src', '../' + e.target.value);
      }
    });
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="delete"]');
      if (!btn) return;
      var card = btn.closest('.admin-item-card');
      var idx = parseInt(card.getAttribute('data-index'), 10);
      if (confirm('Hapus item ini?')) {
        state.db[dbKey].splice(idx, 1);
        renderMediaList(dbKey, listElId);
      }
    });
  }

  function makeBlankMediaItem(prefix) {
    var n = Date.now();
    return { id: prefix + '-' + n, image: '', alt: '', title: '', desc: '' };
  }

  /* ---------------------------------------------------------------
     TAB: HERO SLIDER
     Field: eyebrow, titlePrefix, titleAccent, titleSuffix, desc, image, alt
     --------------------------------------------------------------- */
  function renderHeroList() {
    var arr = state.db.hero || (state.db.hero = []);
    var el = $('list-hero');
    if (!el) return;
    el.innerHTML = arr.map(function (item, i) {
      var thumb = item.image ? '<img class="admin-item-card__thumb" src="../' + esc(item.image) + '" alt="">' : '';
      return '' +
        '<div class="admin-item-card" data-index="' + i + '">' +
          '<div class="admin-item-card__head">' +
            '<strong>Slide #' + (i + 1) + '</strong>' +
            '<div class="admin-item-card__actions">' +
              '<button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete" title="Hapus">🗑</button>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;">' +
            thumb +
            '<div style="flex:1;min-width:200px;">' +
              '<div class="admin-form__field"><label>Path Gambar</label><input data-field="image" value="' + esc(item.image) + '" placeholder="images/nama-file.png"></div>' +
              '<div class="admin-form__field"><label>Alt Text Gambar</label><input data-field="alt" value="' + esc(item.alt) + '"></div>' +
            '</div>' +
          '</div>' +
          '<div class="admin-form__field"><label>Eyebrow (teks kecil di atas judul)</label><input data-field="eyebrow" value="' + esc(item.eyebrow) + '"></div>' +
          '<div class="admin-form__row--split" style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;">' +
            '<div class="admin-form__field"><label>Judul (sebelum aksen)</label><input data-field="titlePrefix" value="' + esc(item.titlePrefix) + '"></div>' +
            '<div class="admin-form__field"><label>Judul Aksen (oranye)</label><input data-field="titleAccent" value="' + esc(item.titleAccent) + '"></div>' +
          '</div>' +
          '<div class="admin-form__field"><label>Judul Lanjutan (boleh pakai tag &lt;br&gt; untuk baris baru)</label><input data-field="titleSuffix" value="' + esc(item.titleSuffix) + '"></div>' +
          '<div class="admin-form__field"><label>Deskripsi</label><textarea data-field="desc">' + esc(item.desc) + '</textarea></div>' +
        '</div>';
    }).join('') || '<p class="admin-tab__desc">Belum ada slide. Klik "+ Tambah Slide" untuk menambahkan.</p>';
  }

  function bindHeroListEvents() {
    var el = $('list-hero');
    if (!el) return;
    el.addEventListener('input', function (e) {
      var field = e.target.getAttribute('data-field');
      if (!field) return;
      var card = e.target.closest('.admin-item-card');
      var idx = parseInt(card.getAttribute('data-index'), 10);
      state.db.hero[idx][field] = e.target.value;
      if (field === 'image') {
        var img = card.querySelector('.admin-item-card__thumb');
        if (img) img.setAttribute('src', '../' + e.target.value);
      }
    });
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="delete"]');
      if (!btn) return;
      var card = btn.closest('.admin-item-card');
      var idx = parseInt(card.getAttribute('data-index'), 10);
      if (confirm('Hapus slide ini?')) {
        state.db.hero.splice(idx, 1);
        renderHeroList();
      }
    });
  }

  /* ---------------------------------------------------------------
     TAB: PRICELIST
     Field: name, note, price, unit, highlight(bool), badge, features[], cta
     --------------------------------------------------------------- */
  function renderPricingList() {
    var arr = state.db.pricing || (state.db.pricing = []);
    var el = $('list-pricing');
    if (!el) return;
    el.innerHTML = arr.map(function (item, i) {
      var features = (item.features || []).map(function (f, fi) {
        return '<div class="admin-feature-list__row" data-feature-index="' + fi + '">' +
          '<input data-feature-field="text" value="' + esc(f) + '">' +
          '<button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete-feature" title="Hapus baris">✕</button>' +
        '</div>';
      }).join('');
      return '' +
        '<div class="admin-item-card" data-index="' + i + '">' +
          '<div class="admin-item-card__head">' +
            '<strong>Paket #' + (i + 1) + '</strong>' +
            '<div class="admin-item-card__actions">' +
              '<button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete" title="Hapus paket">🗑</button>' +
            '</div>' +
          '</div>' +
          '<div class="admin-form__row--split" style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;">' +
            '<div class="admin-form__field"><label>Nama Paket</label><input data-field="name" value="' + esc(item.name) + '"></div>' +
            '<div class="admin-form__field"><label>Catatan Kecil</label><input data-field="note" value="' + esc(item.note) + '"></div>' +
          '</div>' +
          '<div class="admin-form__row--split" style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;">' +
            '<div class="admin-form__field"><label>Harga (mis. Rp.500rb)</label><input data-field="price" value="' + esc(item.price) + '"></div>' +
            '<div class="admin-form__field"><label>Satuan (mis. /bulan)</label><input data-field="unit" value="' + esc(item.unit) + '"></div>' +
          '</div>' +
          '<label class="admin-checkbox"><input type="checkbox" data-field="highlight" ' + (item.highlight ? 'checked' : '') + '><span>Tandai sebagai paket unggulan (highlight)</span></label>' +
          '<div class="admin-form__field"><label>Teks Badge (tampil jika di-highlight, mis. "Paling Populer")</label><input data-field="badge" value="' + esc(item.badge) + '"></div>' +
          '<div class="admin-form__field"><label>Daftar Fitur</label>' +
            '<div class="admin-feature-list">' + features + '</div>' +
            '<button type="button" class="admin-icon-btn" data-action="add-feature" title="Tambah fitur" style="width:auto;padding:0 0.6rem;">+ Tambah Fitur</button>' +
          '</div>' +
          '<div class="admin-form__field"><label>Teks Tombol (CTA)</label><input data-field="cta" value="' + esc(item.cta) + '"></div>' +
        '</div>';
    }).join('') || '<p class="admin-tab__desc">Belum ada paket harga. Klik "+ Tambah Paket" untuk menambahkan.</p>';
  }

  function bindPricingListEvents() {
    var el = $('list-pricing');
    if (!el) return;
    el.addEventListener('input', function (e) {
      var card = e.target.closest('.admin-item-card');
      if (!card) return;
      var idx = parseInt(card.getAttribute('data-index'), 10);
      var item = state.db.pricing[idx];

      var featureField = e.target.getAttribute('data-feature-field');
      if (featureField) {
        var row = e.target.closest('[data-feature-index]');
        var fi = parseInt(row.getAttribute('data-feature-index'), 10);
        item.features[fi] = e.target.value;
        return;
      }
      var field = e.target.getAttribute('data-field');
      if (!field) return;
      if (field === 'highlight') { item.highlight = e.target.checked; return; }
      item[field] = e.target.value;
    });
    el.addEventListener('click', function (e) {
      var card = e.target.closest('.admin-item-card');
      if (!card) return;
      var idx = parseInt(card.getAttribute('data-index'), 10);
      var item = state.db.pricing[idx];

      if (e.target.closest('[data-action="delete"]')) {
        if (confirm('Hapus paket ini?')) { state.db.pricing.splice(idx, 1); renderPricingList(); }
        return;
      }
      if (e.target.closest('[data-action="add-feature"]')) {
        item.features = item.features || [];
        item.features.push('');
        renderPricingList();
        return;
      }
      if (e.target.closest('[data-action="delete-feature"]')) {
        var row = e.target.closest('[data-feature-index]');
        var fi = parseInt(row.getAttribute('data-feature-index'), 10);
        item.features.splice(fi, 1);
        renderPricingList();
        return;
      }
    });
  }

  /* ---------------------------------------------------------------
     TAB: ACCESS / LOKASI
     Field: category, items[] = {title, desc}
     --------------------------------------------------------------- */
  function renderAccessList() {
    var arr = state.db.access || (state.db.access = []);
    var el = $('list-access');
    if (!el) return;
    el.innerHTML = arr.map(function (cat, ci) {
      var items = (cat.items || []).map(function (it, ii) {
        return '' +
          '<div class="admin-subcard" data-item-index="' + ii + '">' +
            '<div class="admin-subcard__head">' +
              '<strong>Baris #' + (ii + 1) + '</strong>' +
              '<button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete-item" title="Hapus baris">✕</button>' +
            '</div>' +
            '<div class="admin-form__row--split" style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">' +
              '<div class="admin-form__field"><label>Judul</label><input data-item-field="title" value="' + esc(it.title) + '"></div>' +
              '<div class="admin-form__field"><label>Deskripsi</label><input data-item-field="desc" value="' + esc(it.desc) + '"></div>' +
            '</div>' +
          '</div>';
      }).join('');
      return '' +
        '<div class="admin-item-card" data-index="' + ci + '">' +
          '<div class="admin-item-card__head">' +
            '<strong>Kategori #' + (ci + 1) + '</strong>' +
            '<div class="admin-item-card__actions">' +
              '<button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete" title="Hapus kategori">🗑</button>' +
            '</div>' +
          '</div>' +
          '<div class="admin-form__field"><label>Nama Kategori (mis. BUS & APTB)</label><input data-field="category" value="' + esc(cat.category) + '"></div>' +
          items +
          '<button type="button" class="admin-icon-btn" data-action="add-item" title="Tambah baris" style="width:auto;padding:0 0.6rem;">+ Tambah Baris</button>' +
        '</div>';
    }).join('') || '<p class="admin-tab__desc">Belum ada kategori akses. Klik "+ Tambah Kategori" untuk menambahkan.</p>';
  }

  function bindAccessListEvents() {
    var el = $('list-access');
    if (!el) return;
    el.addEventListener('input', function (e) {
      var card = e.target.closest('.admin-item-card');
      if (!card) return;
      var ci = parseInt(card.getAttribute('data-index'), 10);
      var cat = state.db.access[ci];

      var itemField = e.target.getAttribute('data-item-field');
      if (itemField) {
        var sub = e.target.closest('[data-item-index]');
        var ii = parseInt(sub.getAttribute('data-item-index'), 10);
        cat.items[ii][itemField] = e.target.value;
        return;
      }
      var field = e.target.getAttribute('data-field');
      if (field) cat[field] = e.target.value;
    });
    el.addEventListener('click', function (e) {
      var card = e.target.closest('.admin-item-card');
      if (!card) return;
      var ci = parseInt(card.getAttribute('data-index'), 10);
      var cat = state.db.access[ci];

      if (e.target.closest('[data-action="delete"]')) {
        if (confirm('Hapus kategori ini beserta seluruh isinya?')) { state.db.access.splice(ci, 1); renderAccessList(); }
        return;
      }
      if (e.target.closest('[data-action="add-item"]')) {
        cat.items = cat.items || [];
        cat.items.push({ title: '', desc: '' });
        renderAccessList();
        return;
      }
      if (e.target.closest('[data-action="delete-item"]')) {
        var sub = e.target.closest('[data-item-index]');
        var ii = parseInt(sub.getAttribute('data-item-index'), 10);
        cat.items.splice(ii, 1);
        renderAccessList();
        return;
      }
    });
  }

  /* ---------------------------------------------------------------
     TAB: ABOUT US (objek tunggal, bukan array)
     Field: companyName, image, alt, paragraphs[], officersIntro,
            officers[]={role,name}, vision[], mission[]
     --------------------------------------------------------------- */
  function stringArrayEditor(arr, groupName, placeholder) {
    return (arr || []).map(function (val, i) {
      return '<div class="admin-feature-list__row" data-group="' + groupName + '" data-arr-index="' + i + '">' +
        '<input data-arr-field="1" value="' + esc(val) + '" placeholder="' + esc(placeholder || '') + '">' +
        '<button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete-arr" data-group="' + groupName + '" title="Hapus baris">✕</button>' +
      '</div>';
    }).join('');
  }

  function renderAboutForm() {
    var about = state.db.about || (state.db.about = {});
    var el = $('aboutForm');
    if (!el) return;
    var thumb = about.image ? '<img class="admin-item-card__thumb" src="../' + esc(about.image) + '" alt="">' : '';
    var officers = (about.officers || []).map(function (o, i) {
      return '<div class="admin-subcard" data-officer-index="' + i + '">' +
        '<div class="admin-subcard__head"><strong>Pengurus #' + (i + 1) + '</strong>' +
        '<button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete-officer" title="Hapus">✕</button></div>' +
        '<div class="admin-form__row--split" style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">' +
          '<div class="admin-form__field"><label>Jabatan</label><input data-officer-field="role" value="' + esc(o.role) + '"></div>' +
          '<div class="admin-form__field"><label>Nama</label><input data-officer-field="name" value="' + esc(o.name) + '"></div>' +
        '</div>' +
      '</div>';
    }).join('');

    el.innerHTML =
      '<div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;">' +
        thumb +
        '<div style="flex:1;min-width:200px;">' +
          '<div class="admin-form__field"><label>Path Gambar About Us</label><input id="about_image" value="' + esc(about.image) + '"></div>' +
          '<div class="admin-form__field"><label>Alt Text Gambar</label><input id="about_alt" value="' + esc(about.alt) + '"></div>' +
        '</div>' +
      '</div>' +
      '<div class="admin-form__field"><label>Nama Perusahaan</label><input id="about_companyName" value="' + esc(about.companyName) + '"></div>' +
      '<div class="admin-form__field"><label>Paragraf Profil Perusahaan</label>' +
        '<div class="admin-feature-list" id="about_paragraphs">' + stringArrayEditor(about.paragraphs, 'paragraphs', 'Isi paragraf...') + '</div>' +
        '<button type="button" class="admin-icon-btn" data-action="add-arr" data-group="paragraphs" style="width:auto;padding:0 0.6rem;">+ Tambah Paragraf</button>' +
      '</div>' +
      '<div class="admin-form__field"><label>Kalimat Pembuka Susunan Pengurus</label><textarea id="about_officersIntro">' + esc(about.officersIntro) + '</textarea></div>' +
      '<div class="admin-form__field"><label>Susunan Pengurus</label>' +
        '<div id="about_officers">' + officers + '</div>' +
        '<button type="button" class="admin-icon-btn" data-action="add-officer" style="width:auto;padding:0 0.6rem;">+ Tambah Pengurus</button>' +
      '</div>' +
      '<div class="admin-form__field"><label>Visi (satu baris = satu poin)</label>' +
        '<div class="admin-feature-list" id="about_vision">' + stringArrayEditor(about.vision, 'vision', 'Poin visi...') + '</div>' +
        '<button type="button" class="admin-icon-btn" data-action="add-arr" data-group="vision" style="width:auto;padding:0 0.6rem;">+ Tambah Poin Visi</button>' +
      '</div>' +
      '<div class="admin-form__field"><label>Misi (satu baris = satu poin)</label>' +
        '<div class="admin-feature-list" id="about_mission">' + stringArrayEditor(about.mission, 'mission', 'Poin misi...') + '</div>' +
        '<button type="button" class="admin-icon-btn" data-action="add-arr" data-group="mission" style="width:auto;padding:0 0.6rem;">+ Tambah Poin Misi</button>' +
      '</div>';
  }

  function bindAboutFormEvents() {
    var el = $('aboutForm');
    if (!el) return;
    el.addEventListener('input', function (e) {
      var about = state.db.about;
      if (e.target.id === 'about_image') {
        about.image = e.target.value;
        var img = el.querySelector('.admin-item-card__thumb');
        if (img) img.setAttribute('src', '../' + e.target.value);
        return;
      }
      if (e.target.id === 'about_alt') { about.alt = e.target.value; return; }
      if (e.target.id === 'about_companyName') { about.companyName = e.target.value; return; }
      if (e.target.id === 'about_officersIntro') { about.officersIntro = e.target.value; return; }

      var officerField = e.target.getAttribute('data-officer-field');
      if (officerField) {
        var oi = parseInt(e.target.closest('[data-officer-index]').getAttribute('data-officer-index'), 10);
        about.officers[oi][officerField] = e.target.value;
        return;
      }
      var group = e.target.getAttribute('data-group');
      if (group && e.target.hasAttribute('data-arr-field')) {
        var ai = parseInt(e.target.closest('[data-arr-index]').getAttribute('data-arr-index'), 10);
        about[group][ai] = e.target.value;
      }
    });
    el.addEventListener('click', function (e) {
      var about = state.db.about;
      if (e.target.closest('[data-action="add-officer"]')) {
        about.officers = about.officers || [];
        about.officers.push({ role: '', name: '' });
        renderAboutForm();
        return;
      }
      if (e.target.closest('[data-action="delete-officer"]')) {
        var oi = parseInt(e.target.closest('[data-officer-index]').getAttribute('data-officer-index'), 10);
        about.officers.splice(oi, 1);
        renderAboutForm();
        return;
      }
      var addArr = e.target.closest('[data-action="add-arr"]');
      if (addArr) {
        var g1 = addArr.getAttribute('data-group');
        about[g1] = about[g1] || [];
        about[g1].push('');
        renderAboutForm();
        return;
      }
      var delArr = e.target.closest('[data-action="delete-arr"]');
      if (delArr) {
        var g2 = delArr.getAttribute('data-group');
        var ai2 = parseInt(delArr.closest('[data-arr-index]').getAttribute('data-arr-index'), 10);
        about[g2].splice(ai2, 1);
        renderAboutForm();
        return;
      }
    });
  }

  /* ---------------------------------------------------------------
     TAB: CONTACT & SOSIAL MEDIA (objek tunggal)
     Field: address, email, phones[], whatsapp[], mapEmbedUrl, socials{}
     --------------------------------------------------------------- */
  function renderContactForm() {
    var c = state.db.contact || (state.db.contact = {});
    var s = c.socials || (c.socials = {});
    var el = $('contactForm');
    if (!el) return;
    el.innerHTML =
      '<div class="admin-form__field"><label>Alamat</label><textarea id="contact_address">' + esc(c.address) + '</textarea></div>' +
      '<div class="admin-form__field"><label>Email</label><input id="contact_email" value="' + esc(c.email) + '"></div>' +
      '<div class="admin-form__field"><label>Nomor Telepon (satu baris = satu nomor)</label>' +
        '<div class="admin-feature-list" id="contact_phones">' + stringArrayEditor(c.phones, 'phones', '+62 21xxxxxxx') + '</div>' +
        '<button type="button" class="admin-icon-btn" data-action="add-arr" data-group="phones" style="width:auto;padding:0 0.6rem;">+ Tambah Nomor</button>' +
      '</div>' +
      '<div class="admin-form__field"><label>Nomor WhatsApp (satu baris = satu nomor, nomor pertama dipakai tombol mengambang)</label>' +
        '<div class="admin-feature-list" id="contact_whatsapp">' + stringArrayEditor(c.whatsapp, 'whatsapp', '+628xxxxxxxxxx') + '</div>' +
        '<button type="button" class="admin-icon-btn" data-action="add-arr" data-group="whatsapp" style="width:auto;padding:0 0.6rem;">+ Tambah Nomor</button>' +
      '</div>' +
      '<div class="admin-form__field"><label>URL Embed Google Maps</label><textarea id="contact_mapEmbedUrl" placeholder="https://www.google.com/maps/embed?...">' + esc(c.mapEmbedUrl) + '</textarea></div>' +
      '<div class="admin-form__row--split" style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;">' +
        '<div class="admin-form__field"><label>Link Facebook</label><input data-social="facebook" value="' + esc(s.facebook) + '"></div>' +
        '<div class="admin-form__field"><label>Link X (Twitter)</label><input data-social="x" value="' + esc(s.x) + '"></div>' +
        '<div class="admin-form__field"><label>Link Instagram</label><input data-social="instagram" value="' + esc(s.instagram) + '"></div>' +
        '<div class="admin-form__field"><label>Link TikTok</label><input data-social="tiktok" value="' + esc(s.tiktok) + '"></div>' +
        '<div class="admin-form__field"><label>Link Threads</label><input data-social="threads" value="' + esc(s.threads) + '"></div>' +
      '</div>';
  }

  function bindContactFormEvents() {
    var el = $('contactForm');
    if (!el) return;
    el.addEventListener('input', function (e) {
      var c = state.db.contact;
      if (e.target.id === 'contact_address') { c.address = e.target.value; return; }
      if (e.target.id === 'contact_email') { c.email = e.target.value; return; }
      if (e.target.id === 'contact_mapEmbedUrl') { c.mapEmbedUrl = e.target.value; return; }
      var social = e.target.getAttribute('data-social');
      if (social) { c.socials[social] = e.target.value; return; }
      var group = e.target.getAttribute('data-group');
      if (group && e.target.hasAttribute('data-arr-field')) {
        var ai = parseInt(e.target.closest('[data-arr-index]').getAttribute('data-arr-index'), 10);
        c[group][ai] = e.target.value;
      }
    });
    el.addEventListener('click', function (e) {
      var c = state.db.contact;
      var addArr = e.target.closest('[data-action="add-arr"]');
      if (addArr) {
        var g1 = addArr.getAttribute('data-group');
        c[g1] = c[g1] || [];
        c[g1].push('');
        renderContactForm();
        return;
      }
      var delArr = e.target.closest('[data-action="delete-arr"]');
      if (delArr) {
        var g2 = delArr.getAttribute('data-group');
        var ai2 = parseInt(delArr.closest('[data-arr-index]').getAttribute('data-arr-index'), 10);
        c[g2].splice(ai2, 1);
        renderContactForm();
        return;
      }
    });
  }

  /* ---------------------------------------------------------------
     TAB: MANAJEMEN USER (daftar username GitHub yang diizinkan)
     --------------------------------------------------------------- */
  function renderAdminsList() {
    var arr = state.db.admins || (state.db.admins = []);
    var el = $('list-admins');
    if (!el) return;
    el.innerHTML = arr.map(function (username, i) {
      var isMe = lower(username) === lower(state.username);
      return '' +
        '<div class="admin-item-card" data-index="' + i + '" style="display:flex;align-items:center;justify-content:space-between;">' +
          '<span>👤 ' + esc(username) + (isMe ? ' <em style="color:var(--color-text-light);font-size:0.8rem;">(Anda)</em>' : '') + '</span>' +
          '<button type="button" class="admin-icon-btn admin-icon-btn--danger" data-action="delete" title="Hapus admin">🗑</button>' +
        '</div>';
    }).join('') || '<p class="admin-tab__desc">Daftar admin masih kosong — mode bootstrap aktif (siapa pun dengan token repo ini bisa login). Tambahkan username Anda sekarang.</p>';
  }

  function bindAdminsListEvents() {
    var el = $('list-admins');
    if (!el) return;
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="delete"]');
      if (!btn) return;
      var card = btn.closest('.admin-item-card');
      var idx = parseInt(card.getAttribute('data-index'), 10);
      var username = state.db.admins[idx];
      if (lower(username) === lower(state.username) && state.db.admins.length === 1) {
        if (!confirm('Anda akan menghapus satu-satunya admin (diri Anda sendiri), sehingga siapa pun dengan token repo ini bisa login lagi (mode bootstrap). Lanjutkan?')) return;
      } else if (!confirm('Hapus "' + username + '" dari daftar admin?')) {
        return;
      }
      state.db.admins.splice(idx, 1);
      renderAdminsList();
    });
  }

  $('addAdminBtn') && $('addAdminBtn').addEventListener('click', function () {
    var input = $('newAdminUsername');
    var username = input.value.trim().replace(/^@/, '');
    if (!username) return;
    state.db.admins = state.db.admins || [];
    if (state.db.admins.map(lower).indexOf(lower(username)) !== -1) {
      toast('Username tersebut sudah ada di daftar admin.', 'error');
      return;
    }
    state.db.admins.push(username);
    input.value = '';
    renderAdminsList();
  });

  /* ---------------------------------------------------------------
     TOMBOL "+ Tambah ..." (data-add) — satu handler untuk semua tab
     --------------------------------------------------------------- */
  qsa('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-add');
      var n = Date.now();
      if (key === 'hero') {
        state.db.hero.push({ id: 'hero-' + n, eyebrow: '', titlePrefix: '', titleAccent: '', titleSuffix: '', desc: '', image: '', alt: '' });
        renderHeroList();
      } else if (key === 'officeGallery' || key === 'trainingFacility' || key === 'tenants') {
        state.db[key].push(makeBlankMediaItem(key));
        var listId = key === 'officeGallery' ? 'list-officeGallery' : (key === 'trainingFacility' ? 'list-trainingFacility' : 'list-tenants');
        renderMediaList(key, listId);
      } else if (key === 'pricing') {
        state.db.pricing.push({ id: 'price-' + n, name: '', note: '', price: '', unit: '', highlight: false, badge: '', features: [], cta: 'Pilih Paket' });
        renderPricingList();
      } else if (key === 'access') {
        state.db.access.push({ id: 'access-' + n, category: '', items: [] });
        renderAccessList();
      }
    });
  });

  /* ---------------------------------------------------------------
     RENDER SEMUA TAB SEKALIGUS (dipanggil sekali setelah login,
     dan setelah setiap operasi Simpan agar tampilan tetap sinkron)
     --------------------------------------------------------------- */
  var eventsBound = false;
  function renderAllTabs() {
    renderHeroList();
    renderMediaList('officeGallery', 'list-officeGallery');
    renderMediaList('trainingFacility', 'list-trainingFacility');
    renderMediaList('tenants', 'list-tenants');
    renderPricingList();
    renderAccessList();
    renderAboutForm();
    renderContactForm();
    renderAdminsList();
    renderDashboard();

    if (!eventsBound) {
      bindHeroListEvents();
      bindMediaListEvents('officeGallery', 'list-officeGallery');
      bindMediaListEvents('trainingFacility', 'list-trainingFacility');
      bindMediaListEvents('tenants', 'list-tenants');
      bindPricingListEvents();
      bindAccessListEvents();
      bindAboutFormEvents();
      bindContactFormEvents();
      bindAdminsListEvents();
      eventsBound = true;
    }
  }

  /* ---------------------------------------------------------------
     WIRING: form login, tombol cek koneksi, logout, navigasi sidebar
     --------------------------------------------------------------- */
  $('loginForm') && $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    doLogin();
  });
  $('testConnBtn') && $('testConnBtn').addEventListener('click', doTestConnection);
  $('logoutBtn') && $('logoutBtn').addEventListener('click', logout);

  $('adminNav') && $('adminNav').addEventListener('click', function (e) {
    var btn = e.target.closest('.admin-nav__item');
    if (!btn) return;
    switchTab(btn.getAttribute('data-tab'));
  });

  /* ---------------------------------------------------------------
     INISIALISASI SAAT HALAMAN DIMUAT
     - Isi ulang form dari config tersimpan (owner/repo/branch/path)
     - Jika token "diingat" ada, coba login otomatis untuk kenyamanan
     --------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    core.loadConfigFromStorage();
    fillFormFromState();
    if (state.token) {
      doLogin();
    }
  });

})();
