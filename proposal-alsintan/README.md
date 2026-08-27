# PROJECT ROPS

Generator proposal permohonan bantuan alsintan kelompok tani — satu berkas HTML, tanpa server.
Tema mengikuti COCKPIT (sama seperti Eviden LCS): terang/gelap, aksen lime, tersimpan otomatis.

Buka `index.html` di browser, isi form di panel kiri, lalu tekan **Cetak / PDF**
(pilih tujuan *Save as PDF*, ukuran A4, margin *None*).

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

Halaman 4, 7, 8, 9, dan 10 bisa dimatikan lewat kartu **Gambar & Halaman**.

## Catatan teknis

- **Narasi otomatis** menyesuaikan jenis alsin (15 pilihan + isian bebas), dengan 3 gaya penulisan (A/B/C) atau acak.
  Kotak yang disunting manual berubah menjadi *terkunci* dan tidak ditimpa lagi — tekan ↻ untuk membuka kunci.
- Nama alsin dicetak **miring** di dalam kalimat, mengikuti dokumen aslinya.
- **Auto-fit halaman**: isi tiap halaman disusutkan secukupnya (maksimal 66%) agar tetap muat satu lembar A4.
  Halaman CPCL dibiarkan mengalir ke lembar berikutnya bila anggotanya banyak; header tabel ikut berulang.
- **Gambar** (logo kop, foto alsin, empat tanda tangan, tiga scan KTP) disimpan sebagai data URI di dalam berkas simpanan.
- **Simpan otomatis** ke localStorage; **Ekspor/Impor** `.json` untuk memakai ulang data pada kelompok lain.
- Daftar anggota bisa ditempel langsung dari Excel (Nama · Jabatan · Luas).
