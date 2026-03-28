/**
 * LLM 辅助：仅生成 narrative / 可读摘要，不参与结构化绑定的创建或删除。
 * 接入真实模型时在此调用 edge function；失败返回 null，由调用方忽略。
 *
 * @param {import('./simulationInsightModel').SimulationInsight} insight
 * @returns {Promise<{ narrative?: string, summaryOverride?: string }|null>}
 */
export async function enrichInsightSummaryLLM(_insight) {
  return null
}
