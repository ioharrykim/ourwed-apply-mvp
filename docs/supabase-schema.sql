-- ourwed apply MVP Supabase schema
-- Run this once in Supabase Dashboard > SQL Editor.
-- Before running, replace the two placeholder admin emails at the bottom.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  email text primary key,
  display_name text,
  invited_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new' check (
    status in (
      'new',
      'quoted',
      'paid',
      'drafting',
      'confirmed',
      'printing',
      'shipped',
      'done',
      'cancelled'
    )
  ),

  orderer_name text not null,
  orderer_contact text not null,
  communication_method text not null check (communication_method in ('email', 'kakao')),
  orderer_email text,
  orderer_kakao_id text,

  paper_type text not null,
  template_id text not null,
  template_name text not null,
  invitation_qty text not null,
  invitation_qty_custom text,
  invitation_qty_final text not null,
  envelope_qty text not null,
  envelope_qty_mode text not null,
  envelope_qty_custom text,
  envelope_qty_final text not null,
  sealing_wax_qty text not null,
  sealing_wax_qty_custom text,
  sealing_wax_qty_final text not null,

  wedding_date_time timestamp without time zone not null,
  desired_receive_date date not null,
  venue_name text not null,
  venue_address text not null,
  groom_name text not null,
  bride_name text not null,
  cover_english_name text,
  cover_title_text text,
  parents_notation text,
  greeting_text text,
  additional_wedding_info text,

  recipient_name text not null,
  recipient_contact text not null,
  shipping_address text not null,

  agree_template boolean not null default false,
  agree_shipping boolean not null default false,
  agree_revision_policy boolean not null default false,
  agree_not_payment boolean not null default false,

  raw_payload jsonb
);

create table if not exists public.application_accounts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  slot_order integer not null default 1,
  bank text,
  relation text,
  relation_custom text,
  account_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  actor_email text,
  event_type text not null default 'note',
  old_status text check (
    old_status is null or old_status in (
      'new',
      'quoted',
      'paid',
      'drafting',
      'confirmed',
      'printing',
      'shipped',
      'done',
      'cancelled'
    )
  ),
  new_status text check (
    new_status is null or new_status in (
      'new',
      'quoted',
      'paid',
      'drafting',
      'confirmed',
      'printing',
      'shipped',
      'done',
      'cancelled'
    )
  ),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists applications_created_at_idx
  on public.applications(created_at desc);

create index if not exists applications_status_idx
  on public.applications(status);

create index if not exists application_accounts_application_id_idx
  on public.application_accounts(application_id);

create index if not exists application_events_application_id_idx
  on public.application_events(application_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.admin_users enable row level security;
alter table public.applications enable row level security;
alter table public.application_accounts enable row level security;
alter table public.application_events enable row level security;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can invite admin users" on public.admin_users;
create policy "Admins can invite admin users"
on public.admin_users
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update admin users" on public.admin_users;
create policy "Admins can update admin users"
on public.admin_users
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete admin users" on public.admin_users;
create policy "Admins can delete admin users"
on public.admin_users
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Anyone can submit applications" on public.applications;
create policy "Anyone can submit applications"
on public.applications
for insert
to anon, authenticated
with check (status = 'new');

drop policy if exists "Admins can read applications" on public.applications;
create policy "Admins can read applications"
on public.applications
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update applications" on public.applications;
create policy "Admins can update applications"
on public.applications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can submit application accounts" on public.application_accounts;
create policy "Anyone can submit application accounts"
on public.application_accounts
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can read application accounts" on public.application_accounts;
create policy "Admins can read application accounts"
on public.application_accounts
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage application accounts" on public.application_accounts;
create policy "Admins can manage application accounts"
on public.application_accounts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read application events" on public.application_events;
create policy "Admins can read application events"
on public.application_events
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create application events" on public.application_events;
create policy "Admins can create application events"
on public.application_events
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update application events" on public.application_events;
create policy "Admins can update application events"
on public.application_events
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Replace these with the two real owner emails before running.
insert into public.admin_users (email, display_name)
values
  ('ioharrykim@gmail.com', 'owner'),
  ('dkdmld1@gmail.com', 'partner')
on conflict (email) do nothing;
