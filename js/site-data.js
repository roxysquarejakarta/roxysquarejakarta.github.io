// =======================================================================
// SITE-DATA.JS — memuat data/db.json dan merender seluruh konten dinamis
// (hero slider, galeri, tenant, harga, akses, about us, kontak, footer).
//
// File ini HARUS dimuat SEBELUM js/script.js pada index.html, karena
// setelah render selesai, file ini memanggil window.RoxySite.initCarousel()
// dan window.RoxySite.initLightbox() yang didefinisikan di script.js.
//
// Konten di data/db.json diperbarui melalui Panel Admin (admin/index.html),
// yang menyimpan perubahan langsung ke file ini di GitHub lewat GitHub API.
// =======================================================================

(function () {

  var DATA_URL = 'data/db.json';

  /* Escape teks biasa (alt, deskripsi) supaya aman disisipkan sebagai HTML.
     Field "rich" tertentu (judul hero) sengaja TIDAK di-escape agar admin
     bisa memakai tag sederhana seperti <br>. */
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function byId(id) { return document.getElementById(id); }

  /* ---------------------------------------------------------------
     RENDER: HERO / CAROUSEL
     --------------------------------------------------------------- */
  function renderHero(list) {
    var track = byId('carouselTrack');
    if (!track || !Array.isArray(list)) return;
    track.innerHTML = list.map(function (s) {
      return '' +
        '<div class="slide">' +
          '<div class="slide__content">' +
            '<p class="eyebrow">' + esc(s.eyebrow) + '</p>' +
            '<h1>' + esc(s.titlePrefix) + ' <span class="text-accent">' + esc(s.titleAccent) + '</span> ' + (s.titleSuffix || '') + '</h1>' +
            '<p class="slide__desc">' + esc(s.desc) + '</p>' +
          '</div>' +
          '<div class="slide__media">' +
            '<img src="' + esc(s.image) + '" alt="' + esc(s.alt) + '">' +
          '</div>' +
        '</div>';
    }).join('');
  }

  /* ---------------------------------------------------------------
     RENDER: KOLEKSI GAMBAR DENGAN LIGHTBOX
     (dipakai untuk Office Space, Training Facility, dan Tenants)
     --------------------------------------------------------------- */
  function renderMediaCollection(containerId, list, itemClass, group) {
    var el = byId(containerId);
    if (!el || !Array.isArray(list)) return;
    el.innerHTML = list.map(function (item) {
      return '' +
        '<div class="' + itemClass + ' lightbox-trigger" data-group="' + group + '" ' +
             'data-title="' + esc(item.title) + '" data-desc="' + esc(item.desc) + '">' +
          '<img src="' + esc(item.image) + '" alt="' + esc(item.alt) + '">' +
        '</div>';
    }).join('');
  }

  /* ---------------------------------------------------------------
     RENDER: PRICELIST
     --------------------------------------------------------------- */
  function renderPricing(list) {
    var el = byId('pricingGrid');
    if (!el || !Array.isArray(list)) return;
    el.innerHTML = list.map(function (p) {
      var cardClass = 'price-card' + (p.highlight ? ' price-card--highlight' : '');
      var badge = (p.highlight && p.badge) ? '<p class="price-card__badge">' + esc(p.badge) + '</p>' : '';
      var features = (p.features || []).map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
      var btnClass = p.highlight ? 'btn btn--primary' : 'btn btn--outline';
      return '' +
        '<div class="' + cardClass + '">' +
          badge +
          '<p class="price-card__name">' + esc(p.name) + '</p>' +
          '<p class="price-card__note">' + esc(p.note) + '</p>' +
          '<p class="price-card__price">' + esc(p.price) + '<span>' + esc(p.unit) + '</span></p>' +
          '<ul class="price-card__features">' + features + '</ul>' +
          '<a href="#kontak" class="' + btnClass + '">' + esc(p.cta || 'Pilih Paket') + '</a>' +
        '</div>';
    }).join('');
  }

  /* ---------------------------------------------------------------
     RENDER: AKSES / LOKASI
     --------------------------------------------------------------- */
  function renderAccess(list) {
    var el = byId('accessGrid');
    if (!el || !Array.isArray(list)) return;
    el.innerHTML = list.map(function (cat) {
      var items = (cat.items || []).map(function (it) {
        return '' +
          '<div class="access-item">' +
            '<p class="access-item__title">' + esc(it.title) + '</p>' +
            '<p class="access-item__desc">' + esc(it.desc) + '</p>' +
          '</div>';
      }).join('');
      return '<div class="access-card"><h3>' + esc(cat.category) + '</h3>' + items + '</div>';
    }).join('');
  }

  /* ---------------------------------------------------------------
     RENDER: ABOUT US + VISI/MISI
     --------------------------------------------------------------- */
  function renderAbout(about) {
    if (!about) return;

    var media = byId('aboutMedia');
    if (media) {
      media.innerHTML = '<img src="' + esc(about.image) + '" alt="' + esc(about.alt) + '">';
    }

    var nameEl = byId('aboutCompanyName');
    if (nameEl) nameEl.textContent = about.companyName || '';

    var paraEl = byId('aboutParagraphs');
    if (paraEl && Array.isArray(about.paragraphs)) {
      paraEl.innerHTML = about.paragraphs.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    }

    var introEl = byId('aboutOfficersIntro');
    if (introEl) introEl.textContent = about.officersIntro || '';

    var listEl = byId('aboutOfficersList');
    if (listEl && Array.isArray(about.officers)) {
      listEl.innerHTML = about.officers.map(function (o) {
        return '<li>' + esc(o.role) + ': ' + esc(o.name) + '</li>';
      }).join('');
    }

    var visionEl = byId('visionList');
    if (visionEl && Array.isArray(about.vision)) {
      visionEl.innerHTML = about.vision.map(function (v) { return '<p>&quot;' + esc(v) + '&quot;</p>'; }).join('');
    }

    var missionEl = byId('missionList');
    if (missionEl && Array.isArray(about.mission)) {
      missionEl.innerHTML = about.mission.map(function (m) { return '<p>&quot;' + esc(m) + '&quot;</p>'; }).join('');
    }
  }

  /* ---------------------------------------------------------------
     RENDER: KONTAK, FOOTER, TOMBOL WHATSAPP MENGAMBANG
     --------------------------------------------------------------- */
  function renderContact(contact) {
    if (!contact) return;

    var map = byId('contactMapFrame');
    if (map && contact.mapEmbedUrl) map.setAttribute('src', contact.mapEmbedUrl);

    var addr = byId('footerAddress');
    if (addr) addr.textContent = contact.address || '';

    var email = byId('footerEmail');
    if (email) email.textContent = contact.email || '';

    var phones = byId('footerPhones');
    if (phones) phones.textContent = (contact.phones || []).join(' / ');

    var wa = byId('footerWhatsapp');
    if (wa) wa.textContent = (contact.whatsapp || []).join(' / ');

    var socials = contact.socials || {};
    var socialMap = {
      socialFacebook: socials.facebook,
      socialX: socials.x,
      socialInstagram: socials.instagram,
      socialTiktok: socials.tiktok,
      socialThreads: socials.threads
    };
    Object.keys(socialMap).forEach(function (id) {
      var a = byId(id);
      if (a && socialMap[id]) a.setAttribute('href', socialMap[id]);
    });

    var waBtn = byId('floatWaBtn');
    if (waBtn && contact.whatsapp && contact.whatsapp[0]) {
      var num = contact.whatsapp[0].replace(/[^0-9]/g, '');
      waBtn.setAttribute('href', 'https://wa.me/' + num);
    }
  }

  function renderFooterCopyright(footer) {
    var el = byId('footerCopyright');
    if (el && footer && footer.copyright) el.innerHTML = footer.copyright;
  }

  /* ---------------------------------------------------------------
     MUAT DATA & JALANKAN SEMUA RENDER, LALU INIT FITUR INTERAKTIF
     --------------------------------------------------------------- */
  function renderAll(db) {
    renderHero(db.hero);
    renderMediaCollection('officeGallery', db.officeGallery, 'gallery__item', 'office');
    renderMediaCollection('trainingFacility', db.trainingFacility, 'facility-grid__item', 'training');
    renderMediaCollection('tenantsGrid', db.tenants, 'partner', 'tenant');
    renderPricing(db.pricing);
    renderAccess(db.access);
    renderAbout(db.about);
    renderContact(db.contact);
    renderFooterCopyright(db.footer);

    // Fitur interaktif ini butuh markup hasil render di atas, jadi
    // baru dijalankan SETELAH semua innerHTML di atas selesai diisi.
    if (window.RoxySite) {
      if (typeof window.RoxySite.initCarousel === 'function') window.RoxySite.initCarousel();
      if (typeof window.RoxySite.initLightbox === 'function') window.RoxySite.initLightbox();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch(DATA_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Gagal memuat ' + DATA_URL + ' (status ' + res.status + ')');
        return res.json();
      })
      .then(function (db) {
        window.RoxySiteDB = db; // simpan referensi, siapa tahu berguna untuk debugging
        renderAll(db);
      })
      .catch(function (err) {
        console.error('[site-data.js]', err);
        // Fallback sederhana: beri tahu pengunjung tanpa merusak seluruh halaman.
        var track = byId('carouselTrack');
        if (track) {
          track.innerHTML = '<div class="slide"><div class="slide__content">' +
            '<p class="eyebrow">Roxy Square Jakarta</p>' +
            '<h1>Konten sedang tidak dapat dimuat</h1>' +
            '<p class="slide__desc">Pastikan file data/db.json tersedia di repository ini.</p>' +
            '</div></div>';
        }
      });
  });

})();
