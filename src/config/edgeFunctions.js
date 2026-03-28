const DEFAULT_SUPABASE_ORIGIN = 'https://pecotugrfppvuuwvcmyf.supabase.co'

function supabaseOrigin() {
  const raw = (import.meta.env.VITE_SUPABASE_URL || '').trim()
  if (!raw) return DEFAULT_SUPABASE_ORIGIN
  return raw.replace(/\/$/, '')
}

function defaultEdgeUrl(functionSlug) {
  return `${supabaseOrigin()}/functions/v1/${functionSlug}`
}

function pickUrl(envFullUrl, functionSlug) {
  const full = (envFullUrl || '').trim()
  if (full) return full
  return defaultEdgeUrl(functionSlug)
}

export const ANALYZE_URL = pickUrl(import.meta.env.VITE_EDGE_ANALYZE_URL, 'analyze-product')

export const SANDBOX_URL = pickUrl(import.meta.env.VITE_EDGE_SANDBOX_URL, 'simulate-market')

export const OPTIMIZE_URL = pickUrl(import.meta.env.VITE_EDGE_OPTIMIZE_URL, 'optimize-product')
export const OPTIMIZE_IMAGE_URL = pickUrl(
  import.meta.env.VITE_EDGE_OPTIMIZE_IMAGE_URL,
  'optimize-product-image',
)

export const FILL_FROM_IMAGE_URL = pickUrl(
  import.meta.env.VITE_EDGE_FILL_FROM_IMAGE_URL,
  'fill-product-from-image',
)

export const GENERATE_REPORT_URL = pickUrl(
  import.meta.env.VITE_EDGE_GENERATE_REPORT_URL,
  'generate-workshop-report',
)

export const WALLET_DEBIT_URL = pickUrl(import.meta.env.VITE_EDGE_WALLET_DEBIT_URL, 'wallet-debit')

export const WALLET_REFUND_URL = pickUrl(import.meta.env.VITE_EDGE_WALLET_REFUND_URL, 'wallet-refund')
