/**
 * 结构化模拟洞察与优化建议模型（纯数据工厂，无 I/O）
 * LLM 仅可填充 narrative 类字段，不得替换规则产出的结构化 evidence。
 */

export function createEntityId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * @typedef {'single'|'compare2'|'compare3'} SandboxMode
 * @typedef {'pricing'|'style_fit'|'selling_clarity'|'platform_fit'|'audience_fit'|'conversion'|'risk'|'other'} WeaknessCategory
 * @typedef {'reposition_audience'|'content_strategy'|'pricing'|'selling_points'|'platform_focus'|'launch_timing'|'other'} OpportunityCategory
 */

/**
 * 单条发现（结构化，便于 UI / 下游映射）
 * @typedef {{
 *   findingId: string,
 *   kind: 'audience_preference'|'platform_preference'|'lead_change'|'metric_trend'|'risk'|'other',
 *   summary: string,
 *   relatedVersionIds: string[],
 *   evidence: { source: 'rules'|'llm_assist', route?: string, details?: Record<string, unknown> }
 * }} SimulationKeyFinding
 */

/**
 * @typedef {{
 *   insightId: string,
 *   runId: string,
 *   sourceMode: SandboxMode,
 *   relatedVersionIds: string[],
 *   summary: string,
 *   keyFindings: SimulationKeyFinding[],
 *   weaknesses: Array<{ id: string, category: string, description: string, relatedVersionIds: string[], severity?: 'low'|'medium'|'high' }>,
 *   opportunities: Array<{ id: string, category: string, description: string, relatedVersionIds: string[] }>,
 *   strategyAdjustments: {
 *     pricingStrategy?: { from?: string, to?: string, reason?: string },
 *     contentStrategy?: { from?: string, to?: string, reason?: string },
 *     targetAudience?: { from?: string, to?: string, reason?: string },
 *     launchStrategy?: { from?: string, to?: string, reason?: string },
 *   },
 *   confidence: number,
 *   createdAt: string,
 *   narrative?: string,
 * }} SimulationInsight
 */

/**
 * @typedef {{
 *   suggestionId: string,
 *   sourceInsightId: string,
 *   targetVersionId: string,
 *   suggestionType: 'pricing_adjustment'|'content_adjustment'|'audience_adjustment'|'positioning_adjustment'|'platform_strategy_adjustment'|'launch_strategy_adjustment',
 *   title: string,
 *   description: string,
 *   proposedChanges: {
 *     snapshotPatch: Partial<Record<'price'|'target_audience'|'selling_points'|'style'|'material'|'usage_scenario'|'name', string>>,
 *     rationaleCodes?: string[],
 *   },
 *   expectedImpact: { dimension: string, direction: 'up'|'down'|'neutral', magnitudeHint?: 'low'|'medium'|'high' }[],
 *   confidence: number,
 * }} OptimizationSuggestion
 */

/** @param {Partial<SimulationInsight>} patch */
export function buildSimulationInsight(patch) {
  const now = new Date().toISOString()
  return {
    insightId: patch.insightId || createEntityId('insight'),
    runId: patch.runId || '',
    sourceMode: patch.sourceMode || 'single',
    relatedVersionIds: patch.relatedVersionIds || [],
    summary: patch.summary || '',
    keyFindings: patch.keyFindings || [],
    weaknesses: patch.weaknesses || [],
    opportunities: patch.opportunities || [],
    strategyAdjustments: patch.strategyAdjustments || {},
    confidence: typeof patch.confidence === 'number' ? patch.confidence : 0.65,
    createdAt: patch.createdAt || now,
    narrative: patch.narrative,
  }
}

/** @param {Partial<OptimizationSuggestion>} patch */
export function buildOptimizationSuggestion(patch) {
  return {
    suggestionId: patch.suggestionId || createEntityId('sugg'),
    sourceInsightId: patch.sourceInsightId || '',
    targetVersionId: patch.targetVersionId || '',
    suggestionType: patch.suggestionType || 'positioning_adjustment',
    title: patch.title || '',
    description: patch.description || '',
    proposedChanges: {
      snapshotPatch: patch.proposedChanges?.snapshotPatch || {},
      rationaleCodes: patch.proposedChanges?.rationaleCodes || [],
    },
    expectedImpact: patch.expectedImpact || [],
    confidence: typeof patch.confidence === 'number' ? patch.confidence : 0.6,
  }
}
