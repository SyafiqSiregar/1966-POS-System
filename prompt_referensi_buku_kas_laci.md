# Master Prompt & Referensi Desain: Halaman Buku Kas Laci & Biaya Operasional

Dokumen ini berisi **Prompt Lengkap Siap Pakai (Copy-Paste)** serta **Referensi Desain Visual & Spesifikasi Teknis** dari halaman **Buku Kas Laci & Biaya Operasional** untuk diterapkan ke proyek POS / Kasir / Manajemen Toko Anda lainnya.

---

## 1. Visualisasi Referensi Desain (Hasil Akhir)

````carousel
![Desain Desktop 2-Panel: Skenario Belanja Melebihi Modal Pagi (Minus)](C:/Users/Syafiq/.gemini/antigravity/brain/bd25b886-026b-4cd0-88f0-ecbde7f6657e/cashbook_scenario_minus.png)
<!-- slide -->
![Desain Desktop 2-Panel: Skenario Estafet Modal Esok & Sisa Modal Plus](C:/Users/Syafiq/.gemini/antigravity/brain/bd25b886-026b-4cd0-88f0-ecbde7f6657e/cashbook_scenario_plus.png)
<!-- slide -->
![Desain Responsif Mobile 375px Tanpa Overflow](C:/Users/Syafiq/.gemini/antigravity/brain/bd25b886-026b-4cd0-88f0-ecbde7f6657e/cashbook_mobile_375px.png)
<!-- slide -->
![Mode Riwayat Bulanan dengan Strip Ringkasan Buku Kas per Tanggal](C:/Users/Syafiq/.gemini/antigravity/brain/bd25b886-026b-4cd0-88f0-ecbde7f6657e/cashbook_date_card_strip.png)
<!-- slide -->
![Struk Thermal 58mm Rekap Buku Kas & Laci Harian](C:/Users/Syafiq/.gemini/antigravity/brain/bd25b886-026b-4cd0-88f0-ecbde7f6657e/cashbook_receipt_modal.png)
````

---

## 2. Master Prompt Siap Pakai (Copy-Paste ke Proyek Lain)

Salin blok di bawah ini dan berikan kepada AI Coding Assistant di proyek Anda yang lain:

```markdown
Buatkan / perbarui halaman "Buku Kas Laci & Biaya Operasional" dengan desain Split-Screen 2-Panel yang ramah orang awam (kasir) sekaligus mendukung rekonsiliasi buku kas tulis harian dan hitung fisik uang laci saat tutup shift.

### A. ATURAN DESAIN & TEMA WARNA (DEEP NAVY & TEAL)
Gunakan CSS Variables berikut sebagai fondasi warna dan bentuk komponen:
- `--primary: #073C64` (Deep Navy utama untuk tombol primer, teks aksen, badge aktif)
- `--primary-hover: #062F50`
- `--primary-light: #E8EEF4` (Background tombol/chip aktif & kartu info)
- `--primary-border: #B4C9DC`
- `--sidebar-bg: #062F50` (Header gelap Panel B & tombol Tutup Shift)
- `--carwash: #0A6CA8` / `--carwash-light: #E1F0FA` (Aksen biru informasi / divisi kedua)
- `--success: #2A9D8F` / `--success-light: #E0F5F1` / `--success-border: #8DD4C8` (Teal untuk indikator cocok, status shift terbuka, omset masuk, & tombol utama Kunci Shift)
- `--danger: #E76F51` / `--danger-light: #FDECE7` / `--danger-border: #F4B8A8` (Coral/Merah untuk pengeluaran kas & selisih kurang)
- `--bg-color: #F6F7F9`, `--surface: #FFFFFF`, `--text-main: #102A43`, `--text-secondary: #486581`, `--text-muted: #829AB1`, `--border-color: #D9E2EC`
- Gunakan font sans-serif modern (`DM Sans` / `Inter`) dengan `font-variant-numeric: tabular-nums` pada seluruh nominal Rupiah agar angka sejajar vertikal.
- Gunakan ikon SVG (Lucide Icons), jangan gunakan emoji sebagai ikon struktural.

### B. STRUKTUR TATA LETAK (HEADER + 2 KOLOM UTAMA)

