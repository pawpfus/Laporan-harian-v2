# CPCLs — Generator CPCL PM AAS

Live: <https://cpcls.vercel.app>

Halaman untuk menyusun **Daftar Calon Petani Calon Lokasi (CPCL)** program PM AAS
(Pertanian Modern — Advanced Agriculture System) secara otomatis dari basis data
penerima ERDKK, mengikuti format berkas CPCL Desa Otting TA 2026.

## Program bantuan (beberapa format CPCL)

Satu berkas bisa memuat **banyak program** — mis. tab *PM AAS* untuk PM-AAS dan tab
kedua untuk program lain. Berpindah lewat bilah **Program** di bawah logo; tombol
**+ Program** membuat yang baru (kosong, salinan program aktif, atau susunan lengkap
PM AAS).

Yang disimpan **terpisah tiap program**: nama & kode berkas, judul dokumen, jenis
bantuan dan sebutan kegiatan pada surat, daftar **sarana + dosis**, **susunan
dokumen** beserta kolomnya, **kelompok tani peserta**, dan **target luas per
kelompok**. Yang dipakai bersama: basis data petani, identitas wilayah/PPL,
serta pengaturan pembulatan dan tinggi baris.

Semua diatur di tab **Dosis**:

| Bagian | Isi |
|---|---|
| Program bantuan | nama, kode berkas, judul dokumen, kalimat surat, kelompok peserta, duplikat/hapus |
| Sarana & dosis per hektar | tambah/hapus sarana, ubah nama, satuan, dosis, jumlah desimal |
| Susunan dokumen CPCL | tambah/hapus dokumen, nama tab & berkas, judul kelompok kolom, dan kolom kebutuhan (judul · isi · desimal · pembagi) |

Menghapus sarana otomatis mencabut kolomnya dari seluruh dokumen program itu.
Kolom **Dibagi** memampatkan satuan tanpa mengubah dosis — Petroorganik 1.000 kg/ha
dibagi 1.000 sehingga tercetak `1,00 Ton/Ha` seperti berkas asli.

## Dokumen bawaan program PM AAS

| Berkas | Kolom kebutuhan |
|---|---|
| `... (BENIH).xlsx` | Varietas · Jumlah benih (Kg) |
| `... (PUPUK).xlsx` | Organik/Petroganik (Ton/Ha) · Urea · NPK |
| `... (DOLOMIT & SILIKA).xlsx` | Dolomit (Kg) · Silika (Liter) |
| `... (HERBISIDA & INSEKTISIDA).xlsx` | Herbisida (Liter) · Insektisida (Liter) |

Setiap berkas berisi **satu sheet per kelompok tani**, lengkap dengan kop
(kabupaten/kecamatan/desa/kelompok/ketua/koordinat/musim tanam), tabel bergaris,
baris JUMLAH, dan blok tanda tangan PPL & Ketua Kelompok — sama persis dengan
tata letak, lebar kolom, dan format angka berkas asli (Times New Roman 12).

## Norma kebutuhan per hektar program PM AAS (dapat diubah)

| Sarana | Dosis |
|---|---|
| Benih | 70 Kg/Ha |
| Urea | 300 Kg/Ha |
| NPK | 400 Kg/Ha |
| Petroorganik | 1.000 Kg/Ha (ditulis 1,00 Ton/Ha) |
| Silika | 3 Liter/Ha |
| Dolomit | 500 Kg/Ha |
| Insektisida | 3 Liter/Ha |
| Herbisida | 3 Liter/Ha |

## Penyesuaian luas lahan

Sesuai ketentuan "luas lahan di rekapan jadi dasar CPCL dan angka desimal
dihilangkan", total luas tiap kelompok dikunci ke **bilangan bulat**:

1. Target per kelompok = total luas ERDKK kelompok itu dengan **desimal dibuang**
   (53,64 Ha → 53 Ha), bukan dibulatkan ke atas. Pilihan *Arah pembulatan* bisa
   diubah ke "ke nilai terdekat", dan kolom **Target** pada tab Rekap tetap bisa
   ditimpa manual bila angka rekapan kecamatan berbeda.
2. Luas tiap anggota diskalakan ke target, lalu selisih pembulatan dibagikan
   dengan **metode sisa terbesar** sehingga jumlah kolom Luas Lahan **persis**
   sama dengan target — tidak ada sisa dan tidak ada kelebihan.
