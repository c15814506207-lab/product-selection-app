import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

type OptimizeImageRequest = {
  model?: string
  user_prompt?: string
  product?: {
    name?: string
    image_url?: string
  }
  optimization_result?: Record<string, unknown>
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

function extractTextFromGeminiResponse(geminiJson: Record<string, unknown>): string {
  const candidates = (geminiJson?.candidates as Array<Record<string, unknown>> | undefined) || []
  if (!candidates.length) return ""
  const content = (candidates[0]?.content as Record<string, unknown> | undefined) || {}
  const parts = (content?.parts as Array<Record<string, unknown>> | undefined) || []
  const chunks = parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean)
  return chunks.join("\n").trim()
}

function extractInlineImageDataUrl(geminiJson: Record<string, unknown>): string {
  const candidates = (geminiJson?.candidates as Array<Record<string, unknown>> | undefined) || []
  if (!candidates.length) return ""
  const content = (candidates[0]?.content as Record<string, unknown> | undefined) || {}
  const parts = (content?.parts as Array<Record<string, unknown>> | undefined) || []
  for (const p of parts) {
    const inline = p?.inline_data as { mime_type?: string; data?: string } | undefined
    if (inline?.data) {
      const mime = inline.mime_type || "image/png"
      return `data:${mime};base64,${inline.data}`
    }
  }
  return ""
}

function buildSystemPrompt(
  productName: string,
  userPrompt: string,
  optimizationResult: Record<string, unknown>,
): string {
  return `你是电商主图优化助手。你将收到一张产品原图、一个“优化方案对象”和用户补充要求。

任务：
1) 严格基于优化方案优化主图（构图、氛围、卖点视觉表达、质感与风格）。
2) 不改变产品核心主体，不添加无关品牌 Logo，不输出低清晰度结果。
3) 若用户要求与优化方案冲突，以优化方案为主，用户要求为辅。

产品名：${productName || "未命名产品"}
用户补充要求：${userPrompt || "默认按照优化方案进行优化。"}
优化方案(JSON)：
${JSON.stringify(optimizationResult || {}, null, 2)}

输出要求：
- 优先直接输出优化后的图片（image part / inline_data）。
- 同时可附带一段简短中文说明。`
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "仅支持 POST" }, 405, corsHeaders)
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim()
    if (!apiKey) {
      return jsonResponse(
        {
          success: false,
          error: "服务未配置 GEMINI_API_KEY",
          detail: "请在 Supabase Edge Functions Secrets 中设置 GEMINI_API_KEY",
        },
        500,
        corsHeaders,
      )
    }

    let body: OptimizeImageRequest
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ success: false, error: "请求体不是合法 JSON" }, 400, corsHeaders)
    }

    const productName = String(body?.product?.name || "").trim()
    const sourceImageUrl = String(body?.product?.image_url || "").trim()
    const userPrompt = String(body?.user_prompt || "").trim()
    const optimizationResult = (body?.optimization_result || {}) as Record<string, unknown>
    if (!sourceImageUrl) {
      return jsonResponse({ success: false, error: "缺少 product.image_url" }, 400, corsHeaders)
    }

    const model = (body?.model || Deno.env.get("GEMINI_IMAGE_MODEL") || "gemini-2.5-pro").trim()

    const imgRes = await fetch(sourceImageUrl, { signal: AbortSignal.timeout(45_000) })
    if (!imgRes.ok) {
      return jsonResponse(
        {
          success: false,
          error: "无法下载源图片",
          detail: `HTTP ${imgRes.status}`,
        },
        502,
        corsHeaders,
      )
    }

    const mimeType = imgRes.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg"
    if (!mimeType.startsWith("image/")) {
      return jsonResponse(
        { success: false, error: "source image_url 返回的不是图片", detail: mimeType },
        400,
        corsHeaders,
      )
    }

    const bytes = new Uint8Array(await imgRes.arrayBuffer())
    const base64 = uint8ToBase64(bytes)
    const systemPrompt = buildSystemPrompt(productName, userPrompt, optimizationResult)

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
    const fetchHeaders: Record<string, string> = { "Content-Type": "application/json" }
    if (customBase) {
      geminiUrl = `${customBase}/v1beta/models/${pathModel}:generateContent`
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
              { text: systemPrompt },
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
          temperature: 0.5,
        },
      }),
      signal: AbortSignal.timeout(180_000),
    })

    const geminiRaw = await geminiRes.text()
    let geminiJson: Record<string, unknown> = {}
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
      const err = (geminiJson?.error as { message?: string } | undefined)?.message || ""
      return jsonResponse(
        {
          success: false,
          error: "产品图优化模型调用失败",
          detail: err || geminiRaw.slice(0, 500),
        },
        502,
        corsHeaders,
      )
    }

    const inlineImage = extractInlineImageDataUrl(geminiJson)
    const assistantText = extractTextFromGeminiResponse(geminiJson) || "已按优化方案完成产品图优化。"

    const result = {
      assistant_text: assistantText,
      // 若模型未返回图片，兜底返回原图地址，前端至少不会失败。
      optimized_image_url: inlineImage || sourceImageUrl,
      model,
      usage: (geminiJson?.usageMetadata as Record<string, unknown> | undefined) || null,
    }

    return jsonResponse({ success: true, result }, 200, corsHeaders)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return jsonResponse(
      {
        success: false,
        error: "产品图优化异常",
        detail: message,
      },
      500,
      corsHeaders,
    )
  }
})

