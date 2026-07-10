-- FARM AXIS: jaringan irigasi & drainase (garis yang digambar di atas peta)
-- PRASYARAT: farm-axis-pin.sql sudah dijalankan (butuh app_config + pgcrypto).
-- Jalankan SEKALI di Supabase: Dashboard -> SQL Editor -> Run

create table if not exists public.saluran_air (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('irigasi','drainase')),
  nama text,
  coords jsonb not null,           -- [[lat,lng], ...]
  created_at timestamptz default now()
);
alter table public.saluran_air enable row level security;
drop policy if exists "saluran read" on public.saluran_air;
create policy "saluran read" on public.saluran_air for select using (true);

-- tulis & hapus hanya lewat fungsi ber-PIN (PIN yang sama dengan edit poktan)
create or replace function public.simpan_saluran(
  p_pin text, p_jenis text, p_nama text, p_coords jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.app_config
                 where key = 'poktan_pin' and value = crypt(p_pin, value)) then
    raise exception 'PIN salah';
  end if;
  if p_jenis not in ('irigasi','drainase') then raise exception 'jenis tidak valid'; end if;
  if jsonb_array_length(p_coords) < 2 then raise exception 'minimal 2 titik'; end if;
  insert into public.saluran_air(jenis, nama, coords)
  values (p_jenis, nullif(trim(p_nama), ''), p_coords)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.hapus_saluran(p_pin text, p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.app_config
                 where key = 'poktan_pin' and value = crypt(p_pin, value)) then
    raise exception 'PIN salah';
  end if;
  delete from public.saluran_air where id = p_id;
end $$;

revoke all on function public.simpan_saluran(text,text,text,jsonb) from public;
revoke all on function public.hapus_saluran(text,uuid) from public;
grant execute on function public.simpan_saluran(text,text,text,jsonb) to anon, authenticated;
grant execute on function public.hapus_saluran(text,uuid) to anon, authenticated;
