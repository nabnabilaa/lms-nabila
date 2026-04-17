# 📂 Project Detail: Virtual Intern LMS

## 🎯 Tentang Project Ini (Tujuan)
Project ini adalah sebuah platform **Learning Management System (LMS)** yang dikhususkan untuk memfasilitasi program **Virtual Intern** (Magang Virtual). Platform ini memungkinkan pengguna untuk melakukan aktivitas pembelajaran secara daring, menjadwalkan dan mengadakan pertemuan virtual *(live meeting)*, berkolaborasi secara real-time, mengisi survei, hingga melakukan manajemen *auth* (otentikasi) ke sistem terpadu.

## 💻 Bahasa Pemrograman & Teknologi yang Digunakan
Sistem ini menggunakan arsitektur modern berbasis modul yang memisahkan Backend Utama (API System), Frontend, dan sebuah sub-Server untuk keperluan komunikasi dua arah (Meeting & Recording).

1. **Backend Utama (API & Data Management)**
   - **Framework:** Laravel 12
   - **Bahasa Pemrograman:** PHP 8.2+
   - **Database:** SQLite (Bawaan)
   - **Fitur Kunci:** Laravel Sanctum (Otentikasi API), Livewire/Inertia (Jika dipakai internal), Google 2FA (Pragmarx).

2. **Frontend (User Interface / Web Client)**
   - **Environment / Build Tool:** Vite
   - **Framework:** React 18 (`lms-frontend`)
   - **Styling:** Tailwind CSS, PostCSS, Autoprefixer
   - **Real-time Kolaborasi:** Liveblocks, Socket.io-client
   - **Library Tambahan Utama:**
     - `react-i18next` (Dukungan Multi-bahasa)
     - `lucide-react` (Ikon)
     - `react-pdf/renderer` & `html2pdf.js` (Eksport Dokumen)
     - `react-quill` (Rich Text Editor)
     - `survey-react-ui` (Kuesioner/Survei)

3. **Meeting Server (Layanan Khusus Video / Komunikasi)**
   - **Environment:** Node.js
   - **Framework:** Fastify
   - **Bahasa Pemrograman:** TypeScript
   - **Koneksi Real-time:** WebSockets (`socket.io`, `fastify-socket.io`)
   - **Automasi Layar/Recording:** Puppeteer & Puppeteer-screen-recorder (Untuk merekam/mengotomasi interaksi pada layar meeting).

## 🚀 Cara Menjalankan Project (Cara Buatnya)

Berhubung project ini adalah *monorepo* sederhana yang berisi beberapa servis, ada beberapa konfigurasi untuk menjalankannya.

### 1. Persiapan Awal (Database & Environment)
Buka terminal di lokasi root (folder `c:\laragon\www\lms`):

```bash
# 1. Pastikan Anda memiliki .env untuk laravel
cp .env.example .env

# 2. Install Dependency PHP untuk Laravel
composer install

# 3. Buat Key Aplikasi
php artisan key:generate

# 4. Bangun Database (Migrasi Tabel)
php artisan migrate --graceful
```

### 2. Menjalankan Semua Layanan (Laravel & Frontend Secara Otomatis)
Pada file konfigurasi `composer.json` root, sudah disediakan custom script *"dev"* yang menggunakan dependensi NPM (`concurrently`) untuk menjalankan Artisan Server dan Vite React secara bersamaan.

```bash
# Instal dependensi Npm dari root directory terlebih dulu
npm install

# Lalu jalankan server lokal
composer dev
```
Perintah ini otomatis akan menjalankan Backend PHP (di `localhost:8000`) dan Vite Frontend untuk pengembangan.

### 3. Menjalankan Frontend Secara Terpisah (Opsional)
Jika Anda hanya ingin berfokus mengembangkan UI (User Interface) saja, Anda dapat pindah ke direktori `lms-frontend`:

```bash
cd lms-frontend
npm install
npm run dev
```
Ini akan membangkitkan local-client Vite.

### 4. Menjalankan Fastify Meeting Server
Server meeting berjalan di sistem port yang mandiri. Ini wajib Anda operasikan agar fitur komunikasi live dan recording berfungsi.

```bash
cd meeting-server
npm install
npm run dev
# Atau jalankan file build utamanya
npm start
```
> **Catatan ngrok:** Jika fitur webhooks atau video eksternal perlu diekspos melalui jaringan HTTPS sungguhan, biasanya project ini merekomendasikan mengekspos port 80/port spesifik dengan `ngrok http 80`.
