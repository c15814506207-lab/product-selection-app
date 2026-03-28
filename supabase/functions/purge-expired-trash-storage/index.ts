import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-purge-secret",
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json" },
  })
}

function isStoragePath(v: unknown) {
  if (!v || typeof v !== "string") return false
  if (v.startsWith("http://") || v.startsWith("https://")) return false
  return v.includes("/")
}

function uniqStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)))
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ success: false, error: "仅支持 POST" }, 405)

  const secret = Deno.env.get("PURGE_SECRET")?.trim()
  if (!secret) {
    return jsonResponse(
      {
        success: false,
        error: "未配置 PURGE_SECRET，拒绝执行",
        detail:
          "请在 Supabase → Edge Functions → Secrets 中设置 PURGE_SECRET；调用时在请求头 x-purge-secret 传入相同值。",
      },
      503,
    )
  }
  const provided = req.headers.get("x-purge-secret")?.trim()
  if (!provided || provided !== secret) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401)
  }

  const url = Deno.env.get("SUPABASE_URL")?.trim()
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()
  if (!url || !serviceKey) {
    return jsonResponse(
      {
        success: false,
        error: "缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
        detail:
          "请在 Supabase → Edge Functions → Secrets 中设置 SUPABASE_SERVICE_ROLE_KEY，并确保 SUPABASE_URL 可用。",
      },
      500,
    )
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const nowIso = new Date().toISOString()

  // 1) Find expired rows (still in DB, waiting to be purged)
  const { data: products, error: productsErr } = await supabase
    .from("products")
    .select("id, image_url")
    .not("deleted_at", "is", null)
    .lte("purge_at", nowIso)
    .limit(500)

  if (productsErr) {
    return jsonResponse(
      { success: false, error: "读取 products 失败", detail: productsErr.message },
      500,
    )
  }

  const { data: opts, error: optsErr } = await supabase
    .from("product_optimizations")
    .select("id, original_product_input")
    .not("deleted_at", "is", null)
    .lte("purge_at", nowIso)
    .limit(500)

  if (optsErr) {
    return jsonResponse(
      { success: false, error: "读取 product_optimizations 失败", detail: optsErr.message },
      500,
    )
  }

  const candidatePaths: string[] = []
  for (const p of products || []) {
    const v = (p as { image_url?: unknown }).image_url
    if (isStoragePath(v)) candidatePaths.push(String(v))
  }
  for (const o of opts || []) {
    const input = (o as { original_product_input?: unknown }).original_product_input as
      | { image_url?: unknown }
      | null
      | undefined
    const v = input?.image_url
    if (isStoragePath(v)) candidatePaths.push(String(v))
  }

  const uniquePaths = uniqStrings(candidatePaths)

  // 2) Delete Storage files that are not referenced by any ACTIVE rows
  const removed: string[] = []
  const skipped: Array<{ path: string; reason: string }> = []

  for (const path of uniquePaths) {
    // referenced by active products?
    const { count: activeProductsCount } = await supabase
      .from("products")
      .select("id", { head: true, count: "exact" })
      .is("deleted_at", null)
      .eq("image_url", path)

    if ((activeProductsCount || 0) > 0) {
      skipped.push({ path, reason: "referenced_by_active_product" })
      continue
    }

    // referenced by active optimizations?
    const { count: activeOptCount } = await supabase
      .from("product_optimizations")
      .select("id", { head: true, count: "exact" })
      .is("deleted_at", null)
      // json path filter
      .filter("original_product_input->>image_url", "eq", path)

    if ((activeOptCount || 0) > 0) {
      skipped.push({ path, reason: "referenced_by_active_optimization" })
      continue
    }

    const { error: rmErr } = await supabase.storage.from("products").remove([path])
    if (rmErr) {
      skipped.push({ path, reason: `storage_remove_failed:${rmErr.message}` })
      continue
    }
    removed.push(path)
  }

  // 3) Purge expired DB rows (including related rows)
  const { error: rpcErr } = await supabase.rpc("purge_expired_trash")
  if (rpcErr) {
    return jsonResponse(
      {
        success: false,
        error: "DB purge 失败",
        detail: rpcErr.message,
        removed,
        skipped,
      },
      500,
    )
  }

  return jsonResponse({
    success: true,
    now: nowIso,
    candidates: uniquePaths.length,
    removedCount: removed.length,
    removed,
    skippedCount: skipped.length,
    skipped,
    purgedProducts: (products || []).length,
    purgedOptimizations: (opts || []).length,
  })
})

