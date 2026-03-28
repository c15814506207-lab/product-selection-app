# 上架前完善步骤总表（工作量最小版）

约定：

- **A 类**：在代码仓库内完成，**不要求你操作**（你只需在适当时机 `git pull` 或同步代码）。
- **B 类**：**必须你本人**在浏览器/本机完成（已尽量压缩为最少次数，并给出「点哪里、粘什么」）。

---

## 总览（建议顺序）

| 序号 | 内容 | 类型 |
|------|------|------|
| 0 | 钱包加积分收口（Edge 密钥 + 前端去掉自助加款） | 已完成（代码侧） |
| 1 | 线上执行钱包 RLS 迁移 + 配置 `WALLET_CREDIT_SECRET` + 重部署 `wallet-refund` | **B** |
| 2 | 加固 `purge-expired-trash-storage`（代码强制校验密钥）+ 配置 `PURGE_SECRET` | **A + B** |
| 3 | 确认所有 AI 业务 Edge（analyze / optimize / sandbox 等）已部署且 Secrets 齐全 | **B**（控制台核对） |
| 4 | 生产环境变量与静态站点部署（Vercel/Netlify 等） | **B** |
| 5 | 支付接入或「仅运营加款」流程定稿 | **B**（商务/第三方账号）+ **A**（接支付时改代码） |
| 6 | 用户协议 / 隐私政策 / 计费说明页 | **A**（页面骨架）+ **B**（你提供文案或律师稿） |
| 7 | 监控与告警（可选）、备份策略（Supabase 控制台） | **B**（ mostly 点选） |

下面 **B 类** 写到「复制即用」；**A 类** 由开发在仓库直接改，不展开成你的操作手册。

---

## 步骤 1（B）：线上执行 RLS 迁移 + 加积分密钥 + 部署

### 1.1 在 Supabase 执行 RLS SQL

1. 浏览器打开：`https://supabase.com/dashboard` → 登录 → **单击你的项目**。
2. 左侧点 **SQL Editor**。
3. 点 **+ New query**。
4. **清空**编辑框，**粘贴下面整段**，再点 **Run**（或 `Ctrl+Enter`）。

```sql
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
```

5. 下方 **Results** 无红色 `ERROR` 即成功。

> 若提示 `policy ... does not exist`（drop 时），可忽略；只要后面的 `create policy` 成功。

### 1.2 设置 Edge Secret：`WALLET_CREDIT_SECRET`

1. 左侧点 **Project Settings**（齿轮，一般在左下角）。
2. 点 **Edge Functions**（或在 **Configuration** 里找 **Edge Functions**）。
3. 找到 **Secrets** → **Add new secret** / **New secret**。
4. **Name** 粘贴：

```text
WALLET_CREDIT_SECRET
```

