-- FARM AXIS: tabel info tambahan kelompok tani (peta-poktan.html)
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → Run
create table if not exists public.poktan_info (
  name text primary key,
  ketua text,
  anggota text,
  komoditas text,
  catatan text,
  updated_at timestamptz default now()
);
alter table public.poktan_info enable row level security;
drop policy if exists "poktan_info anon all" on public.poktan_info;
create policy "poktan_info anon all" on public.poktan_info
  for all using (true) with check (true);
