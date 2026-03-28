-- 与 supabase/functions/wallet-debit、wallet-refund 中 admin.rpc 参数一致
-- 依赖 public.wallet_accounts / public.wallet_transactions（见 20260326090000_wallet_tables.sql）

create or replace function public.debit_points_atomic(
  p_user_id uuid,
  p_amount integer,
  p_business_type text,
  p_business_id text,
  p_idempotency_key text,
  p_description text,
  p_meta jsonb
)
returns table (
  success boolean,
  balance_points numeric,
  tx_id uuid,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_existing_after numeric;
  v_current numeric;
  v_after numeric;
  v_tx_id uuid;
  v_meta jsonb;
begin
  if p_amount is null or p_amount <= 0 then
    return query
      select false,
        coalesce((select wa.balance from public.wallet_accounts wa where wa.user_id = p_user_id), 0::numeric),
        null::uuid,
        'invalid amount'::text;
    return;
  end if;

  v_meta := coalesce(p_meta, '{}'::jsonb)
    || jsonb_build_object(
      'business_type', p_business_type,
      'business_id', p_business_id
    );

  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select wt.id, wt.balance_after
      into v_existing_id, v_existing_after
    from public.wallet_transactions wt
    where wt.user_id = p_user_id
      and wt.external_ref = p_idempotency_key
    limit 1;

    if v_existing_id is not null then
      return query select true, v_existing_after, v_existing_id, 'ok'::text;
      return;
    end if;
  end if;

  insert into public.wallet_accounts (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select wa.balance into v_current
  from public.wallet_accounts wa
  where wa.user_id = p_user_id
  for update;

  if v_current is null then
    v_current := 0;
  end if;

  if v_current < p_amount then
    return query select false, v_current, null::uuid, '积分不足'::text;
    return;
  end if;

  v_after := v_current - p_amount;

  update public.wallet_accounts wa
  set balance = v_after,
      updated_at = now()
  where wa.user_id = p_user_id;

  insert into public.wallet_transactions (
    user_id, type, amount, balance_after, description, external_ref, meta
  )
  values (
    p_user_id,
    'debit',
    p_amount::numeric,
    v_after,
    nullif(trim(p_description), ''),
    nullif(trim(p_idempotency_key), ''),
    v_meta
  )
  returning id into v_tx_id;

  return query select true, v_after, v_tx_id, 'ok'::text;
exception
  when unique_violation then
    select wt.id, wt.balance_after
      into v_tx_id, v_after
    from public.wallet_transactions wt
    where wt.user_id = p_user_id
      and wt.external_ref = nullif(trim(p_idempotency_key), '')
    limit 1;
    if v_tx_id is not null then
      return query select true, v_after, v_tx_id, 'ok'::text;
    end if;
    return query select false,
      coalesce((select wa.balance from public.wallet_accounts wa where wa.user_id = p_user_id), 0::numeric),
      null::uuid,
      'duplicate key'::text;
end;
$$;

create or replace function public.credit_points_atomic(
  p_user_id uuid,
  p_amount integer,
  p_business_type text,
  p_business_id text,
  p_idempotency_key text,
  p_description text,
  p_meta jsonb
)
returns table (
  success boolean,
  balance_points numeric,
  tx_id uuid,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_existing_after numeric;
  v_current numeric;
  v_after numeric;
  v_tx_id uuid;
  v_meta jsonb;
begin
  if p_amount is null or p_amount <= 0 then
    return query
      select false,
        coalesce((select wa.balance from public.wallet_accounts wa where wa.user_id = p_user_id), 0::numeric),
        null::uuid,
        'invalid amount'::text;
    return;
  end if;

  v_meta := coalesce(p_meta, '{}'::jsonb)
    || jsonb_build_object(
      'business_type', p_business_type,
      'business_id', p_business_id
    );

  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select wt.id, wt.balance_after
      into v_existing_id, v_existing_after
    from public.wallet_transactions wt
    where wt.user_id = p_user_id
      and wt.external_ref = p_idempotency_key
    limit 1;

    if v_existing_id is not null then
      return query select true, v_existing_after, v_existing_id, 'ok'::text;
      return;
    end if;
  end if;

  insert into public.wallet_accounts (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select wa.balance into v_current
  from public.wallet_accounts wa
  where wa.user_id = p_user_id
  for update;

  if v_current is null then
    v_current := 0;
  end if;

  v_after := v_current + p_amount;

  update public.wallet_accounts wa
  set balance = v_after,
      updated_at = now()
  where wa.user_id = p_user_id;

  insert into public.wallet_transactions (
    user_id, type, amount, balance_after, description, external_ref, meta
  )
  values (
    p_user_id,
    'credit',
    p_amount::numeric,
    v_after,
    nullif(trim(p_description), ''),
    nullif(trim(p_idempotency_key), ''),
    v_meta
  )
  returning id into v_tx_id;

  return query select true, v_after, v_tx_id, 'ok'::text;
exception
  when unique_violation then
    select wt.id, wt.balance_after
      into v_tx_id, v_after
    from public.wallet_transactions wt
    where wt.user_id = p_user_id
      and wt.external_ref = nullif(trim(p_idempotency_key), '')
    limit 1;
    if v_tx_id is not null then
      return query select true, v_after, v_tx_id, 'ok'::text;
    end if;
    return query select false,
      coalesce((select wa.balance from public.wallet_accounts wa where wa.user_id = p_user_id), 0::numeric),
      null::uuid,
      'duplicate key'::text;
end;
$$;

grant execute on function public.debit_points_atomic(uuid, integer, text, text, text, text, jsonb) to service_role;
grant execute on function public.credit_points_atomic(uuid, integer, text, text, text, text, jsonb) to service_role;
