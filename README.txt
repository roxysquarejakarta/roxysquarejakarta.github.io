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
