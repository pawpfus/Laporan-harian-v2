# PROJECT ROPS

Generator proposal permohonan bantuan alsintan kelompok tani — satu berkas HTML, tanpa server.
Tema mengikuti COCKPIT (sama seperti Eviden LCS): terang/gelap, aksen lime, tersimpan otomatis.

Buka `index.html` di browser, isi form di panel kiri, lalu unduh hasilnya:

- **Cetak** — dialog cetak peramban; pilih *Save as PDF*, ukuran A4, margin *None*.
  Ini cara terbaik untuk arsip resmi: teksnya tetap vektor, bisa disorot dan dicari, berkasnya kecil.
- **PDF** — mengunduh berkas PDF sekali klik, tanpa lewat dialog cetak.
- **Word** — mengunduh `.doc` yang bisa langsung disunting di Microsoft Word.

Seluruh keluaran memakai lembar **A4 (21 × 29,7 cm)**. Ukurannya satu sumber saja: custom property
`--kertas-w` / `--kertas-h` pada `.page`. Pratinjau, ekspor Word, dan unduhan PDF membacanya dari situ,
jadi mengganti ukuran kertas cukup mengubah dua nilai itu (plus aturan `@page` cetak, yang tidak bisa
memakai `var()`).

Tanggal surat punya lima gaya penulisan (18 April 2026 · 18/IV/2026 · 18-04-2026 ·
18/04/2026 · tulis sendiri) yang berlaku untuk seluruh blok tanda tangan sekaligus.

## Struktur dokumen yang dihasilkan

1. **Sampul** berbingkai — PROPOSAL / PERMOHONAN BANTUAN / nama alsin / gambar alsin / OLEH / identitas kelompok
2. **Surat permohonan** — kop berlogo, nomor–lampiran–perihal, tujuan (Yth. / Cq.), tanda tangan penyuluh & ketua, mengetahui kepala desa, tembusan
3. **Kata pengantar**
4. **Daftar isi** dengan titik-titik penuntun
5. **Isi proposal** — A. Latar Belakang, B. Tujuan dan Manfaat, C. Sasaran dan Lokasi
6. **Isi proposal** — D. Jenis dan Volume Bantuan, E. Penutup + tanda tangan pengurus
7. **Susunan pengurus** — ketua/sekretaris/bendahara, mengetahui Kepala BPP & Kepala Desa
8. **KTP pengurus** — tiga slot scan
9. **Pembatas LAMPIRAN**
10. **Daftar CPCL** — tabel anggota + luas lahan, tanda tangan penyuluh, ketua, koordinator BPP
11. **Lampiran SK Bupati** — satu lembar per halaman pindaian, ditaruh paling belakang (opsional).
    Halaman yang aslinya **melintang** dicetak di lembar melintang pula

Halaman 4, 7, 8, 9, 10, dan 11 bisa dimatikan lewat kartu **Gambar & Halaman**.

## Catatan teknis

- **Narasi otomatis** menyesuaikan jenis alsin (15 pilihan + isian bebas), dengan 3 gaya penulisan (A/B/C) atau acak.
  Kotak yang disunting manual berubah menjadi *terkunci* dan tidak ditimpa lagi — tekan ↻ untuk membuka kunci.
- Nama alsin dicetak **miring** di dalam kalimat, mengikuti dokumen aslinya.
- **Auto-fit halaman**: isi tiap halaman disusutkan secukupnya (maksimal 66%) agar tetap muat satu lembar A4.
  Halaman CPCL dibiarkan mengalir ke lembar berikutnya bila anggotanya banyak; header tabel ikut berulang.
- **Gambar** (logo kop, foto alsin, empat tanda tangan, tiga scan KTP) selalu dinormalkan ke **PNG**:
  format apa pun yang bisa dibaca peramban (JPG, WEBP, HEIC) di-decode lalu dikodekan ulang lewat kanvas.
  Sisi terpanjang dibatasi 1400 px, dan bila hasilnya masih di atas ~1,6 MB gambar diperkecil bertahap
  sampai 700 px — PNG tidak memampatkan foto seperti JPG, tanpa batas ini satu scan bisa menghabiskan
  jatah localStorage. Ukuran hasil ditampilkan di notifikasi setiap kali gambar dipilih.
- **Gutter kiri** selebar 10 mm ditambahkan di luar margin isi (jadi tepi kiri 30 mm, kanan 20 mm) sebagai
  ruang jilid. Nilainya satu tempat saja, variabel CSS `--gutter` pada `.page`; ekspor Word membacanya
  dari situ supaya margin dokumen ikut menyesuaikan.
