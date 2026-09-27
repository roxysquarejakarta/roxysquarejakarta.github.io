=========================================================================
 ROXY SQUARE JAKARTA — WEBSITE STATIS + PANEL ADMIN (untuk GitHub Pages)
=========================================================================

Situs ini sekarang bersifat "data-driven": seluruh konten (teks, foto,
harga, kontak, dst) disimpan di satu file data/db.json, dan halaman
utama (index.html) membacanya secara otomatis lewat JavaScript.

Anda TIDAK perlu lagi mengedit index.html setiap kali mengubah konten.
Cukup pakai Panel Admin (folder admin/) yang sudah disediakan — Panel
Admin ini login memakai GitHub Personal Access Token milik Anda sendiri,
dan setiap perubahan yang disimpan akan otomatis membuat commit baru ke
repository GitHub Anda, lalu GitHub Pages membangun ulang situsnya.

Tidak ada server tambahan yang dibutuhkan — semuanya tetap 100% statis
dan cocok untuk GitHub Pages (gratis).


STRUKTUR FILE
-------------
index.html          -> Kerangka halaman (HTML statis, tanpa konten)
css/style.css        -> Semua tampilan (warna, ukuran, responsif)
js/script.js         -> Fungsi interaktif (menu, carousel, lightbox)
js/site-data.js       -> Pembaca data/db.json -> merender konten ke halaman
data/db.json          -> "DATABASE" seluruh konten situs (JSON)
images/              -> Semua file foto & logo
admin/index.html      -> Halaman Panel Admin (login + dashboard CRUD)
admin/css/admin.css    -> Tampilan Panel Admin
admin/js/admin.js      -> Logika login GitHub, CRUD, cek koneksi, dst


=========================================================================
BAGIAN A — DEPLOY KE GITHUB PAGES (dari nol)
=========================================================================

1. Buat repository baru di GitHub (boleh Public atau Private — GitHub
   Pages untuk repo Private butuh akun GitHub Pro/Team/Enterprise;
   kalau pakai akun gratis, buat repo Public).

2. Upload SELURUH ISI folder ini (index.html, css/, js/, data/, images/,
   admin/) ke root repository tersebut. Cara paling mudah:
     - Lewat web GitHub: klik "Add file" -> "Upload files", seret semua
       file & folder, lalu klik "Commit changes".
     - Atau lewat git di komputer:
         git init
         git remote add origin https://github.com/USERNAME/NAMA-REPO.git
         git add .
         git commit -m "Initial commit"
         git branch -M main
         git push -u origin main

3. Aktifkan GitHub Pages:
     - Buka repo -> tab "Settings" -> menu "Pages" (di sidebar kiri)
     - Pada "Source", pilih branch "main" dan folder "/ (root)"
     - Klik "Save"
     - Tunggu 1-2 menit, GitHub akan menampilkan URL situs Anda, biasanya:
         https://USERNAME.github.io/NAMA-REPO/

4. Buka URL tersebut — situs Anda sudah online. Untuk mengelola isinya,
   buka:
         https://USERNAME.github.io/NAMA-REPO/admin/


=========================================================================
BAGIAN B — MEMBUAT GITHUB PERSONAL ACCESS TOKEN (PAT)
=========================================================================

Panel Admin butuh "kunci" berupa token supaya bisa menyimpan perubahan
ke repository Anda. Gunakan SELALU token jenis "Fine-grained" (bukan
"Classic"), karena bisa dibatasi hanya untuk satu repository ini saja.