3. Batas maksimum (bawaan 2 Ha) dan minimum per petani dihormati saat pembagian.

Mode **Apa adanya** mematikan penyesuaian dan memakai luas ERDKK apa adanya.

Pilihan **Nilai volume sarana**:
- *Nilai persis* (bawaan) — sel berisi `dosis × luas` apa adanya seperti rumus
  `=70*D15` pada berkas asli, sehingga JUMLAH = dosis × total luas.
- *Dibulatkan per petani* — tiap sel benar-benar dibulatkan dan JUMLAH adalah
  penjumlahan sel yang tercetak.

## Ketua, titik koordinat & varietas

Tab **Basis Data** punya tabel *Ketua, titik koordinat & varietas* berisi satu baris
per kelompok tani: **Nama Kelompok · Nama Ketua · No. HP Ketua · Titik Koordinat ·
Varietas Benih**. Isian itulah yang tercetak pada kop dokumen (`NAMA KETUA/HP`,
`TITIK KOORDINAT`), pada kolom `VARIETAS` dokumen benih, dan pada blok tanda tangan
*Ketua Kelompok Tani*. Varietas boleh beda per kelompok; kosongkan untuk memakai
varietas bawaan di kartu identitas wilayah.

## Kesetiaan format keluaran

Berkas Excel hasil dibandingkan sel demi sel dengan
`CPCL PMAAS OTTING 205 Ha 2026 (BENIH).xlsx` dan sudah sama pada: font
(Times New Roman 12; judul kelompok kebutuhan 10 pt dan RENCANA TANAM 9 pt pada
dokumen pupuk), tebal/miring, garis bawah nama PPL & ketua, perataan, lebar semua
kolom termasuk kolom cadangan, seluruh penggabungan sel, format angka
(luas mengikuti desimal yang dipilih, `0.00` jumlah luas & pupuk,
`mmm-yy` rencana tanam), ukuran kertas
**Legal/F4** dengan margin asli, serta tata letak blok tanda tangan.

Tinggi baris dibuat lebih lega dari berkas asli supaya tabel tidak terlihat padat
saat dicetak — diatur di tab **Dokumen CPCL** → *Tinggi baris tabel*
(Rapat 16,5 = persis berkas asli · Sedang 19,5 · **Lega 22,5** bawaan · Sangat lega 25,5).

Tinggi baris judul **dihitung dari teksnya sendiri**: jumlah baris terbungkus tiap
judul kolom diperkirakan dari lebar kolom dan ukuran fontnya, lalu barisnya
ditinggikan secukupnya — sel yang membentang beberapa baris ikut diperhitungkan.
Judul yang terlanjur panjang dikecilkan otomatis (12 → 11 → 10 pt) sampai muat dua
baris, mis. `LUAS LAHAN (Ha)` jadi 10 pt. Dengan begitu tidak ada judul kolom yang
terpotong seperti pada berkas asli.

Dua penyimpangan lain yang disengaja:
- **NIK** ditulis dengan format teks (`@`) — berkas asli memakai `@` di dokumen
  pupuk dan `0` di dokumen benih; format teks mencegah NIK 16 digit berubah jadi
  notasi ilmiah. Tampilannya sama persis.
- Kolom **JUMLAH** dan perataan tengah mengikuti dokumen benih (yang dijadikan
  acuan), termasuk pada dokumen pupuk yang aslinya tidak menulis label JUMLAH.

Angka luas yang tercetak **sama persis dengan nilai yang disimpan** (bawaan
2 desimal, diatur di tab Rekap), jadi tidak ada pembulatan lagi saat dicetak dan
kolom Luas Lahan benar-benar berjumlah sama dengan baris JUMLAH. Berkas asli
menyimpan 2 desimal tapi menampilkannya 1 desimal — untuk meniru tampilan itu,
pilih *Desimal luas per petani* = 1 desimal.

## Surat Pernyataan

Tab **Surat Pernyataan** menghasilkan dua surat sekaligus untuk tiap kelompok peserta
program yang sedang aktif,
mengikuti berkas `SURAT PERYATAAN.docx` — kertas Legal, margin 1 inci, huruf
**Times New Roman 11**:

1. **Surat Pernyataan** — belum pernah menerima bantuan saprodi PM-AAS.
2. **Surat Pernyataan Kesanggupan** menerima & memanfaatkan bantuan, lengkap dengan
   rincian jumlah bantuan dan 5 butir kesanggupan.