5. **Value**：在 **PowerShell** 里执行下面一行，把输出的一长串**整段复制**到 Value（不要带引号）：

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
```

（若你更习惯 OpenSSL：`openssl rand -hex 32` 的输出亦可。）

6. 点 **Save** / **Add**。

### 1.3 确认已有 Secrets（缺则补）

在 **同一 Secrets 页面**，确认存在（Name 完全一致）：

```text
SUPABASE_URL
```

```text
SUPABASE_SERVICE_ROLE_KEY
```

- **Value** 来源：**Project Settings** → **API** → **Project URL** 与 **service_role**（点 **Reveal** 后复制）。

### 1.4 部署 `wallet-refund`（本机已安装 Supabase CLI）

1. 打开 **PowerShell**。
2. 进入项目根（按你实际路径修改）：

```powershell
cd "C:\Users\Lenovo\Desktop\product-selection-app"
```

3. 若从未 link 过项目，执行（把 `你的ReferenceID` 换成 **Project Settings → General → Reference ID**）：

```powershell
supabase link --project-ref 你的ReferenceID
```

4. 部署：

```powershell
supabase functions deploy wallet-refund
```

5. 成功后在网页：**Edge Functions** 列表里 **wallet-refund** 更新时间应为刚才。

**步骤 1 完成标准**：SQL 无报错；Secrets 有三项；`wallet-refund` 部署成功。

---

## 步骤 2（A+B）：清理任务 Purge 加固 + 密钥

- **A（已完成）**：`purge-expired-trash-storage` 已改为「未配置 `PURGE_SECRET` 则返回 503；必须带正确 `x-purge-secret`」。
- **B**：你在 **Edge Functions → Secrets** 新增一条：

**Name：**

```text
PURGE_SECRET
```

**Value：** 与 `WALLET_CREDIT_SECRET` 同样方式生成一串随机长字符串（不要与前者相同）。

然后执行：

```powershell
cd "C:\Users\Lenovo\Desktop\product-selection-app"
supabase functions deploy purge-expired-trash-storage
```

---

## 步骤 3（B）：核对「分析 / 优化 / 沙盘」等函数是否已部署

1. 左侧 **Edge Functions**。
2. 对照你 `.env` / 线上环境里的 URL，确认至少存在（名称以你实际为准）：  
   `analyze-product`、`optimize-product`、`simulate-market`（或你在环境变量里自定义的名称）。
3. 若列表**没有**：说明这些函数**不在当前仓库**，需在**原部署方式**下重新部署，或把源码纳入本仓库再 `supabase functions deploy <名>`。

**你无法粘贴一键修复**：缺函数只能部署或改 URL。把 **Edge Functions 列表截图**或**函数名列表**发给开发即可对照。

---

## 步骤 4（B）：生产环境变量（托管平台）

在 **Vercel / Netlify / Cloudflare Pages** 等项目里，添加 **Build/Environment** 变量（名称与前端一致）：

**变量名与示例值（值必须换成你自己的）：**

```text
VITE_SUPABASE_URL
```

值：与 Supabase **Project Settings → API → Project URL** 一致。

```text
VITE_SUPABASE_PUBLISHABLE_KEY
```

值：**anon / publishable** 公钥（同一页复制）。

```text
VITE_DEV_UNLIMITED_POINTS
```

值（生产环境建议）：

```text
false
```

可选（只有当你把函数部署到非默认 URL 时才需要）：

```text
VITE_EDGE_ANALYZE_URL
VITE_EDGE_OPTIMIZE_URL
VITE_EDGE_SANDBOX_URL
```

构建命令一般为：

```text
npm run build
```

发布目录一般为：

```text
dist
```

---

## 步骤 5（B + 未来 A）：支付与加积分

- **现阶段**：加积分仅通过 **`wallet-refund` + `x-internal-credit-secret`**（运维脚本），不接支付时**不要**把密钥放进网页。
- **接支付后（A 由开发做）**：新增支付回调 Edge，验签成功后服务端调用加积分逻辑。

---

## 步骤 6（A + B）：协议与隐私

- **A**：可在站内增加「用户协议」「隐私政策」路由与占位页。
- **B**：**正文**需你提供或律师审核；可把 Word/Markdown 发给开发粘贴。

---

## 步骤 7（B）：备份与监控（可选）

1. **Project Settings** → **Database** → **Backups**（按套餐查看）。
2. **Edge Functions** → **Logs** 定期查看错误率。
3. 需要时再接第三方错误监控（前端 Sentry 等），由开发加 SDK。

---

## 运维加积分（仅持有 `WALLET_CREDIT_SECRET` 时使用）

**不要**把下面里的密钥、token 发给任何人。在 **PowerShell** 整段粘贴后，只改「你的项目」「anon」「token」「secret」「目标用户 UUID」：

```powershell
$base = "https://你的项目子域.supabase.co/functions/v1"
$anon = "你的anon公钥"
$token = "某已登录用户access_token"
$secret = "与WALLET_CREDIT_SECRET一致的字符串"

$body = @{
  amount_points = 5000
  business_type = "manual_topup"
  idempotency_key = "ops-$(Get-Date -Format 'yyyyMMddHHmmss')"
  description = "运维加款"
  credit_user_id = "目标用户UUID"
  meta = @{ source = "ops" }
} | ConvertTo-Json

Invoke-RestMethod -Uri "$base/wallet-refund" -Method POST -Headers @{
  Authorization = "Bearer $token"
  apikey = $anon
  "Content-Type" = "application/json"
  "x-internal-credit-secret" = $secret
} -Body $body
```

省略 `credit_user_id` 时，加给 **`$token` 对应用户**。

---

## 当前建议：下一步做哪一步？

- 若 **步骤 1** 你尚未全部做完：先完成 **步骤 1**。
- 若 **步骤 1 已完成**：回复「步骤 1 已完成」，开发将执行 **步骤 2 的 A（改 purge 代码）**，你只需做 **步骤 2 的 B（加 PURGE_SECRET + 部署该函数）**。
