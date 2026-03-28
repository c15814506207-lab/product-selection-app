/**
 * 已登录用户创建「电脑网站支付」跳转 URL（alipay.trade.page.pay）。
 * Secrets：ALIPAY_APP_ID、ALIPAY_PRIVATE_KEY、ALIPAY_ALIPAY_PUBLIC_KEY、
 * ALIPAY_RETURN_URL、ALIPAY_NOTIFY_URL（notify 必须为公网 HTTPS，指向 alipay-notify）
 * 可选：ALIPAY_GATEWAY（默认正式网关；沙箱：https://openapi.alipaydev.com/gateway.do）
 * 金额：ALIPAY_AMOUNT_P100 / ALIPAY_AMOUNT_P500 / ALIPAY_AMOUNT_P1000（如 0.01，与开放平台标价一致）
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { AlipaySdk } from "jsr:@leavestylecode/alipay-sdk-deno@0.1.0"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type Body = { pack?: string }

const PACKS: Record<string, { points: number; amountEnv: string }> = {
  p100: { points: 100, amountEnv: "ALIPAY_AMOUNT_P100" },
  p500: { points: 500, amountEnv: "ALIPAY_AMOUNT_P500" },
  p1000: { points: 1000, amountEnv: "ALIPAY_AMOUNT_P1000" },
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

function buildAlipaySdk(): AlipaySdk {
  const appId = (Deno.env.get("ALIPAY_APP_ID") || "").trim()
  const privateKey = (Deno.env.get("ALIPAY_PRIVATE_KEY") || "").trim()
  const alipayPublicKey = (Deno.env.get("ALIPAY_ALIPAY_PUBLIC_KEY") || "").trim()
  const gateway = (Deno.env.get("ALIPAY_GATEWAY") || "").trim() || "https://openapi.alipay.com/gateway.do"
  if (!appId || !privateKey || !alipayPublicKey) {
    throw new Error("缺少 ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_ALIPAY_PUBLIC_KEY")
  }
  return new AlipaySdk({
    appId,
    privateKey,
    alipayPublicKey,
    keyType: "PKCS8",
    signType: "RSA2",
    gateway,
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "仅支持 POST" }, 405, corsHeaders)
    }

    let returnUrl: string
    let notifyUrl: string
    try {
      returnUrl = mustEnv("ALIPAY_RETURN_URL")
      notifyUrl = mustEnv("ALIPAY_NOTIFY_URL")
    } catch {
      return jsonResponse(
        { success: false, error: "未配置 ALIPAY_RETURN_URL 或 ALIPAY_NOTIFY_URL" },
        503,
        corsHeaders,
      )
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

    let body: Body = {}
    try {
      body = (await req.json()) as Body
    } catch {
      return jsonResponse({ success: false, error: "请求体不是合法 JSON" }, 400, corsHeaders)
    }

    const pack = String(body.pack || "").trim()
    const def = PACKS[pack]
    if (!def) {
      return jsonResponse(
        { success: false, error: "未知的 pack，请使用 p100 / p500 / p1000" },
        400,
        corsHeaders,
      )
    }

    const amountStr = (Deno.env.get(def.amountEnv) || "").trim()
    if (!amountStr) {
      return jsonResponse(
        {
          success: false,
          error: `未配置 ${def.amountEnv}（示例：0.01），该档位不可购买`,
        },
        503,
        corsHeaders,
      )
    }

    const alipaySdk = buildAlipaySdk()

    const out_trade_no = `sv_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`
    const passback = JSON.stringify({ uid: userId, points: def.points, amt: amountStr })

    const url = await alipaySdk.pageExec("alipay.trade.page.pay", {
      method: "GET",
      bizContent: {
        out_trade_no,
        product_code: "FAST_INSTANT_TRADE_PAY",
        total_amount: amountStr,
        subject: `Selvora 积分 ${def.points}`,
        passback_params: passback,
      },
      return_url: returnUrl,
      notify_url: notifyUrl,
    })

    if (!url || typeof url !== "string") {
      return jsonResponse({ success: false, error: "支付宝未返回跳转 URL" }, 500, corsHeaders)
    }

    return jsonResponse({ success: true, url }, 200, corsHeaders)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return jsonResponse(
      { success: false, error: "create-alipay-page-pay 异常", detail: message },
      500,
      corsHeaders,
    )
  }
})
