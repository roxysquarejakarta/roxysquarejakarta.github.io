// =======================================================================
// SCRIPT.JS — fungsionalitas interaktif landing page
// File ini murni JavaScript biasa (vanilla JS), tidak butuh library
// apapun dan tidak butuh koneksi internet untuk berjalan.
// =======================================================================

document.addEventListener('DOMContentLoaded', function () {

  /* ---------------------------------------------------------------
     1. MENU MOBILE (hamburger)
     --------------------------------------------------------------- */
  var menuBtn = document.getElementById('menuBtn');
  var mobileMenu = document.getElementById('mobileMenu');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () {
      mobileMenu.classList.toggle('is-open');
    });

    // Tutup menu otomatis saat salah satu link diklik
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('is-open');
      });
    });
  }

  /* ---------------------------------------------------------------
     2. CAROUSEL HERO
     - Otomatis berganti slide tiap 5 detik
     - Bisa dikontrol lewat tombol prev/next atau dot navigasi
     --------------------------------------------------------------- */
  var track = document.getElementById('carouselTrack');
  var dotsWrap = document.getElementById('carouselDots');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');

  if (track) {
    var slides = track.querySelectorAll('.slide');
    var total = slides.length;
    var current = 0;
    var autoplayTimer = null;
    var AUTOPLAY_DELAY = 5000; // ubah angka ini (dalam milidetik) untuk mengubah kecepatan autoplay

    function renderDots() {
      dotsWrap.innerHTML = '';
      for (var i = 0; i < total; i++) {
        var dot = document.createElement('button');
        dot.setAttribute('data-index', i);
        dot.addEventListener('click', function (e) {
          var idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
          goToSlide(idx);
          resetAutoplay();
        });
        dotsWrap.appendChild(dot);
      }
    }

    function updateDots() {
      dotsWrap.querySelectorAll('button').forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === current);
      });
    }

    function goToSlide(index) {
      current = (index + total) % total;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      updateDots();
    }

    function nextSlide() { goToSlide(current + 1); }
    function prevSlide() { goToSlide(current - 1); }

    function resetAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      autoplayTimer = setInterval(nextSlide, AUTOPLAY_DELAY);
    }

    if (total > 0) {
      renderDots();
      goToSlide(0);
      resetAutoplay();

      if (nextBtn) nextBtn.addEventListener('click', function () { nextSlide(); resetAutoplay(); });
      if (prevBtn) prevBtn.addEventListener('click', function () { prevSlide(); resetAutoplay(); });

      // Jeda autoplay saat mouse di atas carousel, lanjut lagi saat mouse keluar
      var carouselWrap = document.getElementById('carousel');
      if (carouselWrap) {
        carouselWrap.addEventListener('mouseenter', function () {
          if (autoplayTimer) clearInterval(autoplayTimer);
        });
        carouselWrap.addEventListener('mouseleave', resetAutoplay);
      }
    }
  }

  /* ---------------------------------------------------------------
     3. HIGHLIGHT MENU AKTIF SESUAI SCROLL POSITION
     --------------------------------------------------------------- */
  var sections = document.querySelectorAll('main section[id]');
  var navLinks = document.querySelectorAll('.nav-link');

  function highlightActiveSection() {
    var scrollPos = window.scrollY + 120;
    sections.forEach(function (section) {
      var top = section.offsetTop;
      var bottom = top + section.offsetHeight;
      var id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < bottom) {
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }

  window.addEventListener('scroll', highlightActiveSection);
  highlightActiveSection();

  /* ---------------------------------------------------------------
     4. LIGHTBOX GALERI (Office Space, Training Facility, Tenants)
     - Klik gambar untuk membuka lightbox dengan judul & deskripsi
     - Navigasi dengan tombol prev/next, keyboard, atau klik area luar
     - Grup navigasi dipisah per section (data-group)
     --------------------------------------------------------------- */
  var lightbox = document.getElementById('lightbox');
  var triggers = Array.prototype.slice.call(document.querySelectorAll('.lightbox-trigger'));

  if (lightbox && triggers.length) {
    var lbImg = document.getElementById('lightboxImg');
    var lbTitle = document.getElementById('lightboxTitle');
    var lbDesc = document.getElementById('lightboxDesc');
    var lbCount = document.getElementById('lightboxCount');
    var lbClose = document.getElementById('lightboxClose');
    var lbOverlay = document.getElementById('lightboxOverlay');
    var lbPrev = document.getElementById('lightboxPrev');
    var lbNext = document.getElementById('lightboxNext');

    var currentGroup = [];
    var currentIndex = 0;

    function dataFor(el) {
      var img = el.querySelector('img');
      return {
        src: img ? img.getAttribute('src') : '',
        alt: img ? img.getAttribute('alt') : '',
        title: el.getAttribute('data-title') || (img ? img.getAttribute('alt') : ''),
        desc: el.getAttribute('data-desc') || ''
      };
    }

    function renderSlide() {
      var item = currentGroup[currentIndex];
      var data = dataFor(item);
      lbImg.setAttribute('src', data.src);
      lbImg.setAttribute('alt', data.alt);
      lbTitle.textContent = data.title;
      lbDesc.textContent = data.desc;
      lbCount.textContent = (currentIndex + 1) + ' / ' + currentGroup.length;
    }

    function openLightbox(el) {
      var group = el.getAttribute('data-group') || 'default';
      currentGroup = triggers.filter(function (t) {
        return (t.getAttribute('data-group') || 'default') === group;
      });
      currentIndex = currentGroup.indexOf(el);
      renderSlide();
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }

    function showNext() {
      currentIndex = (currentIndex + 1) % currentGroup.length;
      renderSlide();
    }

    function showPrev() {
      currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
      renderSlide();
    }

    triggers.forEach(function (el) {
      el.addEventListener('click', function () { openLightbox(el); });
    });

    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    if (lbOverlay) lbOverlay.addEventListener('click', closeLightbox);
    if (lbNext) lbNext.addEventListener('click', showNext);
    if (lbPrev) lbPrev.addEventListener('click', showPrev);

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'ArrowLeft') showPrev();
    });
  }

});
