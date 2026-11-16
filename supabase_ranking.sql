-- supabase_ranking.sql — Tabla del ranking global (mejora 15)
-- Ejecutar UNA vez: Supabase → SQL Editor → pegar → Run.
-- Seguridad: cada usuario solo puede crear/modificar/borrar SU fila; cualquier usuario con sesión puede LEER el ranking.
-- No se guarda correo ni datos de entrenamiento: solo apodo y totales.

create table if not exists public.ranking (
  id          uuid primary key references auth.users(id) on delete cascade,
  apodo       text        not null check (char_length(apodo) between 2 and 20),
  puntos      integer     not null default 0 check (puntos >= 0 and puntos <= 10000000),
  nivel       smallint    not null default 1 check (nivel between 1 and 7),
  sesiones    integer     not null default 0 check (sesiones >= 0),
  volumen_kg  bigint      not null default 0 check (volumen_kg >= 0),
  actualizado timestamptz not null default now()
);

create index if not exists ranking_puntos_idx on public.ranking (puntos desc);

alter table public.ranking enable row level security;

drop policy if exists "ranking_leer"      on public.ranking;
drop policy if exists "ranking_insertar"  on public.ranking;
drop policy if exists "ranking_modificar" on public.ranking;
drop policy if exists "ranking_borrar"    on public.ranking;

create policy "ranking_leer"      on public.ranking for select to authenticated using (true);
create policy "ranking_insertar"  on public.ranking for insert to authenticated with check (auth.uid() = id);
create policy "ranking_modificar" on public.ranking for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "ranking_borrar"    on public.ranking for delete to authenticated using (auth.uid() = id);
