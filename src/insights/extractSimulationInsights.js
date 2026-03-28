import { buildSimulationInsight, createEntityId } from './simulationInsightModel'

function scoreFromPotential(potential) {
  const s = String(potential || '')
  const num = Number((s.match(/\d+(\.\d+)?/) || [])[0])
  if (!Number.isNaN(num)) return num
  if (s.includes('高')) return 85
  if (s.includes('中')) return 65
  if (s.includes('低')) return 45
  return 50
}

function collectRows(runResult) {
  if (!runResult) return []
  if (runResult.mode === 'single' && runResult.single) {
    const row = runResult.single
    return [
      {
        slotId: row.slotId,
        name: row.name,
        versionId: row.versionId,
        result: row.result,
      },
    ]
  }
  if (runResult.mode === 'compare2' && runResult.compare?.rows) {
    return runResult.compare.rows.map((row) => ({
      slotId: row.slotId,
      name: row.name,
      versionId: row.versionId,
      result: row.result,
    }))
  }
  if (runResult.mode === 'compare3' && runResult.competition?.rows) {
    return runResult.competition.rows.map((row) => ({
      slotId: row.slotId,
      name: row.name,
      versionId: row.versionId,
      result: row.result,
    }))
  }
  return []
}

function barrierToWeakness(barrier, versionId, name) {
  const b = String(barrier || '').toLowerCase()
  let category = 'other'
  if (b.includes('价') || b.includes('溢') || b.includes('成本')) category = 'pricing'
  if (b.includes('风格') || b.includes('审美') || b.includes('调性')) category = 'style_fit'
  if (b.includes('卖') || b.includes('定位') || b.includes('清晰')) category = 'selling_clarity'
  if (b.includes('平台') || b.includes('内容') || b.includes('算法')) category = 'platform_fit'
  if (b.includes('人群') || b.includes('受众')) category = 'audience_fit'
  return {
    id: createEntityId('weak'),
    category,
    description: barrier || `${name || '该产品'} 存在明显短板`,
    relatedVersionIds: versionId ? [versionId] : [],
    severity: 'medium',
  }
}

/**
 * 规则优先：从当前前端可用的模拟结果结构中抽取洞察。
 * roundHistory / agent 轨迹若未接入，可在 context 中传入并逐步合并。
 *
 * @param {{
 *   runResult: object,
 *   runId: string,
 *   readyProducts?: Array<{ versionId?: string, slotId?: string, name?: string }>,
 *   scenarioContext?: Record<string, unknown> | null,
 *   roundHistory?: unknown[],
 * }} input
 * @returns {import('./simulationInsightModel').SimulationInsight}
 */
export function extractSimulationInsights(input) {
  const { runResult, runId, readyProducts = [], scenarioContext = null } = input
  const mode = runResult?.mode || 'single'
  const rows = collectRows(runResult)
  const relatedVersionIds = [
    ...new Set(rows.map((r) => r.versionId).filter(Boolean)),
  ]

  const sorted = [...rows].sort(
    (a, b) =>
      scoreFromPotential(b.result?.summary?.conversion_potential) -
      scoreFromPotential(a.result?.summary?.conversion_potential),
  )

  const winner = sorted[0]
  const loser = sorted.length > 1 ? sorted[sorted.length - 1] : null

  /** @type {import('./simulationInsightModel').SimulationKeyFinding[]} */
  const keyFindings = []

  if (winner?.versionId) {
    keyFindings.push({
      findingId: createEntityId('find'),
      kind: 'metric_trend',
      summary: `综合转化潜力领先：${winner.name || '产品'}（槽位 ${winner.slotId ?? '-' }）`,
      relatedVersionIds: [winner.versionId],
      evidence: { source: 'rules', route: 'finalize.sort_by_conversion_potential' },
    })
  }

  if (mode !== 'single' && winner && loser && loser.versionId) {
    keyFindings.push({
      findingId: createEntityId('find'),
      kind: 'lead_change',
      summary: `对比模式下 ${loser.name || '末位产品'} 转化潜力相对落后，需重点迭代`,
      relatedVersionIds: [loser.versionId].filter(Boolean),
      evidence: { source: 'rules', route: 'compare.tail_vs_head' },
    })
  }

  const weaknesses = []
  for (const row of rows) {
    const barrier = row.result?.summary?.main_barrier
    if (barrier) {
      weaknesses.push(barrierToWeakness(barrier, row.versionId, row.name))
    }
    const risk = row.result?.summary?.trust_risk
    if (risk && String(risk).length > 0 && !String(risk).includes('低')) {
      weaknesses.push({
        id: createEntityId('weak'),
        category: 'risk',
        description: `信任/风险感知：${risk}`,
        relatedVersionIds: row.versionId ? [row.versionId] : [],
        severity: 'medium',
      })
    }
  }

  const opportunities = []
  for (const row of sorted.slice(0, 2)) {
    const opt = row.result?.optimization?.recommended_positioning
    if (opt) {
      opportunities.push({
        id: createEntityId('opp'),
        category: 'reposition_audience',
        description: `${row.name || '产品'}：${opt}`,
        relatedVersionIds: row.versionId ? [row.versionId] : [],
      })
    }
  }

  const strategyAdjustments = {}
  if (scenarioContext?.strategyState) {
    strategyAdjustments.pricingStrategy = {
      reason: '基于模拟末位产品的价格风险信号，建议复核定价区间（规则占位）',
    }
  }

  const summaryParts = []
  if (winner) summaryParts.push(`${winner.name || '领先产品'} 综合表现更优。`)
  if (loser && mode !== 'single') summaryParts.push(`${loser.name || '落后产品'} 需优先补强转化与信任。`)

  return buildSimulationInsight({
    runId,
    sourceMode: mode,
    relatedVersionIds,
    summary: summaryParts.join(' ') || '已完成本轮模拟，详见结构化发现。',
    keyFindings,
    weaknesses,
    opportunities,
    strategyAdjustments,
    confidence: rows.length ? 0.72 : 0.4,
  })
}

/**
 * LLM 辅助层：仅允许写入 narrative、润色 summary、或补充「非计数类」说明字段。
 * 不得修改 keyFindings / weaknesses / opportunities 的条目数量与 version 绑定，除非经过规则校验合并。
 *
 * @param {import('./simulationInsightModel').SimulationInsight} insight
 * @param {{ narrative?: string, summaryOverride?: string }} llmPatch
 */
export function mergeInsightLLMAssist(insight, llmPatch) {
  if (!llmPatch) return insight
  return {
    ...insight,
    summary: llmPatch.summaryOverride || insight.summary,
    narrative: llmPatch.narrative ?? insight.narrative,
  }
}
