/**
 * 加积分仅允许携带服务端密钥调用（Edge Secrets: WALLET_CREDIT_SECRET）。
 * 浏览器前端不得调用本函数。运维/支付回调：curl 带 x-internal-credit-secret 与 Bearer 用户 JWT；
 * 可选 body.credit_user_id 为指定用户加款（需本人已登录拿到的 token，建议用 service 账号或脚本）。
 *
 * 部署后务必：supabase secrets set WALLET_CREDIT_SECRET="$(openssl rand -hex 32)"
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-credit-secret",
}

type RefundReq = {
  amount_points?: number
  business_type?: string
  business_id?: string
  idempotency_key?: string
  description?: string
  meta?: Record<string, unknown>
  /** 可选：运维加款到指定用户 UUID；省略则为当前 JWT 用户 */
  credit_user_id?: string
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...extraHeaders, "Content-Type": "application/json" },
  })
}

function getBearerToken(req: Request): string {
  const raw = req.headers.get("Authorization") || ""
  const m = raw.match(/^Bearer\s+(.+)$/i)
  return (m?.[1] || "").trim()
}

function mustEnv(name: string): string {
  const v = (Deno.env.get(name) || "").trim()
  if (!v) throw new Error(`missing env: ${name}`)
  return v
}

function timingSafeEq(a: string, b: string): boolean {
  const ae = new TextEncoder().encode(a)
  const be = new TextEncoder().encode(b)
  if (ae.length !== be.length) return false
  let d = 0
  for (let i = 0; i < ae.length; i++) d |= ae[i] ^ be[i]
  return d === 0
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "仅支持 POST" }, 405, corsHeaders)
    }

    const expectedSecret = (Deno.env.get("WALLET_CREDIT_SECRET") || "").trim()
    if (!expectedSecret) {
      return jsonResponse(
        { success: false, error: "未配置 WALLET_CREDIT_SECRET，拒绝加积分" },
        503,
        corsHeaders,
      )
    }
    const gotSecret = (req.headers.get("x-internal-credit-secret") || "").trim()
    if (!timingSafeEq(gotSecret, expectedSecret)) {
      return jsonResponse({ success: false, error: "forbidden" }, 403, corsHeaders)
    }

    const supabaseUrl = mustEnv("SUPABASE_URL")
    const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY")
    const token = getBearerToken(req)
    if (!token) {
      return jsonResponse({ success: false, error: "缺少 Authorization Bearer token" }, 401, corsHeaders)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })

    const { data: userData, error: userErr } = await admin.auth.getUser()
    if (userErr || !userData?.user?.id) {
      return jsonResponse(
        { success: false, error: "鉴权失败", detail: userErr?.message || "no user" },
        401,
        corsHeaders,
      )
    }

    let body: RefundReq = {}
    try {
      body = (await req.json()) as RefundReq
    } catch {
      return jsonResponse({ success: false, error: "请求体不是合法 JSON" }, 400, corsHeaders)
    }

    const rawCreditUid = String(body.credit_user_id || "").trim()
    let userId = userData.user.id
    if (rawCreditUid) {
      if (!UUID_RE.test(rawCreditUid)) {
        return jsonResponse({ success: false, error: "credit_user_id 不是合法 UUID" }, 400, corsHeaders)
      }
      userId = rawCreditUid
    }

    const amount = Math.floor(Number(body.amount_points) || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse({ success: false, error: "amount_points 必须为正整数" }, 400, corsHeaders)
    }

    const idempotencyKey = String(body.idempotency_key || "").trim()
    const businessType = String(body.business_type || "").trim() || "unknown"
    const businessId = String(body.business_id || "").trim() || null
    const description = String(body.description || "").trim() || null
    const meta = (body.meta && typeof body.meta === "object") ? body.meta : {}

    const { data, error } = await admin.rpc("credit_points_atomic", {
      p_user_id: userId,
      p_amount: amount,
      p_business_type: businessType,
      p_business_id: businessId,
      p_idempotency_key: idempotencyKey || null,
      p_description: description,
      p_meta: meta,
    })
    if (error) {
      return jsonResponse(
        { success: false, error: "退款/加积分 RPC 失败", detail: error.message },
        500,
        corsHeaders,
      )
    }

    const row = Array.isArray(data) ? data[0] : data
    const ok = !!row?.success
    const balance = Number(row?.balance_points) || 0
    const txId = row?.tx_id ?? null
    const msg = String(row?.message || "")

    if (!ok) {
      return jsonResponse(
        { success: false, error: msg || "退款失败", balance_points: balance, tx_id: txId },
        400,
        corsHeaders,
      )
    }

    return jsonResponse(
      { success: true, result: { balance_points: balance, tx_id: txId, message: msg || "ok" } },
      200,
      corsHeaders,
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return jsonResponse(
      { success: false, error: "wallet-refund 异常", detail: message },
      500,
      corsHeaders,
    )
  }
})

