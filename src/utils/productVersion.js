export function createVersionId(prefix = 'ver') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** @param {object} version */
export function ensureLineageRoot(version) {
  const productId = version?.productId || 'product-unknown'
  return {
    parentVersionId: null,
    rootProductId: productId,
    lineageId: version?.lineageId || `lineage-${productId}`,
    generationType: version?.generationType || 'original_input',
    sourceRunId: version?.sourceRunId ?? null,
    sourceInsightId: version?.sourceInsightId ?? null,
    sourceSuggestionId: version?.sourceSuggestionId ?? null,
  }
}

/**
 * @param {object} version
 * @param {object|null} parent
 * @param {{
 *   generationType?: string,
 *   sourceRunId?: string|null,
 *   sourceInsightId?: string|null,
 *   sourceSuggestionId?: string|null,
 * }} [meta]
 */
export function attachLineageFromParent(version, parent, meta = {}) {
  const rootProductId = parent?.rootProductId || parent?.productId || version.productId
  const lineageId = parent?.lineageId || `lineage-${rootProductId}`
  return {
    ...version,
    parentVersionId: parent?.versionId || null,
    rootProductId: rootProductId || version.productId,
    lineageId,
    generationType: meta.generationType || version.generationType || 'manual_optimization',
    sourceRunId: meta.sourceRunId ?? version.sourceRunId ?? null,
    sourceInsightId: meta.sourceInsightId ?? version.sourceInsightId ?? null,
    sourceSuggestionId: meta.sourceSuggestionId ?? version.sourceSuggestionId ?? null,
  }
}

export function createOriginalVersion(product, index, analysisResult = null) {
  const productId = `product-${index + 1}`
  return {
    versionId: `original-${index + 1}`,
    productId,
    versionType: 'original',
    versionName: `原始版 V${index + 1}`,
    sourceStep: 'input',
    snapshotData: {
      ...product,
      usage_scenario: product?.usage_scenario || '',
    },
    analysisResult,
    optimizationResult: null,
    reanalysisResult: null,
    createdAt: new Date().toISOString(),
  }
}

export function createOptimizedVersion(baseVersion, optimizationResult, order = 1) {
  const parseSuggestedPrice = (raw) => {
    if (raw == null) return ''
    if (typeof raw === 'number' && !Number.isNaN(raw)) return String(raw)
    const s = String(raw)
    // 提取第一个可用数字（支持 1,149 / 1149 / 1149.00 等）
    const m = s.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
    return m ? m[1] : ''
  }

  const optimizedSnapshot = {
    ...(baseVersion?.snapshotData || {}),
    style: optimizationResult?.optimized_positioning || baseVersion?.snapshotData?.style || '',
    target_audience:
      optimizationResult?.optimized_target_audience ||
      baseVersion?.snapshotData?.target_audience ||
      '',
    selling_points: Array.isArray(optimizationResult?.optimized_selling_points)
      ? optimizationResult.optimized_selling_points.join('；')
      : baseVersion?.snapshotData?.selling_points || '',
    price:
      parseSuggestedPrice(optimizationResult?.recommended_price_range) ||
      parseSuggestedPrice(baseVersion?.snapshotData?.price) ||
      '',
  }

  const core = {
    versionId: createVersionId('optimized'),
    productId: baseVersion?.productId || optimizationResult?.productName || createVersionId('product'),
    versionType: 'optimized',
    versionName: `优化版 V${order}`,
    sourceStep: 'optimize',
    snapshotData: optimizedSnapshot,
    analysisResult: null,
    optimizationResult,
    reanalysisResult: null,
    createdAt: new Date().toISOString(),
  }
  return attachLineageFromParent(core, baseVersion, { generationType: 'manual_optimization' })
}

export function createOptimizedReanalyzedVersion(baseVersion, analysisItem, order = 1) {
  const core = {
    versionId: createVersionId('optimized-reanalyzed'),
    productId: baseVersion?.productId || createVersionId('product'),
    versionType: 'optimized_reanalyzed',
    versionName: `优化后分析版 V${order}A`,
    sourceStep: 'reanalyze',
    snapshotData: {
      ...(baseVersion?.snapshotData || {}),
      name: analysisItem?.name || baseVersion?.snapshotData?.name || '',
    },
    analysisResult: analysisItem || null,
    optimizationResult: baseVersion?.optimizationResult || null,
    reanalysisResult: analysisItem || null,
    createdAt: new Date().toISOString(),
  }
  return attachLineageFromParent(core, baseVersion, { generationType: 'reanalysis' })
}

export function toSandboxCandidate(version) {
  return {
    versionId: version.versionId,
    productId: version.productId,
    source: version.versionType,
    versionName: version.versionName,
    createdAt: version.createdAt,
    snapshotData: version.snapshotData,
    lineageId: version.lineageId,
    generationType: version.generationType,
    parentVersionId: version.parentVersionId,
  }
}
