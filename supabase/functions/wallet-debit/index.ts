import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

type DebitReq = {
  amount_points?: number
  business_type?: string
  business_id?: string
  idempotency_key?: string
  description?: string
  meta?: Record<string, unknown>
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "仅支持 POST" }, 405, corsHeaders)
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
    const userId = userData.user.id

    let body: DebitReq = {}
    try {
      body = (await req.json()) as DebitReq
    } catch {
      return jsonResponse({ success: false, error: "请求体不是合法 JSON" }, 400, corsHeaders)
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

    const { data, error } = await admin.rpc("debit_points_atomic", {
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
        { success: false, error: "扣费 RPC 失败", detail: error.message },
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
      // 余额不足等业务失败
      return jsonResponse(
        { success: false, error: msg || "扣费失败", balance_points: balance, tx_id: txId },
        402,
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
      { success: false, error: "wallet-debit 异常", detail: message },
      500,
      corsHeaders,
    )
  }
})

