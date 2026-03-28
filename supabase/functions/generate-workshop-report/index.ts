import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const SYSTEM_PROMPT = `你是产品实验室的“报告整理助手”。请根据用户提供的结构化数据，生成一份可读性强的完整报告。

要求：
1) 输出必须是一个 JSON 对象（不要 markdown 包裹，不要解释）。
2) 需要包含：
   - title: string（建议包含日期与关键产品名）
   - hasOptimization: boolean（是否包含优化结果）
   - markdown: string（报告正文，使用 Markdown 排版）
3) 报告内容覆盖：
   - 实验准备：三款产品的事实信息（名称/价格/材质/风格/目标人群/卖点，及图片是否存在）
   - 第一阶段：产品分析（给出三款的得分/定位/优势/劣势/建议，若数据缺失则略过）
   - 第二阶段：产品优化（如果存在优化结果：每款的优化后定位/目标人群/定价/卖点/内容策略/风险与解决方案）
4) 如果用户只做了分析没有优化，则报告截止到分析结果为止，hasOptimization=false。
5) 语言为中文，条理清晰，避免编造未知字段。`

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
          detail:
            "在 Supabase → Edge Functions → Secrets 中配置 GEMINI_API_KEY",
        },
        500,
        corsHeaders,
      )
    }

    const model = Deno.env.get("GEMINI_TEXT_MODEL")?.trim() || "gemini-2.5-pro"

    let body: Record<string, unknown> = {}
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return jsonResponse({ success: false, error: "请求体不是合法 JSON" }, 400, corsHeaders)
    }

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
              { text: SYSTEM_PROMPT },
              { text: JSON.stringify(body) },
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
        { success: false, error: "Gemini 返回非 JSON", detail: geminiRaw.slice(0, 500) },
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
      geminiJson.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("")?.trim() ??
        ""

    if (!text) {
      return jsonResponse(
        { success: false, error: "模型未返回内容", detail: geminiRaw.slice(0, 500) },
        502,
        corsHeaders,
      )
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text) as Record<string, unknown>
    } catch {
      return jsonResponse(
        { success: false, error: "模型输出不是合法 JSON", detail: text.slice(0, 800) },
        502,
        corsHeaders,
      )
    }

    return jsonResponse({ success: true, result: parsed }, 200, corsHeaders)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return jsonResponse(
      { success: false, error: "生成报告异常", detail: message },
      500,
      corsHeaders,
    )
  }
})

