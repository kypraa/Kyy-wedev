Kyy Web Development
===================
Isi folder:
- index.html   halaman utama
- style.css    tampilan neobrutalism
- script.js    logika (menu, admin, project, musik)
- audio/       lagu latar

Cara pakai:
1. Ekstrak zip, lalu buka index.html di browser.
2. Untuk online, unggah semua isi folder ke hosting statis (Netlify, GitHub Pages, Vercel, dsb).

Login admin: username admin, password r12345
(ubah dengan mengganti nilai HASH di script.js; hash = SHA-256 dari teks "username:password")

Catatan: di luar claude.ai, data project disimpan di localStorage, jadi hanya terlihat
di browser yang sama. Agar project terlihat semua pengunjung, perlu backend/database sungguhan.
