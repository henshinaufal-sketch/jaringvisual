# JaringVisual

Aplikasi web berbahasa Indonesia untuk memetakan hubungan antara **Orang** (individu) dan **Kelompok** (kumpulan individu).

## Memakai di komputer sendiri, tanpa instalasi

1. Di halaman repository GitHub ini, klik tombol hijau **Code**, lalu **Download ZIP**.
2. Ekstrak ZIP hasil unduhan (Windows: klik kanan → **Extract All / Ekstrak Semua**).
3. Buka folder hasil ekstrak, lalu klik dua kali **JaringVisual.html** menggunakan Chrome atau Edge.

Alternatif: buka [JaringVisual-lokal.zip](JaringVisual-lokal.zip), klik ikon **Download raw file** untuk mengunduh paket yang hanya berisi aplikasi dan petunjuk, lalu ekstrak ZIP tersebut.

Ekstrak **JaringVisual-lokal.zip**, lalu klik dua kali **JaringVisual.html** menggunakan Chrome atau Edge. File HTML itu juga bisa digunakan sendiri tanpa ZIP. Seluruh kode, font, dan data contoh sudah disertakan; tidak memerlukan terminal, Node.js, internet, atau server. Petunjuk lengkap ada di [docs/PETUNJUK-LOKAL.txt](docs/PETUNJUK-LOKAL.txt).

Data disimpan di browser. Tetap gunakan browser, profil, nama file, dan lokasi file yang sama, serta ekspor JSON secara rutin untuk cadangan. Perubahan data tidak ditulis kembali ke file HTML.

Untuk membuat ulang distribusi lokal dari sumber, jalankan `npm ci` dan `npm run build:local`. Perintah ini menghasilkan `JaringVisual.html` dan `JaringVisual-lokal.zip` di akar proyek.

`npm run test:local` membangun paket dan menguji HTML hasil distribusi tanpa jaringan menggunakan origin HTTP terisolasi yang dipenuhi langsung dari isi file. Uji mencakup penambahan orang, persistensi setelah reload/buka ulang, hubungan, ekspor/impor, serta kesamaan HTML di dalam ZIP. Browser Chromium cloud memblokir navigasi `file:` melalui kebijakan administrator, sehingga pembukaan langsung file belum terverifikasi di cloud. Untuk menguji `file:` pada komputer yang mengizinkannya, jalankan `npm run test:local:file`.

## Menjalankan

Gunakan Node.js 22 atau lebih baru dan npm.

```sh
npm ci
npm run dev
```

Server pengembangan menggunakan port 5173. Untuk build produksi: `npm run build`. Untuk menjalankan hasil build: `npm run preview`.

## Fitur versi pertama

- Sepuluh orang contoh: Andi, Budi, Cidi, Didi, Edi, Fredi, Gisdi, Haidi, Idi, dan Jedi.
- Dua kelompok contoh: Studio Utara dan Kolektif Reka. Semua tokoh, kelompok, dan hubungan contoh bersifat fiktif.
- Tambah, edit, dan hapus entitas; kustomisasi nama, jenis, catatan, dan warna.
- Tambah hubungan dengan label bebas dan arah dari entitas asal ke tujuan; hapus hubungan dari panel detail. Hubungan duplikat identik dan hubungan ke diri sendiri ditolak.
- Peta interaktif: geser titik, geser latar, zoom, fokus seluruh hasil filter, pencarian, dan filter jenis.
- Pengatur panjang garis: klik garis hubungan atau ikon penggaris di panel entitas. Geser slider atau gunakan tombol pendekkan/panjangkan. Entitas tujuan bergeser; garis lain yang terhubung ikut menyesuaikan. Posisi baru disimpan otomatis dan ikut diekspor ke JSON.
- Ketebalan garis 1–8 dengan langkah 0,5, serta pilihan **Tegas** atau **Putus-putus**, dapat diatur per hubungan di panel yang sama. Pilihan tetap terlihat saat disorot, disimpan otomatis, dan ikut ekspor/impor JSON. Data versi lama tetap didukung dengan ketebalan 2 dan jenis tegas sebagai bawaan.
- Seluruh antarmuka dan teks peta memakai Poppins; font dibundel lokal, termasuk dalam HTML offline.
- Tema pink pastel. Data tersimpan, catatan, dan warna entitas yang pernah dikustomisasi tetap dipertahankan.
- Direktori entitas dan detail koneksi.
- Simpan otomatis di `localStorage` browser. Tidak ada server basis data, login, atau sinkronisasi antar perangkat. Menghapus data browser juga menghapus jaringan; ekspor JSON untuk cadangan.
- Ekspor JSON dan impor JSON. **Impor menambahkan** jaringan dari file ke data yang ada, termasuk entitas dengan nama yang sama. ID yang bertabrakan dipetakan ulang agar koneksi tetap utuh. Reset memerlukan konfirmasi dan mengganti data saat ini dengan contoh.
- Tampilan responsif dan font disertakan secara lokal; tidak memerlukan API, kredensial, atau layanan eksternal saat dipakai.

## Pengujian

```sh
npm test
```

Pengujian Playwright memakai Chromium sistem di `/usr/bin/chromium` bila tersedia. Pada mesin lain, instal browser pengujian lewat `npx playwright install chromium`. Suite memeriksa data contoh, CRUD entitas, hubungan, validasi, persistensi, filter, zoom, drag, impor/ekspor, reset, serta alur pada ponsel. Tiap pengujian menggunakan penyimpanan browser terisolasi.

Teknologi: React, TypeScript, Vite, SVG, dan Lucide. Tidak memerlukan database.

## Vercel dan data bersama

Untuk project Vercel yang terhubung ke repository ini dengan production branch `main`, push ke `main` memicu deployment otomatis jika integrasi Git aktif. Perubahan di workspace baru ikut terbit setelah di-commit dan di-push. Pastikan deployment terakhir berstatus Ready di Vercel. Build command: `npm run build`; output: `dist`.

Database tidak diperlukan untuk peta pribadi yang tersimpan di satu browser. Sinkronisasi antar perangkat, akun pengguna, atau jaringan bersama memerlukan penyimpanan server/database dan pengaturan akses; fitur tersebut belum tersedia di versi ini.
