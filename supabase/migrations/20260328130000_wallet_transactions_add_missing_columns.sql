-- 若历史上已创建过 wallet_transactions 但缺少列，先补列再建索引/策略。
-- 在「建表」脚本报错 column "external_ref" does not exist 时，先单独执行本文件或下面 DO 块。

alter table public.wallet_transactions
  add column if not exists description text null,
  add column if not exists external_ref text null,
  add column if not exists meta jsonb null;

create unique index if not exists wallet_transactions_user_id_external_ref_uidx
  on public.wallet_transactions(user_id, external_ref)
  where external_ref is not null;
