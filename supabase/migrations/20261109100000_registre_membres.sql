-- AFEL : registre des membres, adhésion en ligne, cartes VIP Premium.
-- Version durcie du schéma fourni par Claude Design (supabase/schema.sql du dossier) :
--   * le numéro de membre est attribué par le serveur, jamais par le navigateur ;
--   * le public n'écrit que par la fonction demander_adhesion (aucun INSERT direct) ;
--   * la vérification publique ne répond que pour les cartes VIP, pour qu'on ne puisse pas
--     énumérer les adhérentes (l'adhésion révèle une information de santé) ;
--   * quota de 20 cartes VIP par an contrôlé en base, carte valable un an.

create extension if not exists pgcrypto;

-- Statuts et motifs : apostrophe typographique, comme dans l'interface.
create table public.membres (
  id            uuid primary key default gen_random_uuid(),
  num           text unique not null,
  nom           text not null,                 -- « Nom et prénoms » du formulaire
  prenom        text,                          -- renseigné par la présidente si besoin
  statut        text not null check (statut in ('Membre fondatrice','Membre fondateur','Membre d’honneur','Bienfaiteur','Médecin bénévole','Sponsor','Membre','Sympathisant')),
  tel           text,
  email         text,
  naissance     date,
  genre         text,
  nationalite   text,
  ville         text,
  regime        text,
  profession    text,
  droit_image   boolean,
  fait_a        text,
  signature     text,                          -- image PNG en data URL
  consentement  boolean not null default false,
  signe_le      timestamptz,
  debut         date not null default current_date,
  etat          text not null default 'attente' check (etat in ('attente','validee','revoquee')),
  vip           boolean not null default false,
  motif         text check (motif in ('Fondatrice / fondateur','Engagement bénévole','Don ou parrainage','Soutien professionnel','Membre d’honneur','Partenaire')),
  vip_debut     date,
  vip_fin       date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create sequence public.membres_num_seq start 101;

-- Administratrices (présidente et personnes de confiance), liées à auth.users.
create table public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.est_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.est_admin() from public;
grant execute on function public.est_admin() to authenticated;

alter table public.membres enable row level security;
alter table public.admins  enable row level security;

-- Aucun accès anonyme direct aux tables.
revoke all on public.membres from anon;
revoke all on public.admins  from anon;

create policy "admins lecture"      on public.membres for select to authenticated using (public.est_admin());
create policy "admins modification" on public.membres for update to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "admins ajout"        on public.membres for insert to authenticated with check (public.est_admin());
create policy "admins suppression"  on public.membres for delete to authenticated using (public.est_admin());
create policy "admin voit sa ligne" on public.admins  for select to authenticated using (user_id = auth.uid());

-- Numéro AFEL-AAAA-NNNNN attribué par le serveur.
create or replace function public.membres_avant_ecriture()
returns trigger language plpgsql security definer set search_path = public as $$
declare n_vip int;
begin
  if tg_op = 'INSERT' then
    new.num := 'AFEL-' || to_char(coalesce(new.debut, current_date), 'YYYY') || '-' || lpad(nextval('public.membres_num_seq')::text, 5, '0');
  else
    new.num := old.num;            -- le numéro ne change jamais
  end if;

  if new.vip and (tg_op = 'INSERT' or not old.vip) then
    if new.etat <> 'validee' then
      raise exception 'Seule une adhésion validée peut recevoir une carte VIP.';
    end if;
    select count(*) into n_vip from public.membres
      where vip_debut is not null and extract(year from vip_debut) = extract(year from current_date)
        and (tg_op = 'INSERT' or id <> new.id);
    if n_vip >= 20 then
      raise exception 'Quota atteint : 20 cartes VIP Premium au maximum par an.';
    end if;
    new.vip_debut := current_date;
    new.vip_fin   := current_date + interval '1 year' - interval '1 day';
    if new.motif is null then
      raise exception 'Indiquez le motif d’attribution de la carte VIP.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger membres_avant_ecriture before insert or update on public.membres
  for each row execute function public.membres_avant_ecriture();

-- Adhésion en ligne : seul point d'entrée public en écriture.
create or replace function public.demander_adhesion(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_statut text := replace(coalesce(p->>'type', ''), '''', '’');
  v_naiss  date;
  v_num    text;
begin
  if v_statut = 'Sympathisant(e)' then v_statut := 'Sympathisant'; end if;
  if v_statut not in ('Membre','Bienfaiteur','Médecin bénévole','Sponsor','Membre d’honneur','Sympathisant') then
    raise exception 'Statut invalide.';
  end if;
  if length(trim(coalesce(p->>'nom', ''))) < 3 or length(p->>'nom') > 160 then raise exception 'Nom invalide.'; end if;
  begin v_naiss := (p->>'naissance')::date; exception when others then raise exception 'Date de naissance invalide.'; end;
  if v_naiss is null or v_naiss > current_date - interval '21 years' then
    raise exception 'L’adhésion est réservée aux personnes de 21 ans révolus.';
  end if;
  if coalesce(p->>'email', '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Adresse e-mail invalide.'; end if;
  if length(regexp_replace(coalesce(p->>'tel', ''), '\D', '', 'g')) < 9 then raise exception 'Numéro de téléphone invalide.'; end if;
  if coalesce((p->>'valeurs')::boolean, false) is not true or coalesce((p->>'age21')::boolean, false) is not true then
    raise exception 'Les engagements obligatoires ne sont pas cochés.';
  end if;
  if lower(trim(coalesce(p->>'lu', ''))) !~ '^lu et approuv[ée]$' then raise exception 'Mention « Lu et approuvé » manquante.'; end if;
  if coalesce(p->>'signature', '') !~ '^data:image/png;base64,' or length(p->>'signature') > 400000 then
    raise exception 'Signature invalide.';
  end if;
  if (select count(*) from public.membres where lower(email) = lower(trim(p->>'email')) and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Trop de demandes pour cette adresse aujourd’hui.';
  end if;

  insert into public.membres (num, nom, statut, tel, email, naissance, genre, nationalite, ville, regime, profession,
                              droit_image, fait_a, signature, consentement, signe_le, etat, vip)
  values ('provisoire', trim(p->>'nom'), v_statut, trim(p->>'tel'), lower(trim(p->>'email')), v_naiss,
          left(p->>'genre', 40), left(p->>'nationalite', 80), left(p->>'ville', 80), left(p->>'regime', 80), left(p->>'profession', 120),
          (p->>'image') = 'oui', left(p->>'faitA', 80), p->>'signature', true, now(), 'attente', false)
  returning num into v_num;
  return v_num;
end $$;
revoke all on function public.demander_adhesion(jsonb) from public;
grant execute on function public.demander_adhesion(jsonb) to anon, authenticated;

-- Vérification publique d'une carte VIP : le strict nécessaire, et seulement pour les cartes VIP.
create or replace function public.verifier_carte(p_num text)
returns table (prenom text, nom text, statut text, valide boolean, vip_fin date)
language sql stable security definer set search_path = public as $$
  select m.prenom, m.nom, m.statut,
         (m.etat = 'validee' and m.vip and current_date between m.vip_debut and m.vip_fin) as valide,
         m.vip_fin
  from public.membres m
  where upper(m.num) = upper(trim(p_num)) and m.vip_debut is not null
  limit 1;
$$;
revoke all on function public.verifier_carte(text) from public;
grant execute on function public.verifier_carte(text) to anon, authenticated;
