/**
 * Off-screen layouts for workshop report PNG export (A4 landscape).
 * Styled to match Product Lab analysis / optimization cards.
 */

function toScore100(score10) {
  const n = Number(score10)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 10)))
}

function buildStage1Rows(analysisResult, inputProducts) {
  const raw = analysisResult?.products || []
  const normalizeName = (s) => (s == null ? '' : String(s)).trim()
  const byName = new Map()
  for (const p of raw) {
    const key = normalizeName(p?.name)
    if (!key) continue
    if (!byName.has(key)) byName.set(key, p)
  }

  return [0, 1, 2].map((originalIndex) => {
    const inputName = normalizeName(inputProducts?.[originalIndex]?.name)
    const matched =
      (inputName && byName.get(inputName)) || raw[originalIndex] || raw[0] || {}
    const score100 = toScore100(matched?.score)
    return {
      originalIndex,
      score100,
      positioning: matched?.positioning,
      strengths: matched?.strengths,
      weaknesses: matched?.weaknesses,
      suggestion: matched?.suggestion,
    }
  })
}

function marketFitLabelFromScores(scores100) {
  const best = Math.max(...scores100, 0)
  if (best >= 90) return '极高'
  if (best >= 75) return '较高'
  if (best >= 60) return '中等'
  return '一般'
}

const tones = [
  {
    color: 'text-primary',
    rankColor: 'text-primary/25',
    badgeBg: 'bg-primary',
    badgeText: 'text-on-primary',
    tag: '市场领导者',
  },
  {
    color: 'text-[#f59e0b]',
    rankColor: 'text-[#f59e0b]/25',
    badgeBg: 'bg-[#f59e0b]/10',
    badgeText: 'text-[#f59e0b]',
    tag: '稳健增长',
  },
  {
    color: 'text-error',
    rankColor: 'text-error/25',
    badgeBg: 'bg-error/10',
    badgeText: 'text-error',
    tag: '需转型调整',
  },
]

/**
 * 导出 PNG 固定像素：各页宽高一致（A4 横向比例 297:210），html2canvas 与预览翻页时尺寸统一。
 * 页内过长文案在卡片内纵向滚动，避免再出现叠字或高度不一致。
 */
export const WORKSHOP_EXPORT_PAGE_WIDTH = 1580
export const WORKSHOP_EXPORT_PAGE_HEIGHT = Math.round((WORKSHOP_EXPORT_PAGE_WIDTH * 210) / 297)

const PAGE_CLASS = 'box-border bg-surface text-on-surface font-body flex flex-col min-h-0'

/** 与「定位」等小标题一致，便于分数上移距离与标题行高对齐 */
const REPORT_SECTION_LABEL_CLASS = 'mb-1.5 text-[14px] font-bold uppercase leading-none'

function SummaryMetricRing({ label, value }) {
  return (
    <div
      className="flex h-[120px] w-[120px] shrink-0 flex-col items-center justify-center rounded-full border-2 border-primary/35 bg-primary/10 text-center shadow-[0_0_24px_rgba(211,254,93,0.12)]"
      style={{ boxSizing: 'border-box' }}
    >
      <div className="px-2 text-[9px] font-bold uppercase leading-tight text-primary">{label}</div>
      <div className="mt-1 font-headline text-lg font-black leading-none text-primary">{value}</div>
    </div>
  )
}