1. **Top Header Bar (`.cb-top-header`):**
   - **Kiri:** Baris navigasi tanggal berisi tombol `<` (hari sebelumnya), teks tanggal kapital (`SABTU, 17 OKTOBER 2026`), tombol `>` (hari berikutnya), input datepicker mini (`<input type="date">`), tombol `Hari Ini`, dan nama cabang (`• Toko Cabang Utama`). Di bawahnya terdapat judul utama `Buku Kas Laci & Biaya`.
   - **Tengah:** Status Pill (`Shift 1 - Laci Terbuka (Nama Kasir)` dengan titik hijau menyala saat aktif, berubah menjadi `Shift Ditutup - Rekap Tersimpan` berwarna biru navy saat sudah disimpan).
   - **Kanan:** 3 tombol aksi:
     1. `Riwayat Bulanan` (toggle untuk berpindah antara tampilan Buku Kas Harian vs Tabel/Kartu Riwayat Bulanan & Reimburse Talangan).
     2. `Cetak Draft Laci` (membuka preview struk thermal 58mm rekap buku kas harian).
     3. `Tutup Shift` (menyimpan & mengunci rekap kas hari ini).

2. **Kolom A - Kiri (`.cb-panel-left`): "Aliran Kas & Belanja Harian"**
   - **Header Panel Terang:** Badge huruf `A` (latar `#073C64`), judul `Aliran Kas & Belanja Harian`, subjudul `Input pengeluaran laci & modal kerja kasir real-time`, dan pill `Shift Pagi Aktif`.
   - **Kartu 1: `MODAL AWAL LACI (PAGI)` (`.cb-modal-pagi-card`):**
     - Menampilkan ikon dompet, judul `MODAL AWAL LACI (PAGI)`, badge hijau `Terverifikasi`, nominal besar (`Rp 84.000`), dan teks asal modal (`(Estafet otomatis dari laci kemarin)` atau `(Kas modal pagi ditetapkan kasir)`).
     - Tombol `Koreksi` di sebelah kanan yang membuka/menutup *drawer* input manual (`#cashbook-modal-edit-drawer`) berisi input angka Rupiah, tombol `Pakai Sisa Kemarin` (jika ada estafet), tombol `Selesai`, serta *quick chips* (`Rp 50rb`, `Rp 80rb`, `Rp 100rb`, `Rp 150rb`).
   - **Kartu 2: Form `CATAT PENGELUARAN BARU` (`.cb-new-expense-card`):**
     - **Pilih Divisi:** 3 tombol radio visual berdampingan (contoh: `Kafe (F&B)`, `Carwash`, `Operasional`).
     - **Grid Input:** Kolom kiri `Keterangan Barang / Keperluan` (placeholder: `Cth: Galon Aqua, Es Batu, Spons...`) dan kolom kanan `Nominal (Rp)` (`<input type="number" min="0" step="any">`).
     - **Sumber Pembayaran:** 2 tombol radio kartu (`Uang Kas Laci` vs `Talangan Karyawan`).
       - Jika memilih `Uang Kas Laci`: langsung memotong uang fisik laci hari ini.
       - Jika memilih `Talangan Karyawan`: memunculkan input `Nama Karyawan yang Menalangi` dan mencatatnya sebagai status `PENDING` (belum memotong uang laci sampai tombol `Lunasi dari Laci` diklik).
     - **Tombol Submit Lebar Penuh:** `+ Simpan Pengeluaran Laci` (latar `#073C64`).
   - **Daftar `PENGELUARAN LACI HARI INI` (`.cb-expense-cards-list`):**
     - Menampilkan jumlah transaksi di kanan atas (`3 Transaksi`).
     - Jika ada talangan karyawan yang belum diganti pada tanggal tersebut, tampilkan banner kuning peringatan dengan tombol `Lunasi dari Laci`.
     - Setiap item belanja tampil sebagai kartu rapi berisi badge warna divisi (`KAFE` kuning hangat, `CARWASH` biru, `OPERASIONAL` abu), nama barang tebal, meta waktu & kasir (`20:04 WIB • Oleh: Admin • Kas Laci (Tunai)`), nominal merah `-Rp 110.000`, serta tombol ikon Edit & Hapus.
   - **Footer Kolom A (`.cb-panel-left-footer`):**
     - Baris 1: `Total Pengeluaran Kas Laci:` -> `-Rp 210.000` (merah tebal).
     - Baris 2: Kotak status `Sisa Modal Pagi (Modal - Belanja):` yang berubah warna secara dinamis:
       - Jika **Minus** (`Belanja > Modal Pagi`, misal `84.000 - 210.000 = -126.000`): latar merah muda lembut (`#FFF1F2`), badge `KURANG MODAL (PAKAI OMSET)`, nilai `-Rp 126.000`.
       - Jika **Plus** (`Modal Pagi > Belanja`, misal `80.000 - 25.000 = +55.000`): latar hijau lembut (`#ECFDF5`), badge `MASIH SISA MODAL`, nilai `+Rp 55.000`.
       - Jika **Nol** (`Rp 0`): badge `MODAL PAS HABIS (Rp 0)`.

