/**
 * 支付宝异步通知：验签成功后入账（credit_points_atomic）。
 * 需在开放平台配置「授权回调地址 / 异步通知」为公网 HTTPS，指向本函数 URL。
 * Secrets：同 create-alipay-page-pay（ALIPAY_APP_ID、私钥、支付宝公钥）；可选 ALIPAY_GATEWAY。
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { AlipaySdk } from "jsr:@leavestylecode/alipay-sdk-deno@0.1.0"

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
    throw new Error("missing ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_ALIPAY_PUBLIC_KEY")
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("fail", { status: 405, headers: { "Content-Type": "text/plain;charset=utf-8" } })
  }

  try {
    const raw = await req.text()
    const params: Record<string, string> = {}
    for (const [k, v] of new URLSearchParams(raw)) {
      params[k] = v
    }

    const alipaySdk = buildAlipaySdk()
    const okSign = await alipaySdk.checkNotifySign(params)
    if (!okSign) {
      console.error("alipay-notify: sign check failed")
      return new Response("fail", { status: 400, headers: { "Content-Type": "text/plain;charset=utf-8" } })
    }

    const tradeStatus = params.trade_status || ""
    if (tradeStatus !== "TRADE_SUCCESS" && tradeStatus !== "TRADE_FINISHED") {
      return new Response("success", { status: 200, headers: { "Content-Type": "text/plain;charset=utf-8" } })
    }

    let passback: { uid?: string; points?: number; amt?: string }
    try {
      const rawPb = params.passback_params || ""
      const decoded = decodeURIComponent(rawPb.replace(/\+/g, " "))
      passback = JSON.parse(decoded) as { uid?: string; points?: number; amt?: string }
    } catch {
      console.error("alipay-notify: bad passback_params")
      return new Response("fail", { status: 400, headers: { "Content-Type": "text/plain;charset=utf-8" } })
    }

    const userId = String(passback.uid || "").trim()
    if (!UUID_RE.test(userId)) {
      return new Response("fail", { status: 400, headers: { "Content-Type": "text/plain;charset=utf-8" } })
    }

    const points = Math.floor(Number(passback.points))
    if (!Number.isFinite(points) || points <= 0) {
      return new Response("fail", { status: 400, headers: { "Content-Type": "text/plain;charset=utf-8" } })
    }

    const amtExpected = String(passback.amt || "").trim()
    const amtGot = String(params.total_amount || "").trim()
    if (!amtExpected || amtExpected !== amtGot) {
      console.error("alipay-notify: amount mismatch", { amtExpected, amtGot })
      return new Response("fail", { status: 400, headers: { "Content-Type": "text/plain;charset=utf-8" } })
    }

    const supabaseUrl = mustEnv("SUPABASE_URL")
    const serviceKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY")
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const outNo = String(params.out_trade_no || "").trim()
    const idempotencyKey = outNo ? `alipay_${outNo}` : `alipay_${params.trade_no || crypto.randomUUID()}`

    const { data, error } = await admin.rpc("credit_points_atomic", {
      p_user_id: userId,
      p_amount: points,
      p_business_type: "alipay_page_pay",
      p_business_id: outNo || null,
      p_idempotency_key: idempotencyKey,
      p_description: `支付宝支付 · ${outNo || params.trade_no || ""}`,
      p_meta: {
        trade_no: params.trade_no,
        out_trade_no: outNo,
        total_amount: amtGot,
      },
    })

    if (error) {
      console.error("alipay-notify: rpc error", error)
      return new Response("fail", { status: 500, headers: { "Content-Type": "text/plain;charset=utf-8" } })
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row?.success) {
      return new Response("fail", { status: 400, headers: { "Content-Type": "text/plain;charset=utf-8" } })
    }

    return new Response("success", { status: 200, headers: { "Content-Type": "text/plain;charset=utf-8" } })
  } catch (e) {
    console.error("alipay-notify", e)
    return new Response("fail", { status: 500, headers: { "Content-Type": "text/plain;charset=utf-8" } })
  }
})