export function AnalysisReportPage({ analysisResult, inputProducts, productThumbUrls }) {
  const rows = buildStage1Rows(analysisResult, inputProducts)
  const readyProducts = (inputProducts || []).filter(
    (p) => p?.name && p?.image_url && p?.price && p?.material && p?.style && p?.target_audience && p?.selling_points,
  )
  const singleProductSummary =
    readyProducts.length === 1
      ? '当前为单产品分析模式，综合分析摘要将聚焦该产品的市场定位、核心优劣势与可执行优化方向。'
      : ''
  const ranksByOriginalIndex = (() => {
    const sorted = [...rows].sort((a, b) => b.score100 - a.score100)
    const out = {}
    sorted.forEach((r, i) => {
      out[r.originalIndex] = i + 1
    })
    return out
  })()

  const avg100 = rows.length ? rows.reduce((a, r) => a + r.score100, 0) / rows.length : 0
  const successRate = `${avg100.toFixed(1)}%`
  const fitLabel = marketFitLabelFromScores(rows.map((r) => r.score100))

  return (
    <div
      data-workshop-report-page="analysis"
      className={`${PAGE_CLASS} overflow-hidden`}
      style={{
        boxSizing: 'border-box',
        width: WORKSHOP_EXPORT_PAGE_WIDTH,
        height: WORKSHOP_EXPORT_PAGE_HEIGHT,
      }}
    >
      <div className="flex h-full w-full flex-col gap-4 p-8 box-border">
        <div className="shrink-0 font-headline text-[26px] font-bold text-primary">分析报告</div>

        <div
          className="grid min-h-0 w-full flex-1 grid-cols-3 gap-5"
          style={{ alignItems: 'stretch', width: '100%' }}
        >
        {rows.map((row) => {
          const originalIdx = row.originalIndex
          const rankNum = ranksByOriginalIndex[originalIdx] || 3
          const meta = tones[rankNum - 1] || tones[2]
          const isTop = rankNum === 1
          const thumb = productThumbUrls?.[originalIdx] || ''
          return (
            <div
              key={`rep-${originalIdx}`}
              className={[
                'relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-surface-container-low',
                isTop ? 'border-primary/25 p-7 shadow-2xl' : 'border-outline-variant/10 p-5',
              ].join(' ')}
              style={{ minWidth: 0 }}
            >
              {/* 右上角：原 01/02/03 水印区 → 缩略图（3:4）+ 名称 */}
              <div
                className={`absolute right-3 top-3 z-[1] flex flex-col items-center ${isTop ? 'gap-1.5' : 'gap-1'}`}
              >
                <div
                  className="overflow-hidden rounded-md border border-outline-variant/20 bg-surface-container-highest"
                  style={{
                    width: isTop ? 96 : 80,
                    aspectRatio: '3 / 4',
                  }}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-on-surface-variant">
                      无图
                    </div>
                  )}
                </div>
                <div className="max-w-[112px] text-center text-[10px] font-bold leading-[1.45] text-on-surface-variant">
                  {inputProducts?.[originalIdx]?.name || `产品${originalIdx + 1}`}
                </div>
              </div>

              <div className="min-w-0 space-y-2 pr-[108px]">
                <div
                  className={`-translate-y-[14px] inline-block font-headline font-bold leading-none ${meta.color} ${
                    isTop ? 'text-[52px]' : 'text-[40px]'
                  }`}
                >
                  {row.score100}
                  <span
                    className={`ml-1 ${isTop ? 'text-xl' : 'text-lg'} font-normal text-on-surface-variant`}
                  >
                    /100
                  </span>
                </div>
                <div
                  className={`inline-flex h-[24px] min-w-[92px] max-w-full items-center justify-center rounded-full px-3.5 text-center text-[10px] font-bold leading-[1] ${meta.badgeBg} ${meta.badgeText}`}
                >
                  {meta.tag}
                </div>
                <div className="text-xs font-bold text-on-surface-variant">
                  产品{['一', '二', '三'][originalIdx] || originalIdx + 1}
                </div>
              </div>

              <div
                className={`mt-6 min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${isTop ? 'text-[15px]' : 'text-sm'} font-body leading-relaxed`}
              >
                <div className="flex flex-col space-y-3 pr-1">
                <div className="min-w-0">
                  <div className={`${REPORT_SECTION_LABEL_CLASS} ${meta.color}`}>定位</div>
                  <p className="break-words text-on-surface-variant">{row.positioning || '—'}</p>
                </div>
                <div className="min-w-0">
                  <div className={`${REPORT_SECTION_LABEL_CLASS} ${meta.color}`}>优势</div>
                  <p className="break-words text-on-surface-variant">
                    {Array.isArray(row.strengths) ? row.strengths.join('，') : row.strengths || '—'}
                  </p>
                </div>
                <div className="min-w-0">
                  <div className={`${REPORT_SECTION_LABEL_CLASS} ${meta.color}`}>劣势</div>
                  <p className="break-words text-on-surface-variant">
                    {Array.isArray(row.weaknesses) ? row.weaknesses.join('，') : row.weaknesses || '—'}
                  </p>
                </div>
                <div className="min-w-0">
                  <div className={`${REPORT_SECTION_LABEL_CLASS} ${meta.color}`}>AI 建议</div>
                  <p className={`break-words font-medium ${meta.color}`}>{row.suggestion || '—'}</p>
                </div>
                </div>
              </div>
            </div>
          )
        })}
        </div>

      <div
        className="flex w-full shrink-0 flex-row flex-nowrap items-start gap-8 rounded-lg border border-outline-variant/10 bg-surface-container-low p-6"
        style={{ boxSizing: 'border-box' }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-primary">综合分析摘要</h3>
          <p className="break-words text-sm leading-relaxed text-on-surface-variant">
            {singleProductSummary || analysisResult?.comparison?.summary || '—'}
          </p>
        </div>
        <div className="flex shrink-0 gap-4">
          <SummaryMetricRing label="预期成功率" value={successRate} />
          <SummaryMetricRing label="市场契合度" value={fitLabel} />
        </div>
      </div>
      </div>
    </div>
  )
}

function formatYuan(v) {
  if (v == null) return ''
  const s = String(v).trim()
  if (!s) return ''
  if (s.includes('元')) return s
  return `${s}元`
}