Langkah membuat token:
  1. Login ke github.com, lalu buka:
       Settings (foto profil pojok kanan atas) -> Developer settings
       -> Personal access tokens -> Fine-grained tokens
  2. Klik "Generate new token"
  3. Isi "Token name" bebas, misal: "Panel Admin Roxy Square"
  4. "Expiration": pilih sesuai kenyamanan Anda (mis. 90 hari, atau
     custom sampai 1 tahun). Token akan berhenti berfungsi setelah
     tanggal ini, jadi buat token baru saat sudah kedaluwarsa.
  5. "Repository access": pilih "Only select repositories", lalu pilih
     repository website Anda SAJA.
  6. "Permissions" -> "Repository permissions" -> cari "Contents",
     ubah dari "No access" menjadi "Read and write".
     (Permission lain biarkan default / No access — tidak diperlukan.)
  7. Klik "Generate token" di bagian bawah.
  8. GitHub akan menampilkan token (diawali "github_pat_...") HANYA
     SEKALI. Salin dan simpan sementara (misalnya di password manager),
     karena tidak bisa dilihat lagi setelah halaman ditutup.

⚠️ PENTING TENTANG KEAMANAN TOKEN:
  - Token ini setara "password" untuk mengedit repository Anda.
    JANGAN pernah membagikannya ke orang lain atau menempelkannya di
    tempat publik (chat, forum, dsb).
  - Panel Admin menyimpan token ini di browser Anda sendiri
    (localStorage jika Anda mencentang "Ingat token", atau
    sessionStorage / hilang otomatis saat tab ditutup jika tidak
    dicentang). Ini adalah pola umum untuk "CMS ringan tanpa server"
    di situs statis — wajar dan aman selama Anda memakai token
    fine-grained yang scope-nya dibatasi hanya ke repo ini, dan hanya
    login dari perangkat pribadi yang terpercaya.
  - Jika token Anda bocor atau hilang kendali, segera buka GitHub ->
    Settings -> Developer settings -> Fine-grained tokens -> hapus
    (revoke) token tersebut, lalu buat yang baru.


=========================================================================
BAGIAN C — LOGIN PERTAMA KALI KE PANEL ADMIN
=========================================================================

1. Buka https://USERNAME.github.io/NAMA-REPO/admin/
2. Isi form login:
     - GitHub Owner / Organisasi : username GitHub Anda (atau nama
       organisasi jika repo ada di bawah organisasi)
     - Nama Repository          : nama repo yang tadi dibuat
     - Branch                    : "main" (atau nama branch Pages Anda)
     - Path Database JSON        : biarkan "data/db.json"
     - Personal Access Token     : tempel token dari Bagian B
3. (Opsional) Klik "Cek Koneksi" dulu untuk memastikan semua data benar
   sebelum login — akan muncul info username, akses tulis, dan sisa
   kuota API.
4. Klik "Login".

CATATAN — MODE BOOTSTRAP:
Saat pertama kali dipakai, daftar admin di data/db.json masih kosong
("admins": []), sehingga SIAPA PUN yang punya token dengan akses ke
repo ini masih bisa login. Begitu berhasil masuk, Panel Admin akan
menampilkan pengingat untuk segera membuka tab "Manajemen User" dan
menambahkan username GitHub Anda ke daftar admin. Setelah ada minimal
1 username terdaftar, hanya akun-akun di daftar itu yang bisa login.

(Lapisan ini adalah kenyamanan di sisi aplikasi, bukan pengaman mutlak
— siapa pun yang memegang token dengan akses ke repo tetap bisa
memanggil GitHub API secara langsung tanpa lewat Panel Admin. Jaga
kerahasiaan token Anda sebagai lapisan keamanan yang sesungguhnya.)


=========================================================================
BAGIAN D — MEMAKAI PANEL ADMIN
=========================================================================

Menu di sidebar kiri:

  Dashboard         Ringkasan jumlah konten yang tersimpan.
  Cek Koneksi        Status koneksi GitHub, hak akses, sisa kuota API.
  Hero Slider        Kelola slide carousel di halaman utama.
  Office Space       Kelola foto galeri "Our Office Space".
  Training Facility  Kelola foto "Our Training Facility".
  Tenants            Kelola logo & info tenant "Our Tenants".
  Pricelist          Kelola paket harga.
  Access / Lokasi    Kelola kategori & daftar transportasi.
  About Us           Kelola profil perusahaan, pengurus, visi & misi.
  Contact & Sosial   Kelola alamat, telepon, WhatsApp, peta, sosial media.
  Manajemen User     Kelola daftar username GitHub yang boleh login.

