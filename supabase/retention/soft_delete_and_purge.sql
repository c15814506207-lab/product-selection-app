-- 14-day retention for "trash delete" (soft delete -> purge later)
--
-- Tables expected:
-- - products
-- - product_optimizations
--
-- This script adds:
-- - deleted_at timestamptz
-- - purge_at timestamptz
-- And a purge function + daily cron job (pg_cron).
--
-- NOTE:
-- - Purge deletes DB rows. If you also want to delete Storage images,
--   use the Edge Function `purge-expired-trash-storage` to remove files first.
--   Recommended: configure a Scheduled Edge Function (daily) to call it.

alter table if exists public.products
  add column if not exists deleted_at timestamptz null,
  add column if not exists purge_at timestamptz null;

alter table if exists public.product_optimizations
  add column if not exists deleted_at timestamptz null,
  add column if not exists purge_at timestamptz null;

create index if not exists idx_products_purge_at
  on public.products (purge_at)
  where purge_at is not null;

create index if not exists idx_product_optimizations_purge_at
  on public.product_optimizations (purge_at)
  where purge_at is not null;

-- Purge function (idempotent)
create or replace function public.purge_expired_trash()
returns void
language plpgsql
as $$
begin
  -- Delete dependent rows first if you don't have ON DELETE CASCADE FKs.
  -- product_analysis references products(product_id)
  delete from public.product_analysis a
  where exists (
    select 1 from public.products p
    where p.id = a.product_id
      and p.purge_at is not null
      and p.purge_at <= now()
  );

  -- comparison_results references products by ids (first/second/third/winner)
  delete from public.comparison_results c
  where exists (
    select 1 from public.products p
    where p.purge_at is not null
      and p.purge_at <= now()
      and (
        p.id = c.first_product_id or
        p.id = c.second_product_id or
        p.id = c.third_product_id or
        p.id = c.winner_product_id
      )
  );

  -- Purge optimizations whose purge_at has passed
  delete from public.product_optimizations o
  where o.purge_at is not null
    and o.purge_at <= now();

  -- Purge products whose purge_at has passed
  delete from public.products p
  where p.purge_at is not null
    and p.purge_at <= now();
end;
$$;

-- Schedule daily purge (03:20)
-- Requires pg_cron enabled on your Supabase project.
do $$
begin
  perform cron.schedule(
    'purge_expired_trash_daily',
    '20 3 * * *',
    $$select public.purge_expired_trash();$$
  );
exception
  when undefined_function then
    -- pg_cron not available; skip scheduling.
    null;
end;
$$;

