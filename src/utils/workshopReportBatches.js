/**
 * 将单次「生成报告」产生的多张图片记录合并为一条「成套」记录，供导出报告弹窗展示。
 * 兼容旧数据：id 形如 img-{ts}-{idx}；新数据：batchId + batch-{ts}-p{idx}
 */

export function deriveBatchId(record) {
  if (record?.batchId != null && record.batchId !== '') return String(record.batchId)
  const id = String(record?.id || '')
  const mNew = id.match(/^(batch-\d+)-p\d+$/)
  if (mNew) return mNew[1]
  const mOld = id.match(/^img-(\d+)-\d+$/)
  if (mOld) return `batch-${mOld[1]}`
  return id
}

function sortPagesInBatch(pages) {
  return [...pages].sort((a, b) => {
    const ai = Number.isFinite(a.pageIndex) ? a.pageIndex : a.payload?.pageIndex
    const bi = Number.isFinite(b.pageIndex) ? b.pageIndex : b.payload?.pageIndex
    if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi
    if (a.kind === 'analysis' && b.kind !== 'analysis') return -1
    if (a.kind !== 'analysis' && b.kind === 'analysis') return 1
    const api = Number(a.payload?.productIndex ?? 0)
    const bpi = Number(b.payload?.productIndex ?? 0)
    return api - bpi
  })
}

/**
 * @param {Array<object>} rows - localStorage / state 中的原始生成记录列表
 * @returns {Array<{ id, type: 'workshop-batch', title, pageCount, createdAt, image_url, pages }>}
 */
export function groupWorkshopRecordsIntoBatches(rows) {
  if (!Array.isArray(rows) || !rows.length) return []
  const byBatch = new Map()
  for (const x of rows) {
    const bid = deriveBatchId(x)
    if (!byBatch.has(bid)) byBatch.set(bid, [])
    byBatch.get(bid).push(x)
  }

  const batches = []
  for (const [batchId, rawPages] of byBatch) {
    const sorted = sortPagesInBatch(rawPages)
    const first = sorted[0] || {}
    const createdAt = first.createdAt || new Date().toISOString()
    const thumb = first.image_url || first.imageDataUrl || ''
    batches.push({
      id: batchId,
      type: 'workshop-batch',
      title: '工作坊报告',
      pageCount: sorted.length,
      createdAt,
      image_url: thumb,
      pages: sorted.map((p) => ({
        title: p.title || '报告',
        kind: p.kind ?? p.payload?.kind,
        imageDataUrl: p.imageDataUrl,
      })),
    })
  }

  return batches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}