3. **Kolom B - Kanan (`.cb-panel-right`): "Rekonsiliasi & Hitung Fisik Laci"**
   - **Header Panel Gelap (`linear-gradient(135deg, #062F50 0%, #073C64 100%)`):** Badge huruf `B` (latar Teal `#2A9D8F`), judul putih `Rekonsiliasi & Hitung Fisik Laci`, subjudul `Cocokkan saldo catatan sistem dengan uang cash fisik`, tombol `Koreksi Omset` (membuka drawer input manual `Total Pendapatan` & `QRIS/Online` bila kasir ingin mengetik manual tanpa POS), dan pill `Shift Malam / Tutup`.
   - **Kartu 1: Ringkasan Saldo Sistem (`.cb-system-ledger-card`):**
     - `[+] Modal Pagi di Laci` -> `Rp 84.000`
     - `[+] Omset Tunai Masuk Laci (X transaksi POS)` -> `Rp 906.000` (hijau teal, dihitung dari `Total Pendapatan - Online`)
     - `[-] Belanja dari Laci Hari Ini` -> `(Rp 210.000)` (merah)
     - **Kotak Info Non-Tunai & Jembatan Buku Tulis (`.cb-qris-info-bar`):**
       - Baris 1: `QRIS & Transfer Bank (Non-Tunai): Rp 1.270.000 (Langsung ke Bank)`
       - Baris 2: `Ringkasan Buku Kas: Total Pendapatan Rp 2.176.000 • Sisa Modal -Rp 126.000`
     - **Bar Target Utama (`.cb-target-tunai-bar`):**
       - Kiri: `Uang Fisik Wajib Ada di Laci:` beserta pratinjau rumus `Rumus Buku Kas: 2.176.000 - 126.000 - 1.270.000 = 780.000`.
       - Kanan: Nominal besar `Rp 780.000`.
   - **Kartu 2: `DENOMINASI UANG FISIK DI LACI` (`.cb-denom-card`):**
     - Header dengan tombol `Sesuaikan Target` (mengisi lembar pecahan otomatis sesuai target uang fisik laci) dan badge `6 Pecahan`.
     - Grid 2 kolom berisi 6 pecahan (`100.000`, `50.000`, `20.000`, `10.000`, `5.000`, `2rb / 1rb`) masing-masing dengan tombol stepper `-`, input angka jumlah lembar, dan `+`.
     - Footer Denominasi: menampilkan `Total Fisik Dihitung: Rp 780.000` di kiri, dan badge status selisih di kanan:
       - Jika `Selisih == 0`: badge hijau `✓ Selisih Rp 0 (Tepat Cocok)`
       - Jika `Selisih < 0`: badge merah `Kurang -Rp ...`
       - Jika `Selisih > 0`: badge abu/biru `Lebih +Rp ...`
   - **Kartu 3: `PEMBAGIAN AKHIR LACI` (`.cb-final-split-card`):**
     - Baris tombol **Saran Pembagian 1-Klik (`#cashbook-quick-split-bar`)**: otomatis menyarankan pembulatan ratusan ribu (contoh: `Saran Bulat: Setor Rp 700.000 / Laci Esok Rp 80.000`) serta opsi meninggalkan modal esok `Rp 50rb`, `Rp 80rb`, atau `Rp 100rb`.
     - 2 Kotak Input Berdampingan yang **Sinkron Otomatis 2 Arah**:
       1. `Setor ke Owner / Brankas` (`Save`)
       2. `Tinggal di Laci (Esok)` (`Modal Esok`)
       Saat kasir mengetik `Setor`, maka `Tinggal di Laci = Total Tunai - Setor` terisi otomatis, begitu pula sebaliknya.
     - Kotak Umpan Balik Alokasi (`Sudah Pas: Setor Owner (Rp 700.000) + Tinggal di Laci Esok (Rp 80.000) = Total Laci (Rp 780.000)`).
   - **Footer Kolom B:** Tombol penuh berwarna Teal (`#2A9D8F`) `Kunci & Simpan Tutup Shift`.

### C. RUMUS INTI & ESTAFET HARI BERIKUTNYA (WAJIB AKURAT)
1. `Sisa Modal = Modal Awal Pagi - Total Belanja Kas Laci` (bisa bernilai positif atau negatif/minus).
2. `Omset Tunai Masuk Laci = Total Pendapatan - Pembayaran Online (QRIS/Transfer)`.
3. `Uang Fisik Wajib Ada di Laci (Total Tunai)` dapat dihitung dengan dua cara yang 100% ekuivalen:
   - Cara Buku Tulis: `Total Pendapatan + Sisa Modal - Online`
   - Cara Aliran Laci: `Modal Awal Pagi + Omset Tunai Masuk Laci - Belanja Kas Laci`
