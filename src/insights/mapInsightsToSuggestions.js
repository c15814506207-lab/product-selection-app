import { buildOptimizationSuggestion } from './simulationInsightModel'

const TYPE_BY_WEAK = {
  pricing: 'pricing_adjustment',
  style_fit: 'positioning_adjustment',
  selling_clarity: 'content_adjustment',
  platform_fit: 'platform_strategy_adjustment',
  audience_fit: 'audience_adjustment',
  risk: 'content_adjustment',
  other: 'positioning_adjustment',
}

function oppToPatch(opp, fallbackVersionId) {
  const desc = opp.description || ''
  const patch = {}
  if (/人|受众|人群/.test(desc)) patch.target_audience = '（待填）参考模拟建议细化目标人群'
  if (/价|定价/.test(desc)) patch.price = '（待填）参考模拟建议调整价格带'
  if (/卖点|文案|内容/.test(desc)) patch.selling_points = '（待填）强化结构化卖点表达'
  if (/风格|定位/.test(desc)) patch.style = '（待填）对齐平台与人群审美'
  if (Object.keys(patch).length === 0) {
    patch.selling_points = '（待填）按模拟建议压缩核心卖点'
  }
  return {
    targetVersionId: (opp.relatedVersionIds && opp.relatedVersionIds[0]) || fallbackVersionId,
    patch,
    title: '机会驱动：迭代产品与表达',
    description: desc.slice(0, 280),
    type: 'positioning_adjustment',
  }
}

function weakToPatch(w, fallbackVersionId) {
  const type = TYPE_BY_WEAK[w.category] || 'positioning_adjustment'
  const patch = {}
  if (w.category === 'pricing') patch.price = '（待填）下调溢价或明确价值锚点'
  if (w.category === 'audience_fit') patch.target_audience = '（待填）收缩或迁移目标人群'
  if (w.category === 'selling_clarity') patch.selling_points = '（待填）突出单一主卖点 + 证据'
  if (w.category === 'style_fit') patch.style = '（待填）调整风格关键词与场景意象'
  if (w.category === 'platform_fit') patch.usage_scenario = '（待填）补充平台语境下的使用场景'
  if (Object.keys(patch).length === 0) patch.selling_points = '（待填）对照短板补强表达'
  return {
    targetVersionId: (w.relatedVersionIds && w.relatedVersionIds[0]) || fallbackVersionId,
    patch,
    title: `针对短板：${w.category}`,
    description: w.description,
    type,
  }
}

/**
 * 规则生成具体 suggestion，避免空泛：每条必须带 snapshotPatch 与 targetVersionId。
 *
 * @param {import('./simulationInsightModel').SimulationInsight} insight
 * @param {{ max?: number, fallbackVersionId?: string }} options
 * @returns {import('./simulationInsightModel').OptimizationSuggestion[]}
 */
export function mapInsightsToSuggestions(insight, options = {}) {
  const max = options.max ?? 8
  const fallbackVersionId =
    options.fallbackVersionId ||
    (insight.relatedVersionIds && insight.relatedVersionIds[0]) ||
    ''

  const raw = []

  for (const w of insight.weaknesses || []) {
    raw.push(weakToPatch(w, fallbackVersionId))
  }
  for (const o of insight.opportunities || []) {
    raw.push(oppToPatch(o, fallbackVersionId))
  }

  if (raw.length === 0 && fallbackVersionId) {
    raw.push({
      targetVersionId: fallbackVersionId,
      patch: { selling_points: '（待填）基于模拟摘要收敛卖点' },
      title: '综合迭代',
      description: insight.summary || '根据模拟摘要做一次最小改动迭代',
      type: 'content_adjustment',
    })
  }

  const dedup = new Set()
  const suggestions = []
  for (const item of raw) {
    if (!item.targetVersionId) continue
    const key = `${item.type}:${item.targetVersionId}:${JSON.stringify(item.patch)}`
    if (dedup.has(key)) continue
    dedup.add(key)
    suggestions.push(
      buildOptimizationSuggestion({
        sourceInsightId: insight.insightId,
        targetVersionId: item.targetVersionId,
        suggestionType: item.type,
        title: item.title,
        description: item.description,
        proposedChanges: {
          snapshotPatch: item.patch,
          rationaleCodes: ['rule:insight_to_patch'],
        },
        expectedImpact: [
          { dimension: 'conversionPotential', direction: 'up', magnitudeHint: 'medium' },
        ],
        confidence: insight.confidence,
      }),
    )
    if (suggestions.length >= max) break
  }

  return suggestions
}