export function OptimizationReportPage({
  productOrdinalLabel,
  optimizationResult,
  originalPrice,
  productName,
  thumbUrl,
}) {
  const sellingPoints = Array.isArray(optimizationResult?.optimized_selling_points)
    ? optimizationResult.optimized_selling_points
    : []
  const mainRisks = Array.isArray(optimizationResult?.risk_control?.main_risks)
    ? optimizationResult.risk_control.main_risks
    : []
  const solutions = Array.isArray(optimizationResult?.risk_control?.solutions)
    ? optimizationResult.risk_control.solutions
    : []

  const recommended = optimizationResult?.recommended_price_range || '—'
  const recommendedText = recommended === '—' ? '—' : formatYuan(recommended)
  const originalText = formatYuan(originalPrice)

  return (
    <div
      data-workshop-report-page="optimization"
      className={`${PAGE_CLASS} overflow-hidden`}
      style={{
        boxSizing: 'border-box',
        width: WORKSHOP_EXPORT_PAGE_WIDTH,
        height: WORKSHOP_EXPORT_PAGE_HEIGHT,
      }}
    >
      <div className="flex h-full w-full min-h-0 flex-col gap-3 p-8 box-border">
        <div className="shrink-0 font-headline text-[26px] font-bold text-primary">优化方案</div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-outline-variant/10 bg-surface-container-low p-8"
        style={{ boxSizing: 'border-box' }}
      >
        <div className="flex flex-row items-start gap-8">
          <div className="flex w-[104px] shrink-0 flex-col items-center gap-1 pt-1">
            <div
              className="overflow-hidden rounded-md border border-outline-variant/20 bg-surface-container-highest"
              style={{ width: 96, aspectRatio: '3 / 4' }}
            >
              {thumbUrl ? (
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-on-surface-variant">
                  无图
                </div>
              )}
            </div>
            <div className="w-full break-words text-center text-xs font-bold text-on-surface-variant">
              {productName || productOrdinalLabel}
            </div>
          </div>

          <div
            className="min-w-0 flex-1 grid gap-x-12 gap-y-8"
            style={{ gridTemplateColumns: '1fr 1fr', width: '100%' }}
          >
          <div className="min-w-0 space-y-6 border-r border-outline-variant/10 pr-6">
            <div className="space-y-2">
              <div className="text-[17px] font-bold uppercase tracking-widest text-primary">优化后的定位</div>
              <p className="break-words text-base leading-relaxed text-on-surface">
                {optimizationResult?.optimized_positioning || '—'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-[17px] font-bold uppercase tracking-widest text-primary">目标人群</div>
              <p className="break-words text-base leading-relaxed text-on-surface">
                {optimizationResult?.optimized_target_audience || '—'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-[17px] font-bold uppercase tracking-widest text-primary">战略定价</div>
              <div className="flex flex-wrap items-baseline gap-2">
                <div className="font-headline text-4xl font-black tracking-tight text-on-surface">{recommendedText}</div>
                {originalText ? (
                  <div className="text-sm font-bold text-on-surface-variant">（原价：{originalText}）</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-6">
            <div className="space-y-2">
              <div className="text-[17px] font-bold uppercase tracking-widest text-primary">卖点 (V2.0)</div>
              {sellingPoints.length ? (
                <ul className="space-y-2 text-sm leading-relaxed text-on-surface">
                  {sellingPoints.slice(0, 6).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/70" />
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-on-surface-variant">—</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-outline-variant/5 bg-surface-container p-3">
                <div className="mb-2 text-[13px] font-bold uppercase text-primary">社交媒体策略</div>
                <p className="break-words text-xs leading-relaxed text-on-surface">
                  {optimizationResult?.content_strategy?.xhs_angle || '—'}
                </p>
              </div>
              <div className="rounded-lg border border-outline-variant/5 bg-surface-container p-3">
                <div className="mb-2 text-[13px] font-bold uppercase text-primary">视觉重点</div>
                <p className="break-words text-xs leading-relaxed text-on-surface">
                  {optimizationResult?.content_strategy?.visual_focus || '—'}
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-error/20 bg-error/5 p-5">
          <label className="mb-3 block text-[16px] font-bold uppercase text-error">风险与解决方案</label>
          <div
            className="grid gap-4 text-sm leading-relaxed text-on-surface-variant"
            style={{ gridTemplateColumns: '1fr 1fr' }}
          >
            <div>
              <div className="mb-2 font-bold text-error/90">主要风险</div>
              {mainRisks.length ? (
                <ul className="space-y-1">
                  {mainRisks.map((item, idx) => (
                    <li key={idx}>- {item}</li>
                  ))}
                </ul>
              ) : (
                <div>—</div>
              )}
            </div>
            <div>
              <div className="mb-2 font-bold text-primary">解决方案</div>
              {solutions.length ? (
                <ul className="space-y-1">
                  {solutions.map((item, idx) => (
                    <li key={idx}>- {item}</li>
                  ))}
                </ul>
              ) : (
                <div>—</div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export { buildStage1Rows }
