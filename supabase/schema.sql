-- WORK income platform schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  role text not null default 'member' check (role in ('member','admin')),
  wallet_balance numeric(12,2) not null default 0,
  total_earned numeric(12,2) not null default 0,
  pending_earnings numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  reward numeric(12,2) not null check (reward > 0),
  submission_type text not null default 'image',
  max_submissions integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  file_path text not null,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null,
  account_number text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  min_withdrawal numeric(12,2) not null default 500,
  updated_at timestamptz not null default now()
);
insert into public.settings(id,min_withdrawal) values (1,500) on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.settings enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,name,phone) values (new.id, coalesce(new.raw_user_meta_data->>'name','User'), coalesce(new.raw_user_meta_data->>'phone',''));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create policy "profiles self read" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy "profiles self update" on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy "tasks public read" on public.tasks for select to authenticated using (is_active or public.is_admin());
create policy "tasks admin insert" on public.tasks for insert to authenticated with check (public.is_admin());
create policy "tasks admin update" on public.tasks for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "submissions self read" on public.submissions for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "submissions self insert" on public.submissions for insert to authenticated with check (user_id=auth.uid());
create policy "withdrawals self read" on public.withdrawals for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "withdrawals self insert" on public.withdrawals for insert to authenticated with check (user_id=auth.uid());
create policy "settings authenticated read" on public.settings for select to authenticated using (true);
create policy "settings admin update" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets(id,name,public) values ('submissions','submissions',false) on conflict (id) do nothing;
create policy "submission uploads" on storage.objects for insert to authenticated with check (bucket_id='submissions' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "submission read own/admin" on storage.objects for select to authenticated using (bucket_id='submissions' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

create or replace function public.approve_submission(submission_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare s public.submissions; r numeric;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  select * into s from public.submissions where id=submission_id for update;
  if s.status <> 'pending' then raise exception 'Already reviewed'; end if;
  select reward into r from public.tasks where id=s.task_id;
  update public.submissions set status='approved',reviewed_at=now() where id=s.id;
  update public.profiles set wallet_balance=wallet_balance+r,total_earned=total_earned+r,pending_earnings=greatest(0,pending_earnings-r) where id=s.user_id;
end; $$;

create or replace function public.approve_withdrawal(withdrawal_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare w public.withdrawals;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  select * into w from public.withdrawals where id=withdrawal_id for update;
  if w.status <> 'pending' then raise exception 'Already reviewed'; end if;
  if (select wallet_balance from public.profiles where id=w.user_id) < w.amount then raise exception 'Insufficient balance'; end if;
  update public.withdrawals set status='approved',reviewed_at=now() where id=w.id;
  update public.profiles set wallet_balance=wallet_balance-w.amount where id=w.user_id;
end; $$;