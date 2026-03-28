const LEDGER_KEY = 'poloapiUsageLedger.v1'
const MAX_LEDGER_ITEMS = 300

function pickNumber(...values) {
  for (const v of values) {
    const n = Number(v)
    if (!Number.isNaN(n) && Number.isFinite(n)) return n
  }
  return null
}

function normalizeUsageObject(raw) {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw
  const inputTokens = pickNumber(
    obj.input_tokens,
    obj.prompt_tokens,
    obj.promptTokenCount,
    obj.inputTokenCount,
  )
  const outputTokens = pickNumber(
    obj.output_tokens,
    obj.completion_tokens,
    obj.candidates_token_count,
    obj.outputTokenCount,
    obj.candidatesTokenCount,
  )
  const totalTokens = pickNumber(
    obj.total_tokens,
    obj.totalTokenCount,
    inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null,
  )
  if (inputTokens == null && outputTokens == null && totalTokens == null) return null
  return {
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
    totalTokens: totalTokens ?? 0,
  }
}

function normalizeCost(raw) {
  if (raw == null) return null
  if (typeof raw === 'number' || typeof raw === 'string') {
    const n = Number(raw)
    return Number.isNaN(n) ? null : n
  }
  if (typeof raw !== 'object') return null
  return pickNumber(raw.cost, raw.total_cost, raw.totalCost, raw.usd_cost, raw.amount, raw.value)
}

export function extractUsageAndCost(payload) {
  if (!payload || typeof payload !== 'object') return { usage: null, cost: null, evidence: [] }
  const candidates = [
    payload.usage,
    payload.cost,
    payload.billing,
    payload.usage_metadata,
    payload.usageMetadata,
    payload.meta?.usage,
    payload.meta?.cost,
    payload.result?.usage,
    payload.result?.cost,
    payload.result?.usage_metadata,
    payload.result?.usageMetadata,
  ]
  const usage = candidates.map((x) => normalizeUsageObject(x)).find(Boolean) || null
  const cost =
    candidates.map((x) => normalizeCost(x)).find((x) => typeof x === 'number' && Number.isFinite(x)) ??
    null
  const evidence = []
  if (payload.usage != null) evidence.push('usage')
  if (payload.cost != null) evidence.push('cost')
  if (payload.usage_metadata != null || payload.usageMetadata != null) evidence.push('usage_metadata')
  if (payload.result?.usage != null) evidence.push('result.usage')
  if (payload.result?.cost != null) evidence.push('result.cost')
  return { usage, cost, evidence }
}

function readLedger() {
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLedger(items) {
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(items))
  } catch {
    // ignore quota overflow
  }
}

export function appendUsageLedger(entry) {
  const list = readLedger()
  const next = [...list, entry].slice(-MAX_LEDGER_ITEMS)
  writeLedger(next)
  try {
    window.dispatchEvent(new CustomEvent('poloapi-usage-ledger-updated', { detail: entry }))
  } catch {
    // ignore non-browser environments
  }
}

export function trackApiUsage({ step, endpoint, responsePayload, httpStatus }) {
  const { usage, cost, evidence } = extractUsageAndCost(responsePayload)
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    step: step || 'unknown',
    endpoint: endpoint || '',
    httpStatus: Number(httpStatus) || 0,
    usage,
    cost,
    evidence,
  }
  appendUsageLedger(item)

  // 便于你在浏览器控制台直接核对字段是否存在
  if (usage || cost != null) {
    console.info('[POLOAPI_USAGE]', item)
  } else {
    console.info('[POLOAPI_USAGE_MISSING]', item)
  }
}

export function getUsageLedger() {
  return readLedger()
}

export function clearUsageLedger() {
  writeLedger([])
}