Cara kerja tiap tab:
  - Klik "+ Tambah ..." untuk menambah item baru.
  - Isi/ubah langsung di kolom-kolom yang tersedia.
  - Klik ikon 🗑 / ✕ untuk menghapus item atau baris.
  - PENTING: perubahan di atas baru tersimpan SEMENTARA di browser Anda.
    Klik tombol biru "💾 Simpan ... ke GitHub" di tiap tab untuk benar-
    benar mengirim perubahan sebagai commit baru ke GitHub.
  - Setelah tersimpan, GitHub Pages butuh waktu sekitar 30-60 detik
    untuk membangun ulang situs sebelum perubahan terlihat di situs
    publik (refresh halaman utama setelah menunggu sebentar).

Path gambar:
  Kolom "Path Gambar" mengacu ke file yang sudah ada di folder images/
  pada repository Anda (contoh: images/Galeri1.png). Panel Admin ini
  BELUM mendukung unggah file gambar baru langsung dari browser —
  untuk menambah foto baru, upload dulu filenya ke folder images/ lewat
  GitHub (web upload atau git push), baru isi nama filenya di sini.


=========================================================================
BAGIAN E — MENGGANTI WARNA & FONT (masih manual lewat kode)
=========================================================================
Buka css/style.css, lihat bagian paling atas ":root { ... }".
Warna situs ini sudah diselaraskan dengan warna logo (navy & oranye):

  --color-primary: #0c0368;   -> navy (tombol, link aktif)
  --color-accent:  #e3750b;   -> oranye (highlight, badge)

Ubah kode hex di sini untuk mengubah warna di SELURUH halaman & Panel
Admin sekaligus (admin/css/admin.css ikut memakai variabel yang sama).


=========================================================================
BAGIAN F — EDIT MANUAL data/db.json (opsional, tanpa Panel Admin)
=========================================================================
Karena formatnya JSON biasa, Anda juga tetap bisa mengedit data/db.json
langsung lewat editor kode GitHub ("." pada keyboard saat membuka repo
di github.com akan membuka editor web), lalu commit seperti biasa.
Pastikan formatnya tetap valid JSON (tanda kutip, koma, kurung kurawal)
— gunakan situs seperti jsonlint.com untuk memeriksa jika ragu.


=========================================================================
BAGIAN G — MASALAH UMUM (TROUBLESHOOTING)
=========================================================================

"Tidak bisa menghubungi api.github.com"
  -> Periksa koneksi internet Anda, atau ada firewall/ekstensi browser
     yang memblokir permintaan ke api.github.com.

"Token tidak valid atau sudah kedaluwarsa" (401)
  -> Token salah ketik, sudah dihapus (revoke), atau melewati tanggal
     Expiration. Buat token baru (Bagian B).

"Akses ditolak" (403)
  -> Permission token belum "Contents: Read and write", atau kuota API
     per jam sudah habis (tunggu sejam, atau cek "Sisa kuota API" di
     tab Cek Koneksi).

"Tidak ditemukan (404)"
  -> Nama Owner/Repository/Branch/Path yang diisi saat login salah
     ketik, atau file data/db.json belum ter-upload ke repo.

Perubahan sudah "Berhasil disimpan" tapi situs belum berubah
  -> Tunggu 30-60 detik (waktu build GitHub Pages), lalu refresh
     (hard refresh: Ctrl+Shift+R / Cmd+Shift+R) untuk melewati cache
     browser.

Lupa/hilang akses ke Panel Admin (semua admin ter-hapus dari daftar)
  -> Edit manual data/db.json lewat GitHub (Bagian F), kosongkan array
     "admins" menjadi [] untuk mengaktifkan lagi mode bootstrap, lalu
     login dan tambahkan username Anda kembali.