4. `Setor ke Owner (Save) + Tinggal di Laci (Modal Esok) = Total Tunai`.
5. **Estafet Otomatis Lintas Tanggal:** Nilai `Tinggal di Laci (Modal Esok)` dari tanggal terakhir sebelumnya (`d < isoDate`) otomatis menjadi nilai default `Modal Awal Laci (Pagi)` pada hari berikutnya, kecuali kasir menekan tombol `Koreksi` pada hari tersebut.
```

---

## 3. Spesifikasi Rumus & Contoh Kasus Uji (Test Cases)

Saat menerapkan fitur ini di proyek lain, gunakan 2 skenario dari catatan buku kas fisik berikut untuk memvalidasi kebenaran rumus:

| Komponen | Skenario Hari 1 (Belanja > Modal / Minus) | Skenario Hari 2 (Estafet & Sisa Modal Plus) |
| :--- | :--- | :--- |
| **Modal Awal Laci (Pagi)** | `Rp 84.000` (Input manual) | `Rp 80.000` (**Otomatis** dari Laci Esok Hari 1) |
| **Rincian Belanja Laci** | Es batu `110.000` + Galon `75.000` + Plastik `25.000` | Galon `5.000` + Susu `20.000` |
| **Total Pengeluaran Laci** | `-Rp 210.000` | `-Rp 25.000` |
| **Sisa Modal Pagi (`Modal - Belanja`)** | **`-Rp 126.000`** (`KURANG MODAL / PAKAI OMSET`) | **`+Rp 55.000`** (`MASIH SISA MODAL`) |
| **Total Pendapatan (Tunai + Online)** | `Rp 2.176.000` | `Rp 1.495.000` |
| **QRIS & Transfer (Non-Tunai)** | `-Rp 1.270.000` | `-Rp 300.000` |
| **Omset Tunai Masuk Laci** | `Rp 906.000` (`2.176.000 - 1.270.000`) | `Rp 1.195.000` (`1.495.000 - 300.000`) |
| **Uang Fisik Wajib Ada di Laci** | **`Rp 780.000`** (`2.176.000 - 126.000 - 1.270.000`) | **`Rp 1.250.000`** (`1.495.000 + 55.000 - 300.000`) |
| **Setor ke Owner / Brankas (`Save`)** | `Rp 700.000` | `Rp 1.200.000` |
| **Tinggal di Laci (`Modal Esok`)** | **`Rp 80.000`** (Estafet ke Hari 2) | **`Rp 50.000`** (Estafet ke Hari 3) |

---

## 4. Arsitektur Data State (`localStorage` / Database JSON)

Berikut struktur objek per tanggal (`cashbook[isoDate]`) yang ringan dan mudah disimpan di `localStorage` maupun tabel database:

```javascript
// Struktur Data Buku Kas per Tanggal (Key: YYYY-MM-DD)
const cashbookEntrySchema = {
  isoDate: "2026-10-15",
  modalAwal: null,          // Number | null (jika null, ambil otomatis dari modalEsok tanggal sebelumnya)
  manualPendapatan: null,   // Number | null (jika null, ambil otomatis dari transaksi POS hari itu)
  manualOnline: null,       // Number | null (jika null, ambil otomatis dari transaksi QRIS/Transfer POS)
  saveAmount: 700000,       // Nominal Setor ke Owner / Brankas
  modalEsok: 80000,         // Nominal Tinggal di Laci untuk Modal Pagi besok
  lastEditedAlloc: "SAVE",  // "SAVE" | "MODAL_ESOK" (menentukan arah kalkulasi otomatis 2 arah)
  denominations: {          // Jumlah lembar uang fisik di laci
    100000: 7,
    50000: 1,
    20000: 1,
    10000: 1,
    5000: 0,
    2000: 0
  },
  denomTouched: false,      // false = otomatis menyesuaikan target; true = diinput manual oleh kasir
  isSaved: true,            // Status tutup shift
  updatedAt: 1792241282074
};
```

---

## 5. Referensi Kode di Proyek Ini

Jika Anda ingin menyalin langsung potongan kode HTML, CSS, atau JavaScript dari proyek ini ke proyek Anda berikutnya:
- **Struktur HTML 2-Panel:** [index.html](file:///c:/Users/Syafiq/Desktop/Projek%20kasir%20rayya%20coffe/index.html#L341-L760)
- **Stylesheet Deep Navy & Teal (`.cb-*`):** [style.css](file:///c:/Users/Syafiq/Desktop/Projek%20kasir%20rayya%20coffe/style.css#L1870-L3450)
- **Logika Kalkulasi, Denominasi & Render DOM:** [main.js](file:///c:/Users/Syafiq/Desktop/Projek%20kasir%20rayya%20coffe/main.js#L1350-L1980)