- **Ekspor Word** merakit MHTML (*multipart/related*) berekstensi `.doc`: bagian pertama HTML, tiap gambar
  jadi bagian tersendiri yang dirujuk relatif — Word tidak memuat gambar dari `data:` URI, sedangkan alat
  ini harus tetap satu berkas tanpa pustaka luar. Gambar yang sama, misalnya logo kop di banyak halaman,
  hanya dilampirkan sekali.

  Berkas Word **tidak memakai CSS layar sama sekali**; ia punya lembar gaya sendiri yang ditulis khusus,
  tanpa `var()`, `calc()`, `grid`, maupun `flex` — Word tidak mengenal semua itu dan hasilnya berantakan.
  Setiap wadah `grid`/`flex` (kop berlogo, kepala surat, blok tanda tangan, identitas sampul, daftar isi,
  baris berlabel CPCL) diterjemahkan menjadi `<table>`, dengan kelas wadahnya ikut dibawa supaya aturan
  turunan seperti `.sig .c` tetap berlaku. Tiap gambar juga diberi ukuran tetap dalam `pt` yang diambil
  dari tata letak layar — Word mengabaikan `max-width`/`object-fit` dan akan memasang gambar sebesar
  resolusi aslinya, sehingga satu scan KTP 1400 px bisa meluber sampai 37 cm.

  Tipografinya mengikuti dokumen proposal acuan: Times New Roman 12 pt, spasi 1,5, paragraf menjorok
  1,25 cm tanpa jarak antar-paragraf, tepi 2,54 cm atas · 2 cm kanan · 2,5 cm bawah · 2 cm + gutter di kiri.
- **Geometri lembar dipaksa penuh** sebelum mencetak, mengekspor Word, maupun mengunduh PDF. Tanpa itu,
  di jendela sempit aturan `@media(max-width:1100px)` menyala dan halaman disusun memakai tata letak
  ponsel — tanpa `min-height` dan tanpa auto-fit — lalu terpotong. Pada jalur PDF ada jebakan kedua:
  di dalam `<foreignObject>` lebar viewport yang dipakai media query adalah lebar foreignObject itu
  (816 px), jadi aturan ponsel menyala **berapa pun lebar jendela sebenarnya**; karena itu blok `@media`
  dibuang seluruhnya dari gaya yang disuntikkan ke SVG.
- **Halaman yang tetap meluber** setelah auto-fit — daftar CPCL panjang, yang di jalur cetak memang
  mengalir ke lembar berikutnya — dipecah menjadi beberapa lembar PDF. Tiap lembar dirender terpisah:
  isinya digeser ke atas lalu dijepit setinggi area teks, sehingga **margin atas-bawahnya tetap ada**
  (memotong satu gambar panjang membuat isi mepet tepi kertas). Titik potongnya dicari di **batas baris
  tabel** terdekat di paruh bawah area teks, jadi tidak ada baris yang terbelah, dan **kepala tabel
  disalin ulang** di tiap lembar lanjutan. Uji 26 anggota: lembar pertama bermargin bawah 16,1 mm,
  lembar kedua bermargin atas 18 mm dengan pita kepala tabel tepat di bawahnya.
- **Unduh PDF** merender tiap halaman lewat `<foreignObject>` SVG — murni kemampuan peramban, tanpa pustaka
  luar — lalu menjahitnya jadi PDF satu-gambar-per-halaman yang ditulis tangan (192 dpi, JPEG). Hasilnya
  **raster**: teksnya tidak bisa disorot atau dicari, dan berkasnya jauh lebih besar (±2,3 MB untuk 10
  halaman) daripada PDF vektor dari tombol **Cetak**. Tombol ini untuk yang butuh berkas jadi sekali klik;
  untuk arsip resmi pakai **Cetak** lalu *Save as PDF*.
- **Simpan otomatis** ke localStorage; **Ekspor/Impor** `.json` untuk memakai ulang data pada kelompok lain.
- **Lampiran SK Bupati** menerima **PDF** maupun gambar, beberapa berkas sekaligus. PDF dibongkar per
  halaman memakai `pdf.js` yang **baru diunduh dari CDN saat dibutuhkan** — di luar itu alat ini tetap
  berjalan penuh tanpa jaringan, dan setelah dibongkar halamannya tersimpan di berkas simpanan sehingga
  tetap bisa dipakai offline. Kalau CDN tak terjangkau, pesan galatnya mengarahkan untuk mengunggah hasil
  pindai sebagai gambar saja.
  Halaman SK disimpan sebagai **JPEG** (bukan PNG seperti slot gambar lain): PNG tidak memampatkan
  pindaian, dan SK tiga-empat halaman saja sudah menghabiskan jatah localStorage.
- **Orientasi lampiran mengikuti aslinya.** Dimensi tiap halaman SK ikut disimpan; yang lebih lebar
  daripada tinggi diberi kelas `.melintang` dan tampil di lembar melintang — dipaksa ke lembar tegak,
  pindaian melintang menyusut sampai tak terbaca. Tiga jalur keluaran menanganinya masing-masing:
  cetak lewat `@page` bernama (`page:lbrMelintang`), unduhan PDF lewat `MediaBox` per lembar, dan Word
  lewat pergantian *section* — halaman berurutan dengan orientasi sama dikelompokkan ke satu section
  karena Word hanya bisa berganti orientasi di batas section.
- Daftar anggota bisa ditempel langsung dari Excel (Nama · Jabatan · Luas).
