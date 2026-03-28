import { attachLineageFromParent, createVersionId } from '../utils/productVersion'

/**
 * 将建议中的局部字段合并进快照（不强制用户重填整张卡）
 * @param {Record<string, string>} snapshot
 * @param {import('../insights/simulationInsightModel').OptimizationSuggestion['proposedChanges']} proposed
 */
export function applyProposedChangesToSnapshot(snapshot, proposed) {
  const next = { ...(snapshot || {}) }
  const patch = proposed?.snapshotPatch || {}
  for (const [key, value] of Object.entries(patch)) {
    if (value != null && value !== '') {
      next[key] = value
    }
  }
  return next
}

/**
 * @param {{
 *   parentVersion: object,
 *   insight: import('../insights/simulationInsightModel').SimulationInsight | null,
 *   suggestion: import('../insights/simulationInsightModel').OptimizationSuggestion,
 *   order?: number,
 * }} args
 */
export function createSimulationDrivenVersion(args) {
  const { parentVersion, insight, suggestion, order = 1 } = args
  const snapshotData = applyProposedChangesToSnapshot(
    parentVersion?.snapshotData || {},
    suggestion.proposedChanges,
  )

  const base = {
    versionId: createVersionId('sim-driven'),
    productId: parentVersion?.productId || 'product-unknown',
    versionType: 'simulation_driven',
    versionName: `模拟驱动版 V${order}`,
    sourceStep: 'simulation_feedback',
    snapshotData,
    analysisResult: null,
    optimizationResult: null,
    reanalysisResult: null,
    createdAt: new Date().toISOString(),
    simulationSuggestionSnapshot: {
      suggestionId: suggestion.suggestionId,
      title: suggestion.title,
      description: suggestion.description,
    },
  }

  return attachLineageFromParent(base, parentVersion, {
    generationType: 'simulation_driven_optimization',
    sourceRunId: insight?.runId || null,
    sourceInsightId: insight?.insightId || suggestion.sourceInsightId,
    sourceSuggestionId: suggestion.suggestionId,
  })
}
