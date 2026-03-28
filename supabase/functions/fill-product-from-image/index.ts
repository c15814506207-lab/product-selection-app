import "jsr:@supabase/functions-js/edge-runtime.d.ts"

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    )
  }
  return btoa(binary)
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const SYSTEM_PROMPT = `你是电商选品助手。根据产品主图，尽可能推断下列字段（看不清或无法推断的字段不要编造，可省略该键）。
只输出一个 JSON 对象，不要 markdown，不要解释。键名必须严格如下（均为可选）：
- name: string 产品名称
- price: number 或 string，若只有区间取中间合理整数
- material: string 材质
- style: string 风格/定位
- target_audience: string 目标人群
- selling_points: string 或 string[] 核心卖点（数组时每项一条）

价格若无法从图中得知，不要填 price 或填 null。`

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { success: false, error: "仅支持 POST" },
        405,
        corsHeaders,
      )
    }

    // 与其它 Edge Function 共用：Secret 名称须为 GEMINI_API_KEY（与 OPENAI_API_KEY 无关）
    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim()
    if (!apiKey) {
      return jsonResponse(
        {
          success: false,
          error: "服务未配置 GEMINI_API_KEY",
          detail:
            "在 Supabase → Edge Functions → Secrets 中配置 GEMINI_API_KEY（可与现有项目共用同一条 Secret）",
        },
        500,
        corsHeaders,
      )
    }

    // 默认与项目「Gemini 2.5 Pro」一致；若 Google 返回模型不存在，可在 Secrets 增加 GEMINI_VISION_MODEL 覆盖
    const model =
      Deno.env.get("GEMINI_VISION_MODEL")?.trim() || "gemini-2.5-pro"

    let body: { image_url?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse(
        { success: false, error: "请求体不是合法 JSON" },
        400,
        corsHeaders,
      )
    }

    const imageUrl = typeof body.image_url === "string"
      ? body.image_url.trim()
      : ""
    if (!imageUrl) {
      return jsonResponse(
        { success: false, error: "缺少 image_url" },
        400,
        corsHeaders,
      )
    }

    const imgRes = await fetch(imageUrl, {
      signal: AbortSignal.timeout(45_000),
    })
    if (!imgRes.ok) {
      return jsonResponse(
        {
          success: false,
          error: "无法下载图片",
          detail: `HTTP ${imgRes.status}`,
        },
        502,
        corsHeaders,
      )
    }

    const mimeType = imgRes.headers.get("content-type")?.split(";")[0]
      ?.trim() || "image/jpeg"
    if (!mimeType.startsWith("image/")) {
      return jsonResponse(
        {
          success: false,
          error: "URL 返回的不是图片类型",
          detail: mimeType,
        },
        400,
        corsHeaders,
      )
    }

    const bytes = new Uint8Array(await imgRes.arrayBuffer())
    if (bytes.length > 4 * 1024 * 1024) {
      return jsonResponse(
        {
          success: false,
          error: "图片过大",
          detail: "请压缩到 4MB 以下后再试",
        },
        400,
        corsHeaders,
      )
    }

    const base64 = uint8ToBase64(bytes)

    // 默认走 Polo 中转 xy.poloapi.com + Bearer(GEMINI_API_KEY)。覆盖方式见下方。
    const useOfficialGoogle = (() => {
      const v = Deno.env.get("GEMINI_OFFICIAL_GOOGLE")?.trim().toLowerCase()
      return v === "1" || v === "true" || v === "yes"
    })()

    let customBase = ""
    if (!useOfficialGoogle) {
      customBase =
        Deno.env.get("GEMINI_API_BASE_URL")?.trim().replace(/\/$/, "") ||
        Deno.env.get("POLOAPI_BASE_URL")?.trim().replace(/\/$/, "") ||
        "https://xy.poloapi.com"
    }

    const pathModel = encodeURIComponent(model)
    let geminiUrl: string
    const fetchHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (customBase) {
      geminiUrl =
        `${customBase}/v1beta/models/${pathModel}:generateContent`
      fetchHeaders.Authorization = `Bearer ${apiKey}`
    } else {
      geminiUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/${pathModel}:generateContent?key=${encodeURIComponent(apiKey)}`
    }

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(120_000),
    })

    const geminiRaw = await geminiRes.text()
    let geminiJson: {
      error?: { message?: string }
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
      }>
    } = {}
    try {
      geminiJson = geminiRaw ? JSON.parse(geminiRaw) : {}
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Gemini 返回非 JSON",
          detail: geminiRaw.slice(0, 500),
        },
        502,
        corsHeaders,
      )
    }

    if (!geminiRes.ok) {
      return jsonResponse(
        {
          success: false,
          error: "Gemini 调用失败",
          detail: geminiJson.error?.message || geminiRaw.slice(0, 500),
        },
        502,
        corsHeaders,
      )
    }

    const text =
      geminiJson.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "")
        .join("")?.trim() ?? ""

    if (!text) {
      return jsonResponse(
        {
          success: false,
          error: "模型未返回内容",
          detail: geminiRaw.slice(0, 500),
        },
        502,
        corsHeaders,
      )
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text) as Record<string, unknown>
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "模型输出不是合法 JSON",
          detail: text.slice(0, 800),
        },
        502,
        corsHeaders,
      )
    }

    const result = sanitizeResult(parsed)

    return jsonResponse({ success: true, result }, 200, corsHeaders)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return jsonResponse(
      {
        success: false,
        error: "识图填表异常",
        detail: message,
      },
      500,
      corsHeaders,
    )
  }
})

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

function sanitizeResult(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const str = (v: unknown) =>
    typeof v === "string" ? v.trim() : v != null ? String(v).trim() : ""

  const name = str(raw.name)
  if (name) out.name = name

  if (raw.price != null && raw.price !== "") {
    if (typeof raw.price === "number" && !Number.isNaN(raw.price)) {
      out.price = raw.price
    } else {
      const n = Number(String(raw.price).replace(/[^\d.]/g, ""))
      if (!Number.isNaN(n)) out.price = n
    }
  }

  const material = str(raw.material)
  if (material) out.material = material

  const style = str(raw.style)
  if (style) out.style = style

  const target = str(raw.target_audience)
  if (target) out.target_audience = target

  const sp = raw.selling_points
  if (Array.isArray(sp)) {
    const arr = sp.map((x) => str(x)).filter(Boolean)
    if (arr.length) out.selling_points = arr
  } else {
    const s = str(sp)
    if (s) out.selling_points = s
  }

  return out
}
