PANDUAN PENGGUNAAN TEMPLATE LANDING PAGE
=========================================

STRUKTUR FILE
-------------
index.html      -> Struktur & konten halaman (teks, judul, section)
css/style.css   -> Semua tampilan (warna, ukuran, jarak, responsif)
js/script.js    -> Fungsionalitas (menu mobile, carousel, highlight menu)
images/         -> Taruh semua file foto/logo Anda di folder ini

Buka index.html langsung di browser (double click) untuk melihat hasilnya.
Template ini 100% statis, tidak butuh internet maupun server untuk berjalan.


1. MENGGANTI TEKS
------------------
Buka index.html dengan text editor (Notepad, VS Code, dll), lalu cari
kalimat yang ingin diganti dan tulis ulang. Semua bagian yang perlu
diisi sudah diberi komentar <!-- ... --> untuk memandu Anda.


2. MENGGANTI GAMBAR
--------------------
Setiap tempat gambar saat ini berupa kotak abu-abu putus-putus
(class="placeholder-img") dengan tulisan seperti "Gambar Hero 1".

Cara menggantinya:
  a. Simpan file foto Anda ke folder images/ (misal: images/hero-1.jpg)
  b. Di index.html, ganti isi <div class="placeholder-img">...</div>
     dengan tag gambar, contoh:

     SEBELUM:
       <div class="slide__media placeholder-img">
         <span>Gambar Hero 1</span>
       </div>

     SESUDAH:
       <div class="slide__media">
         <img src="images/hero-1.jpg" alt="Deskripsi gambar">
       </div>

Rekomendasi ukuran gambar (opsional, tidak wajib persis):
  - Logo            : 200 x 80 px  (PNG transparan)
  - Gambar Hero      : 1000 x 800 px
  - Foto Galeri      : 800 x 600 px
  - Foto Fasilitas   : 1000 x 750 px
  - Logo Mitra       : 300 x 200 px
  - Foto Tentang Kami: 600 x 700 px


3. MENGGANTI IKON
------------------
Ikon (menu hamburger, telepon, email, sosial media, dll) dibuat
dengan SVG langsung di dalam index.html, bukan file gambar terpisah,
supaya tetap tajam di semua ukuran layar dan mudah diganti warnanya
lewat CSS (var(--color-accent) dsb).

Jika ingin mengganti bentuk ikon, cari kode <svg>...</svg> yang
sesuai di index.html dan ganti dengan kode SVG ikon lain (misalnya
dari situs ikon gratis seperti Lucide Icons atau Heroicons — unduh
file SVG-nya lalu salin isinya ke sini).


4. MENGGANTI WARNA & FONT
---------------------------
Buka css/style.css, lihat bagian paling atas ":root { ... }".
Ubah kode warna (hex) di sana untuk mengubah warna di SELURUH halaman
sekaligus, tanpa perlu mengedit bagian lain. Contoh:

  --color-primary: #1d4ed8;   -> ganti ke warna brand Anda
  --color-accent:  #f59e0b;   -> warna aksen/highlight


5. MENAMBAH / MENGHAPUS BAGIAN (SECTION)
------------------------------------------
Setiap section di index.html dibungkus tag <section id="...">.
Untuk menghapus satu section, hapus seluruh blok <section>...</section>
tersebut. Untuk menduplikasi (misal menambah slide carousel, kartu
harga, atau logo mitra), salin salah satu blok yang sudah ada
(misal <div class="slide">...</div>) dan tempel lagi di bawahnya,
lalu ubah isinya.


6. MENGGANTI PETA LOKASI
--------------------------
Di section Kontak, ganti alamat "src" pada <iframe> dengan link
embed Google Maps lokasi Anda sendiri:
  1. Buka Google Maps, cari lokasi Anda
  2. Klik "Bagikan" > "Sematkan peta"
  3. Salin URL di dalam src="..." dan tempel menggantikan yang lama


7. MENGUNGGAH KE INTERNET (OPSIONAL)
---------------------------------------
Jika nanti ingin online-kan, cukup unggah seluruh folder ini
(index.html, css/, js/, images/) ke layanan hosting statis apa pun
(contoh: Netlify, Vercel, GitHub Pages, atau hosting biasa) — tidak
perlu perubahan kode apapun.