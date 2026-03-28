-- Wallet tables for recharge and API usage billing
create table if not exists public.wallet_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(16,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('credit', 'debit')),
  amount numeric(16,4) not null check (amount >= 0),
  balance_after numeric(16,4) not null,
  description text null,
  external_ref text null,
  meta jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_id_created_at_idx
  on public.wallet_transactions(user_id, created_at desc);

create unique index if not exists wallet_transactions_user_id_external_ref_uidx
  on public.wallet_transactions(user_id, external_ref)
  where external_ref is not null;

alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wallet_accounts' and policyname = 'wallet_accounts_owner_all'
  ) then
    create policy wallet_accounts_owner_all on public.wallet_accounts
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wallet_transactions' and policyname = 'wallet_transactions_owner_all'
  ) then
    create policy wallet_transactions_owner_all on public.wallet_transactions
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
