-- FARM AXIS: fitur manual di atas peta — garis (irigasi, drainase, jalan desa,
-- jalan tani) + titik POI (pompa, pintu air, gudang, kios) + edit garis
-- PRASYARAT: farm-axis-pin.sql sudah dijalankan (butuh app_config + pgcrypto).
-- Jalankan SEKALI di Supabase: Dashboard -> SQL Editor -> Run
-- Aman dijalankan ulang, juga bila versi lama (hanya irigasi/drainase) pernah dipasang.

create table if not exists public.saluran_air (
  id uuid primary key default gen_random_uuid(),
  jenis text not null,
  nama text,
  coords jsonb not null,           -- [[lat,lng], ...]
  created_at timestamptz default now()
);
-- perbarui daftar jenis (versi lama hanya irigasi/drainase)
alter table public.saluran_air drop constraint if exists saluran_air_jenis_check;
alter table public.saluran_air add constraint saluran_air_jenis_check
  check (jenis in ('irigasi','drainase','desa','tani'));

alter table public.saluran_air enable row level security;
drop policy if exists "saluran read" on public.saluran_air;
create policy "saluran read" on public.saluran_air for select using (true);

-- tulis & hapus hanya lewat fungsi ber-PIN (PIN yang sama dengan edit poktan).
-- search_path menyertakan 'extensions' karena pgcrypto (crypt) hidup di sana.
create or replace function public.simpan_saluran(
  p_pin text, p_jenis text, p_nama text, p_coords jsonb
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.app_config
                 where key = 'poktan_pin' and value = crypt(p_pin, value)) then
    raise exception 'PIN salah';
  end if;
  if p_jenis not in ('irigasi','drainase','desa','tani') then
    raise exception 'jenis tidak valid';
  end if;
  if jsonb_array_length(p_coords) < 2 then raise exception 'minimal 2 titik'; end if;
  insert into public.saluran_air(jenis, nama, coords)
  values (p_jenis, nullif(trim(p_nama), ''), p_coords)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.hapus_saluran(p_pin text, p_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.app_config
                 where key = 'poktan_pin' and value = crypt(p_pin, value)) then
    raise exception 'PIN salah';
  end if;
  delete from public.saluran_air where id = p_id;
end $$;

-- edit ulang garis tersimpan (geser/tambah/hapus titik, ganti nama)
create or replace function public.ubah_saluran(
  p_pin text, p_id uuid, p_nama text, p_coords jsonb
) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.app_config
                 where key = 'poktan_pin' and value = crypt(p_pin, value)) then
    raise exception 'PIN salah';
  end if;
  if jsonb_array_length(p_coords) < 2 then raise exception 'minimal 2 titik'; end if;
  update public.saluran_air
  set coords = p_coords, nama = nullif(trim(p_nama), '')
  where id = p_id;
  if not found then raise exception 'garis tidak ditemukan'; end if;
end $$;

-- ===== TITIK POI: pompa air, pintu air, gudang, kios saprodi =====
create table if not exists public.poktan_poi (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('pompa','pintu','gudang','kios')),
  nama text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz default now()
);
alter table public.poktan_poi enable row level security;
drop policy if exists "poi read" on public.poktan_poi;
create policy "poi read" on public.poktan_poi for select using (true);

create or replace function public.simpan_poi(
  p_pin text, p_jenis text, p_nama text, p_lat double precision, p_lng double precision
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.app_config
                 where key = 'poktan_pin' and value = crypt(p_pin, value)) then
    raise exception 'PIN salah';
  end if;
  if p_jenis not in ('pompa','pintu','gudang','kios') then
    raise exception 'jenis tidak valid';
  end if;
  insert into public.poktan_poi(jenis, nama, lat, lng)
  values (p_jenis, nullif(trim(p_nama), ''), p_lat, p_lng)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.hapus_poi(p_pin text, p_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.app_config
                 where key = 'poktan_pin' and value = crypt(p_pin, value)) then
    raise exception 'PIN salah';
  end if;
  delete from public.poktan_poi where id = p_id;
end $$;

revoke all on function public.simpan_saluran(text,text,text,jsonb) from public;
revoke all on function public.hapus_saluran(text,uuid) from public;
revoke all on function public.ubah_saluran(text,uuid,text,jsonb) from public;
revoke all on function public.simpan_poi(text,text,text,double precision,double precision) from public;
revoke all on function public.hapus_poi(text,uuid) from public;
grant execute on function public.simpan_saluran(text,text,text,jsonb) to anon, authenticated;
grant execute on function public.hapus_saluran(text,uuid) to anon, authenticated;
grant execute on function public.ubah_saluran(text,uuid,text,jsonb) to anon, authenticated;
grant execute on function public.simpan_poi(text,text,text,double precision,double precision) to anon, authenticated;
grant execute on function public.hapus_poi(text,uuid) to anon, authenticated;
