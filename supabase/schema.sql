-- Matrice Production — structure de la base Supabase
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller → Run.

-- 1. Documents de l'application (même modèle que la version claude.ai)
--    collection = 'config' (id 'main') ou 'projets' (un id par projet) ; data = contenu JSON
create table if not exists public.documents (
  collection  text        not null,
  id          text        not null,
  data        jsonb       not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid        default auth.uid(),
  primary key (collection, id)
);

-- 2. Membres autorisés : seules ces adresses voient les données
--    role 'edition' = peut modifier ; role 'lecture' = consultation seule
create table if not exists public.membres (
  email text primary key,
  role  text not null default 'edition' check (role in ('edition', 'lecture'))
);

-- 3. Règles d'accès (Row Level Security) : rien n'est visible sans être membre connecté
alter table public.documents enable row level security;
alter table public.membres   enable row level security;

-- La fonction de contrôle vit dans un schéma « private », non exposé par l'API.
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.est_membre(min_role text default 'lecture')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membres m
    where lower(m.email) = lower(auth.jwt() ->> 'email')
      and (min_role = 'lecture' or m.role = 'edition')
  );
$$;
revoke all on function private.est_membre(text) from public, anon;
grant execute on function private.est_membre(text) to authenticated;

drop policy if exists "membres lisent les documents" on public.documents;
create policy "membres lisent les documents" on public.documents
  for select to authenticated using (private.est_membre('lecture'));

drop policy if exists "editeurs ajoutent" on public.documents;
create policy "editeurs ajoutent" on public.documents
  for insert to authenticated with check (private.est_membre('edition'));

drop policy if exists "editeurs modifient" on public.documents;
create policy "editeurs modifient" on public.documents
  for update to authenticated using (private.est_membre('edition')) with check (private.est_membre('edition'));

drop policy if exists "editeurs suppriment" on public.documents;
create policy "editeurs suppriment" on public.documents
  for delete to authenticated using (private.est_membre('edition'));

-- Chacun peut seulement lire sa propre ligne de membre (pour connaître son rôle)
drop policy if exists "lire son role" on public.membres;
create policy "lire son role" on public.membres
  for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));

-- 4. Temps réel : les modifications apparaissent chez les autres utilisateurs sans recharger
do $$ begin
  alter publication supabase_realtime add table public.documents;
exception when duplicate_object then null; end $$;

-- 5. Premier membre (remplacer / compléter les adresses)
insert into public.membres (email, role) values
  ('admin@accessfactory.live', 'edition'),
  ('romain@accessfactory.live', 'edition')
on conflict (email) do nothing;
-- Exemple pour ajouter quelqu'un en lecture seule :
-- insert into public.membres (email, role) values ('prenom@societe.com', 'lecture');
