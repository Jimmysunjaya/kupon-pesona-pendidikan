# 🎓 SISTEM QR CODE KUNJUNGAN 9 PROGRAM STUDI (PESONA PENDIDIKAN)

Aplikasi web modern, responsif, dan aman berbasis **HTML, CSS, JavaScript, dan Supabase** untuk mendata kunjungan sekitar 800+ siswa ke 9 stand Program Studi dalam kegiatan promosi kampus.

---

## 🌟 Fitur Utama

### 📱 1. Alur & Dashboard Siswa
- **Dark Mode Modern**: Desain bernuansa hitam elegan (*OLED dark*) dengan aksen neon khas masing-masing program studi.
- **Registrasi Cepat**: Siswa memasukkan **Nama Lengkap**, **Asal Sekolah**, dan **Nomor WhatsApp**.
- **Auto-Session Persistence**: Siswa tidak perlu login/registrasi ulang ketika membuka kembali website dari smartphone yang sama (`localStorage`).
- **3-Kolom Grid Responsif**:
  - Stand belum dikunjungi: Berwarna abu-abu (*grayscale/muted*).
  - Stand sudah dikunjungi: Berubah menyala sesuai warna khas prodi, dilengkapi ikon centang (`✓ Terkunjungi`) dan waktu kunjungan.
- **Progress Real-Time**: Bar persentase animasi dan counter (misal: *5 dari 9 prodi = 55,6%*).
- **Scanner QR In-App**: Menggunakan pustaka kamera **HTML5 QR Code Scanner** dengan dukungan scan URL kamera bawaan HP maupun input kode stand manual jika izin kamera diblokir.
- **Pencegahan Kunjungan Ganda**: Siswa hanya dapat tercatat 1 kali untuk tiap prodi (didukung *database unique constraint*). Jika di-scan ulang, muncul notifikasi bahwa prodi sudah pernah dikunjungi.
- **Selebrasi 100%**: Efek animasi confetti & kupon digital saat siswa berhasil menyelesaikan seluruh 9 stand prodi!

### 📊 2. Dashboard Panitia & Admin (`admin.html`)
- **Proteksi PIN Admin**: Default PIN: `admin123`.
- **Statistik Ringkasan Real-Time**:
  - Total peserta siswa terdaftar.
  - Total riwayat scan / kunjungan masuk.
  - Jumlah siswa yang telah menyelesaikan 9 stand (100% complete).
  - Rata-rata kunjungan per siswa.
- **Rekap Pengunjung Stand**: Bar visual pengunjung setiap dari 9 program studi.
- **Tabel Data Peserta**:
  - Pencarian instan berdasarkan Nama, Nomor WhatsApp, atau Sekolah.
  - Filter berdasarkan Asal Sekolah dan Status Kunjungan.
  - Tampilan visual chip stand yang telah dikunjungi.
  - Detail riwayat timestamp setiap kunjungan per siswa.
- **Export ke Excel (.xlsx)**: Export instan 1-klik menggunakan *SheetJS* (berisi Sheet Data Peserta & Sheet Rekap Stand).
- **Generator & Cetak Kartu QR Stand**: Siap cetak ke ukuran kertas A4 untuk dipajang di meja masing-masing stand prodi.

---

## 🎨 9 Program Studi & Kode Unik

| No | Program Studi | Kode | Warna Khas | QR Token Stand |
|:--:|:--------------|:----:|:----------:|:---------------|
| 1 | **Informatika** | `INF` | `#DC2626` (Merah) | `QR_INF_PRODI_2026` |
| 2 | **Bisnis Digital** | `BDG` | `#6366F1` (Indigo Purple) | `QR_BDG_PRODI_2026` |
| 3 | **Kewirausahaan** | `KWU` | `#F59E0B` (Amber Gold) | `QR_KWU_PRODI_2026` |
| 4 | **Agribisnis** | `AGB` | `#10B981` (Emerald Green) | `QR_AGB_PRODI_2026` |
| 5 | **Manajemen Hutan** | `MHT` | `#059669` (Forest Pine) | `QR_MHT_PRODI_2026` |
| 6 | **Kebidanan** | `KBD` | `#EC4899` (Rose Pink) | `QR_KBD_PRODI_2026` |
| 7 | **Agroteknologi** | `AGT` | `#84CC16` (Eco Lime) | `QR_AGT_PRODI_2026` |
| 8 | **PGSD** | `PGSD` | `#3B82F6` (Academic Blue) | `QR_PGSD_PRODI_2026` |
| 9 | **Teknologi Pendidikan** | `TP` | `#8B5CF6` (Creative Violet) | `QR_TP_PRODI_2026` |

---

## ⚡ Panduan Setup Supabase (3 Menit)

1. Buka [https://supabase.com](https://supabase.com) dan buat project baru (gratis).
2. Di dashboard Supabase, buka menu **SQL Editor** di bilah kiri.
3. Buka file `supabase/schema.sql` pada proyek ini, copy seluruh isinya, dan klik **RUN** di SQL Editor Supabase.
   - Skrip ini akan membuat tabel `study_programs`, `participants`, `visits`, constraint unik, indeks, RLS policies, serta Stored Procedures / RPC functions (`record_prodi_visit`, `get_participant_status`, `get_admin_analytics`).
4. Buka menu **Project Settings &rarr; API** di Supabase, lalu copy:
   - **Project URL**
   - **anon / public key**
5. Tempelkan kredensial tersebut ke file `js/supabase-config.js`:
   ```javascript
   const DEFAULT_SUPABASE_URL = "https://your-project.supabase.co";
   const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```
   *(Atau Anda juga dapat langsung memasukkannya melalui tombol ikon **⚙️ Koneksi** di bagian pojok kanan atas tampilan aplikasi web).*

---

## 🚀 Panduan Hosting (Vercel / Netlify / GitHub Pages)

Proyek ini menggunakan pure static Vanilla HTML/CSS/JS sehingga dapat dihosting gratis di platform manapun:

### Opsi A: Deploy ke Vercel
1. Upload folder ini ke repository GitHub Anda.
2. Buka [vercel.com](https://vercel.com) &rarr; **Add New Project** &rarr; Pilih repositori Anda.
3. Klik **Deploy**. Selesai! File `vercel.json` sudah disediakan secara otomatis.

### Opsi B: Jalankan Secara Lokal
Cukup buka file `index.html` langsung di browser Anda, atau gunakan live server:
```bash
# Menggunakan npx serve atau Python
python -m http.server 3000
# atau
npx serve .
```

---

## 🖨️ Cara Mencetak QR Stand untuk Meja Panitia

1. Buka halaman `admin.html` di browser Anda.
2. Masukkan PIN Admin: `admin123`.
3. Scroll ke bagian **"Manajemen QR Code & Kartu Stand Prodi"**.
4. Klik tombol biru **"🖨️ Cetak Semua Kartu Stand (A4)"**.
5. Pilih printer atau *Save as PDF*. Setiap stand prodi memiliki kartu bernomor stand, nama prodi, instruksi, dan QR Code resolusi tinggi.