Yang bisa diubah: **nama, NIK, jabatan, poktan, alamat** per kelompok (tabel
*Penanda tangan per kelompok*), serta tempat & tanggal surat, jenis bantuan, dan
data **Saksi 1 / Saksi 2**. NIK terisi otomatis dari daftar anggota bila nama ketua
cocok; alamat terisi otomatis dari desa/kecamatan/kabupaten.

**Jumlah bantuan diambil langsung dari rekapan luas CPCL kelompok** dan mengikuti
daftar sarana program yang aktif — untuk PM AAS: benih, urea, NPK, petroganik,
silika, dolomit, insektisida, herbisida — jadi selalu sinkron dengan dosis dan
penyesuaian luas di tab lain. Nama kegiatan pada badan surat memakai **Sebutan
kegiatan** milik program tersebut.

Keluarannya **.docx asli** (bukan HTML bersalin nama) ber-Times New Roman 11,
satu berkas untuk semua
kelompok atau per kelompok, dan bisa langsung dicetak/disimpan PDF dari layar.

Catatan: berkas asli menulis satuan silika dalam Kg; di sini memakai **Liter**
mengikuti norma PM-AAS (3 Liter/Ha) dan dokumen CPCL Dolomit & Silika. Judul surat
pertama juga ditulis "SURAT PERNYATAAN" (berkas asli salah ketik "PERYATAAN").

## Basis data

- Data bawaan: 4 kelompok Desa Otting (145 petani, 201,02 Ha) hasil ekstraksi dari
  `CPCL PMAAS OTTING 205 Ha 2026 (BENIH/PUPUK).xlsx` — ada di `data-otting.js`.
- Impor `.xlsx` / `.xls` / `.csv`: **seluruh lembar (sheet)** dibaca, kolom terdeteksi
  otomatis lalu bisa dipetakan sendiri. Kolom wajib **Nama Petani** dan **Luas Lahan**;
  NIK, ketua, HP, dan koordinat opsional. Luas terbaca baik dari sel angka (`1.25`)
  maupun teks bergaya Indonesia (`1,63` / `1.234,5`).
- Tersedia **template impor** dan **cadangan basis data** dalam bentuk .xlsx.
- Semua perubahan tersimpan di `localStorage` peramban.

### Pengelompokan kelompok tani dari berkas

Saat impor, pilih **dasar pengelompokan**:

| Pilihan | Kelompok tani dibentuk dari |
|---|---|
| Kolom pada berkas | isi satu kolom (mis. `Kelompok Tani`) — bawaan bila kolomnya terdeteksi |
| Nama lembar (sheet) | nama tiap sheet — untuk berkas yang memisahkan poktan per lembar |
| Gabungan dua kolom | dua kolom digabung, mis. `Kelompok — Desa`, untuk nama poktan yang sama di beda desa |
| Tanpa pengelompokan | semua baris jadi satu kelompok |

Lembar mana saja yang ikut diimpor bisa dicentang satu per satu, dan **pratinjau**
di bawahnya langsung menampilkan kelompok yang terbentuk beserta jumlah petani
dan luasnya sebelum data ditulis.

Deteksi kolom otomatis mencocokkan judul **per kata** dan mengabaikan kolom milik
orang lain — judul yang memuat *penyuluh / PPL / petugas / pendamping* tidak akan
dipakai sebagai Nama Petani, "Ketua Kelompok" tidak dipakai sebagai kolom kelompok,
dan "Harga" tidak tertukar dengan "Ha". Di bawah tiap pemetaan ditampilkan
**contoh isi kolomnya**, jadi salah kolom langsung kelihatan sebelum impor.

Setelah masuk, tiap baris petani punya pemilih **Kelompok** untuk memindahkannya
ke poktan lain, dan tiap kelompok punya tombol **Urutkan A–Z**.

## Menjalankan

Buka `index.html` lewat server statis (butuh internet untuk ExcelJS & Google Fonts):

```bash
python -m http.server 4330 --directory cpcl-pm-aas
```

Lalu buka <http://localhost:4330>. Sudah terdaftar di `.claude/launch.json`
dengan nama `cpcl-pm-aas`.

## Sumber

Format dokumen: `C:\Mulung\Sebelumnya\PPLS\Pitu Riawa\CPCL PMAAS OTTING 205 Ha 2026 (BENIH).xlsx`
dan `(PUPUK).xlsx`.
