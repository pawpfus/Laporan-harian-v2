-- ============================================================
--  HARDENING SUPABASE — Aplikasi Laporan Pertanian
--  Jalankan di: Supabase Dashboard → SQL Editor → New query → Run
--  Aman dijalankan berulang (idempotent) sebisa mungkin.
--
--  Tabel server: laporan, varietas
--  (produksi & analisis usaha tani = localStorage, tidak perlu diamankan)
-- ============================================================


-- ============================================================
--  BAGIAN 1 — CHECK CONSTRAINTS (validasi NILAI di sisi DB)
--  Mencegah data sampah dari serangan API langsung yang
--  melewati validasi JavaScript di browser.
-- ============================================================

-- 1a. Luas wajar (>= 0 dan <= 100000 Ha)
ALTER TABLE public.laporan DROP CONSTRAINT IF EXISTS chk_laporan_luas;
ALTER TABLE public.laporan
  ADD CONSTRAINT chk_laporan_luas CHECK (luas >= 0 AND luas <= 100000);

-- 1b. Batas panjang teks (anti payload raksasa / storage abuse)
ALTER TABLE public.laporan DROP CONSTRAINT IF EXISTS chk_laporan_text_len;
ALTER TABLE public.laporan
  ADD CONSTRAINT chk_laporan_text_len CHECK (
    char_length(coalesce(desa,''))          <= 120 AND
    char_length(coalesce(kelompok_tani,'')) <= 120 AND
    char_length(coalesce(user_name,''))     <= 120
  );

-- 1c. Hanya izinkan nilai dropdown yang sah (blokir nilai ngawur)
ALTER TABLE public.laporan DROP CONSTRAINT IF EXISTS chk_laporan_enum;
ALTER TABLE public.laporan
  ADD CONSTRAINT chk_laporan_enum CHECK (
    jenis_ltt IN ('Reguler','Oplah Rawa','Oplah Non Rawa','CSR') AND
    kegiatan  IN ('Bera','Olah Lahan','Tanam','Panen')           AND
    komoditas IN ('Padi','Jagung','Kedelai')
  );

-- Constraint untuk katalog varietas (angka & teks wajar)
ALTER TABLE public.varietas DROP CONSTRAINT IF EXISTS chk_varietas_vals;
ALTER TABLE public.varietas
  ADD CONSTRAINT chk_varietas_vals CHECK (
    char_length(coalesce(nama,'')) <= 120 AND
    coalesce(potensi,0) >= 0 AND coalesce(potensi,0) <= 50 AND
    coalesce(rata,0)    >= 0 AND coalesce(rata,0)    <= 50
  );


-- ============================================================
--  BAGIAN 2 — KATALOG VARIETAS: READ-ONLY UNTUK PUBLIK
--  Semua orang boleh BACA, tapi tulis/ubah/hapus DITOLAK.
--  (Admin mengisi/mengubah katalog lewat Dashboard / service_role,
--   yang otomatis bypass RLS.)
-- ============================================================

ALTER TABLE public.varietas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS varietas_select_all ON public.varietas;
CREATE POLICY varietas_select_all
  ON public.varietas FOR SELECT
  TO anon, authenticated
  USING (true);

-- TIDAK ada policy INSERT/UPDATE/DELETE → otomatis ditolak utk anon/authenticated.
-- (Catatan: tombol "Isi katalog awal" & edit varietas di app akan gagal utk user biasa.
--  Ini memang yang kita mau. Isi katalog sekali lewat Dashboard SQL/Table editor.)


-- ============================================================
--  BAGIAN 3 — TABEL LAPORAN: pilih SALAH SATU opsi
-- ============================================================

-- ─────────────────────────────────────────────────────────
--  OPSI A (REKOMENDASI bila ADA login/auth)
--  User hanya bisa ubah/hapus laporan MILIKNYA sendiri.
--  Syarat: aktifkan Supabase Auth + app harus login,
--          dan tambah kolom user_id.
-- ─────────────────────────────────────────────────────────
/*
ALTER TABLE public.laporan
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS laporan_select ON public.laporan;
CREATE POLICY laporan_select ON public.laporan
  FOR SELECT TO authenticated USING (true);          -- semua login boleh lihat (ganti ke own bila perlu privasi)

DROP POLICY IF EXISTS laporan_insert ON public.laporan;
CREATE POLICY laporan_insert ON public.laporan
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS laporan_update ON public.laporan;
CREATE POLICY laporan_update ON public.laporan
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS laporan_delete ON public.laporan;
CREATE POLICY laporan_delete ON public.laporan
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
*/

-- ─────────────────────────────────────────────────────────
--  OPSI B (CEPAT, tanpa login — APPEND ONLY)
--  Cocok untuk skala kecil tanpa auth.
--  Siapa pun boleh TAMBAH & LIHAT, tapi TIDAK BISA ubah/hapus
--  → perusak tidak bisa mengedit/menghapus laporan orang lain.
--  Edit/hapus dilakukan admin lewat Dashboard.
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS laporan_select_all ON public.laporan;
CREATE POLICY laporan_select_all
  ON public.laporan FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS laporan_insert_all ON public.laporan;
CREATE POLICY laporan_insert_all
  ON public.laporan FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- TIDAK ada policy UPDATE/DELETE → edit & hapus dari app diblokir.
-- (Tombol Edit/Hapus di app akan gagal untuk publik — sesuai tujuan Opsi B.)


-- ============================================================
--  CATATAN PENTING (di luar SQL):
--  • Anti-flooding: pasang CAPTCHA (Cloudflare Turnstile) atau
--    aktifkan email-confirm/disable open signup. CHECK constraint
--    tidak bisa membatasi JUMLAH/laju insert.
--  • Backup: aktifkan Daily Backup / PITR di Supabase agar bisa
--    pulih bila kena spam massal.
--  • Pastikan key di index.html = anon (BUKAN service_role).
-- ============================================================
