-- FARM AXIS: proteksi edit dengan PIN
-- Jalankan SEKALI di Supabase: Dashboard -> SQL Editor -> Run
-- Setelah ini, menulis ke poktan_info hanya bisa lewat fungsi ber-PIN;
-- membaca tetap bebas. PIN awal: 123456 -- SEGERA GANTI (lihat bawah).

create extension if not exists pgcrypto;

-- tempat menyimpan hash PIN (RLS aktif tanpa policy = tak terbaca dari luar)
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;

insert into public.app_config(key, value)
values ('poktan_pin', crypt('123456', gen_salt('bf')))
on conflict (key) do nothing;

-- GANTI PIN: edit 'PIN-BARU-ANDA' lalu jalankan baris ini saja:
-- update public.app_config set value = crypt('PIN-BARU-ANDA', gen_salt('bf')) where key = 'poktan_pin';

-- cabut akses tulis langsung; sisakan baca
drop policy if exists "poktan_info anon all" on public.poktan_info;
drop policy if exists "poktan_info anon read" on public.poktan_info;
create policy "poktan_info anon read" on public.poktan_info for select using (true);

-- satu-satunya jalur tulis: fungsi yang memverifikasi PIN
create or replace function public.upsert_poktan_info(
  p_pin text, p_name text, p_ketua text, p_anggota text, p_komoditas text, p_catatan text
) returns void
-- search_path menyertakan 'extensions': di Supabase pgcrypto (crypt) hidup di schema itu
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (
    select 1 from public.app_config
    where key = 'poktan_pin' and value = crypt(p_pin, value)
  ) then
    raise exception 'PIN salah';
  end if;
  insert into public.poktan_info(name, ketua, anggota, komoditas, catatan, updated_at)
  values (p_name, p_ketua, p_anggota, p_komoditas, p_catatan, now())
  on conflict (name) do update
    set ketua = excluded.ketua, anggota = excluded.anggota,
        komoditas = excluded.komoditas, catatan = excluded.catatan, updated_at = now();
end $$;

revoke all on function public.upsert_poktan_info(text,text,text,text,text,text) from public;
grant execute on function public.upsert_poktan_info(text,text,text,text,text,text) to anon, authenticated;
