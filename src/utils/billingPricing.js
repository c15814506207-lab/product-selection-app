const PRICING_TABLE = {
  'analyze-product': { base: 0.08, per1kInput: 0.012, per1kOutput: 0.028 },
  'optimize-product': { base: 0.06, per1kInput: 0.01, per1kOutput: 0.024 },
  'fill-product-from-image': { base: 0.05, per1kInput: 0.01, per1kOutput: 0.02 },
  'simulate-market': { base: 0.04, per1kInput: 0.008, per1kOutput: 0.018 },
  'generate-workshop-report': { base: 0.0, per1kInput: 0.0, per1kOutput: 0.0 },
  default: { base: 0.05, per1kInput: 0.01, per1kOutput: 0.02 },
}

function toNumber(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function estimateCostFromUsage(step, usage) {
  const pricing = PRICING_TABLE[step] || PRICING_TABLE.default
  const inputTokens = toNumber(usage?.inputTokens, 0)
  const outputTokens = toNumber(usage?.outputTokens, 0)
  const totalTokens = toNumber(usage?.totalTokens, inputTokens + outputTokens)
  const safeInput = inputTokens > 0 ? inputTokens : Math.round(totalTokens * 0.65)
  const safeOutput = outputTokens > 0 ? outputTokens : Math.max(0, totalTokens - safeInput)
  const tokenCost = (safeInput / 1000) * pricing.per1kInput + (safeOutput / 1000) * pricing.per1kOutput
  return Math.max(0, pricing.base + tokenCost)
}

export function getStepDefaultEstimate(step) {
  const pricing = PRICING_TABLE[step] || PRICING_TABLE.default
  return Math.max(0, toNumber(pricing.base, 0))
}
