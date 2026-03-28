-- 第 1 步安全：禁止用户直接改余额或伪造流水（仅 SECURITY DEFINER RPC 可写）
-- 客户端仍可 SELECT 自己的账户/流水；可 INSERT 一条 balance=0 的 wallet_accounts（首次开户）

drop policy if exists wallet_accounts_owner_all on public.wallet_accounts;

create policy wallet_accounts_select_own on public.wallet_accounts
  for select to authenticated
  using (user_id = auth.uid());

create policy wallet_accounts_insert_own on public.wallet_accounts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists wallet_transactions_owner_all on public.wallet_transactions;

create policy wallet_transactions_select_own on public.wallet_transactions
  for select to authenticated
  using (user_id = auth.uid());
