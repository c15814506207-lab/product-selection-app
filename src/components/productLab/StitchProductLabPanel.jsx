import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import AnalysisComparisonCard from '../results/AnalysisComparisonCard'
import AnalysisRankingCard from '../results/AnalysisRankingCard'
import OptimizationResultSection from '../results/OptimizationResultSection'
import { resolveProductImageDisplayUrl } from '../../utils/productImageUrl'

const FIELD_CONFIG = [
  { label: '产品名称', key: 'name', placeholder: '条目名称' },
  { label: '销售价格', key: 'price', placeholder: '¥ 0.00' },
  { label: '成本价格', key: 'cost', placeholder: '¥ 0.00' },
  { label: '产品类型', key: 'type', placeholder: '服饰/配饰' },
  // 注意：后端分析使用 `style` 字段，所以这里把“产品定位”映射到 `style`，确保现有逻辑不被破坏。
  { label: '产品定位', key: 'style', placeholder: '市场层级' },
  { label: '颜色/款式数量', key: 'variants', placeholder: 'SKU 数量' },
  { label: '工艺', key: 'craft', placeholder: '制作技术' },
  { label: '材质', key: 'material', placeholder: '原材料' },
  { label: '目标人群', key: 'target_audience', placeholder: '目标画像', full: true },
  { label: '卖点', key: 'selling_points', placeholder: 'USP 列表', full: true },
  { label: '其他补充', key: 'notes', placeholder: '内部注释...', full: true },
]

function PlaceholderShimmer({ className = '' }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />
}

/** 潜力图例：分析前/分析后均保持显示（与第二阶段优化区进度条布局一致） */
function Stage1PotentialLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-label uppercase text-on-surface-variant">
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-primary" />
        高潜力
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
        中潜力
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-error" />
        低潜力
      </span>
    </div>
  )
}

function HistoryPickerItem({ item, onSelect, onDelete }) {
  const input = item?.product || {}
  const name = input?.name || '未命名产品'
  const imageUrl = input?.image_url || ''
  const [thumbUrl, setThumbUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!imageUrl) {
      setThumbUrl('')
      return
    }
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      setThumbUrl(imageUrl)
      return
    }
    void resolveProductImageDisplayUrl(imageUrl).then((url) => {
      if (!cancelled) setThumbUrl(url || '')
    })
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return (
    <div className="group flex w-full items-center gap-3 rounded-lg border border-outline-variant/10 bg-surface-container-low p-3 text-left transition hover:border-primary/30">
      <div className="relative h-12 w-12 shrink-0">
        <button
          type="button"
          aria-label="从历史列表删除"
          title="删除"
          className="absolute left-0 top-0 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-black/70 text-[13px] font-bold leading-none text-on-surface shadow-sm transition hover:bg-error hover:text-on-primary"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete?.(item)
          }}
        >
          ×
        </button>
        <button
          type="button"
          onClick={() => onSelect?.(item)}
          className="h-12 w-12 overflow-hidden rounded-md border border-outline-variant/10 bg-surface-container-highest p-0"
        >
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">image</span>
            </div>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="truncate text-sm font-bold text-on-surface group-hover:text-on-surface">{name}</div>
        <div className="mt-0.5 truncate text-xs text-on-surface-variant">
          {input?.material ? `材质：${input.material}` : '材质：—'}
          {' · '}
          {input?.style ? `定位：${input.style}` : '定位：—'}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        className="inline-flex shrink-0 text-on-surface-variant transition hover:text-primary"
        aria-label="选择此产品"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </button>
    </div>
  )
}

function HistoryProductPickerModal({ open, loading, records, onClose, onSelect, onDelete }) {
  if (!open) return null

  const completeRecords = records || []

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => onClose?.()}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-high shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-5 py-4">
          <div>
            <div className="text-sm font-bold text-on-surface">选择历史产品</div>
            <div className="mt-0.5 text-xs text-on-surface-variant">
              点击任意产品，将其图片与信息回填到当前卡片
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/10 text-on-surface-variant hover:text-on-surface"
            aria-label="关闭"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto p-5">
          {loading ? (
            <div className="text-sm text-on-surface-variant">加载中...</div>
          ) : completeRecords?.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {completeRecords.map((r) => (
                <HistoryPickerItem key={r.id} item={r} onSelect={onSelect} onDelete={onDelete} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-on-surface-variant">暂无信息完整的历史产品</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stage1Placeholder({ showOptimizeCta = true } = {}) {
  return (
    <div className="space-y-8">
      {/* 分析前：三个卡片完全一致 */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 items-end">
        {[0, 1, 2].map((i) => (
          <div
            // key 不参与任何显示逻辑，只保证稳定渲染
            key={i}
            className="relative h-[540px] overflow-hidden rounded-lg border border-outline-variant/10 bg-surface-container-low p-9 space-y-6"
          >
            <div className="absolute left-0 top-0 p-4 text-xs font-bold text-on-surface-variant">
              产品{['一', '二', '三'][i] || i + 1}
            </div>
            <div className="absolute right-0 top-0 p-4 font-headline text-4xl font-black text-primary/40">
              00
            </div>

            <div className="space-y-2">
              <div className="text-6xl font-headline font-bold text-primary leading-none">
                100<span className="text-2xl font-normal text-on-surface-variant">/100</span>
              </div>
            </div>

            <div className="space-y-4 text-sm text-on-surface-variant">
              <div>
                <div className="text-[15px] uppercase font-bold text-primary mb-2">定位</div>
                <div className="h-6" />
              </div>
              <div>
                <div className="text-[15px] uppercase font-bold text-primary mb-2">优势</div>
                <div className="space-y-2">
                  <div className="h-4" />
                  <div className="h-4" />
                </div>
              </div>
              <div>
                <div className="text-[15px] uppercase font-bold text-primary mb-2">劣势</div>
                <div className="space-y-2">
                  <div className="h-4" />
                  <div className="h-4" />
                </div>
              </div>
              <div>
                <div className="text-[15px] uppercase font-bold text-primary mb-2">AI 建议</div>
                <div className="h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-12 rounded-lg border border-outline-variant/10 bg-surface-container-low p-10">
        <div className="max-w-2xl space-y-4">
          <h3 className="font-headline text-xl font-bold uppercase tracking-wider text-primary">综合分析摘要</h3>
          {[0, 1, 2].map((i) => (
            <PlaceholderShimmer key={i} className="h-4 w-[90%]" />
          ))}
        </div>
        <div className="flex gap-4">
          <div className="min-w-[120px] rounded-lg bg-primary/10 p-4 text-center border border-primary/20">
            <PlaceholderShimmer className="mx-auto mb-2 h-3 w-20" />
            <PlaceholderShimmer className="mx-auto h-8 w-24" />
          </div>
          <div className="min-w-[120px] rounded-lg bg-primary/10 p-4 text-center border border-primary/20">
            <PlaceholderShimmer className="mx-auto mb-2 h-3 w-20" />
            <PlaceholderShimmer className="mx-auto h-8 w-24" />
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        {showOptimizeCta ? (
          <button
            type="button"
            disabled
            className="rounded-full bg-primary px-12 py-4 text-sm font-black uppercase tracking-widest text-on-primary shadow-[0_0_30px_rgba(212,255,94,0.3)] disabled:opacity-60"
          >
            产品优化
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Stage2Placeholder({ productOrdinalLabel }) {
  return (
    <div className="space-y-8 opacity-90">
      <div className="bg-surface-container-low rounded-lg p-10 border border-outline-variant/10 grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-2">
        {productOrdinalLabel ? (
          <div className="relative lg:col-span-2">
            <div className="absolute -top-2 left-0 text-xs font-bold text-on-surface-variant">
              {productOrdinalLabel}
            </div>
          </div>
        ) : null}
        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-primary">优化后的定位</label>
            <PlaceholderShimmer className="h-5 w-[80%]" />
            <PlaceholderShimmer className="h-5 w-[92%]" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-primary">目标人群</label>
            <PlaceholderShimmer className="h-5 w-[86%]" />
            <PlaceholderShimmer className="h-5 w-[88%]" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-primary">战略定价</label>
            <PlaceholderShimmer className="h-8 w-[70%]" />
            <PlaceholderShimmer className="h-4 w-[50%]" />
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-primary">卖点 (V2.0)</label>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <PlaceholderShimmer className="h-3 w-3 rounded-full" />
                  <PlaceholderShimmer className="h-3 w-[78%]" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container p-4 rounded-lg border border-outline-variant/5">
              <label className="text-[10px] uppercase font-bold text-on-surface-variant mb-2 block">社交媒体策略</label>
              <PlaceholderShimmer className="h-3 w-[90%]" />
              <PlaceholderShimmer className="h-3 w-[70%] mt-2" />
            </div>
            <div className="bg-surface-container p-4 rounded-lg border border-outline-variant/5">
              <label className="text-[10px] uppercase font-bold text-on-surface-variant mb-2 block">视觉重点</label>
              <PlaceholderShimmer className="h-3 w-[85%]" />
              <PlaceholderShimmer className="h-3 w-[75%] mt-2" />
            </div>
          </div>

          <div className="bg-error/5 p-4 rounded-lg border border-error/20">
            <label className="text-[10px] uppercase font-bold text-error mb-2 block">风险与解决方案</label>
            <PlaceholderShimmer className="h-3 w-[90%]" />
            <PlaceholderShimmer className="h-3 w-[74%] mt-2" />
          </div>
        </div>
      </div>

    </div>
  )
}

function Stage2OptimizedCard({ productOrdinalLabel, optimizationResult, originalPrice }) {
  const sellingPoints = Array.isArray(optimizationResult?.optimized_selling_points)
    ? optimizationResult.optimized_selling_points
    : []
  const mainRisks = Array.isArray(optimizationResult?.risk_control?.main_risks)
    ? optimizationResult.risk_control.main_risks
    : []
  const solutions = Array.isArray(optimizationResult?.risk_control?.solutions)
    ? optimizationResult.risk_control.solutions
    : []

  const formatYuan = (v) => {
    if (v == null) return ''
    const s = String(v).trim()
    if (!s) return ''
    if (s.includes('元')) return s
    return `${s}元`
  }

  const recommended = optimizationResult?.recommended_price_range || '—'
  const recommendedText = recommended === '—' ? '—' : formatYuan(recommended)
  const originalText = formatYuan(originalPrice)

  return (
    <div className="bg-surface-container-low rounded-lg p-10 border border-outline-variant/10 grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-2 relative">
      {productOrdinalLabel ? (
        <div className="absolute left-10 top-6 text-xs font-bold text-on-surface-variant">
          {productOrdinalLabel}
        </div>
      ) : null}

      <div className="space-y-8 pt-6">
        <div className="space-y-2">
          <label className="text-[20px] uppercase font-bold tracking-widest text-primary">
            优化后的定位
          </label>
          <p className="text-lg leading-relaxed text-on-surface">
            {optimizationResult?.optimized_positioning || '—'}
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-[20px] uppercase font-bold tracking-widest text-primary">
            目标人群
          </label>
          <p className="text-lg leading-relaxed text-on-surface">
            {optimizationResult?.optimized_target_audience || '—'}
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-[20px] uppercase font-bold tracking-widest text-primary">
            战略定价
          </label>
          <div className="flex items-baseline gap-2">
            <div className="font-headline text-5xl font-black tracking-tight text-on-surface">
              {recommendedText}
            </div>
            {originalText ? (
              <div className="text-sm font-bold text-on-surface-variant">
                （原价：{originalText}）
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-8 pt-6">
        <div className="space-y-2">
          <label className="text-[20px] uppercase font-bold tracking-widest text-primary">
            卖点 (V2.0)
          </label>
          {sellingPoints.length ? (
            <ul className="space-y-2 text-base leading-relaxed text-on-surface">
              {sellingPoints.slice(0, 6).map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/70 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-on-surface-variant">—</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container p-4 rounded-lg border border-outline-variant/5">
            <label className="text-[20px] uppercase font-bold text-primary mb-2 block">
              社交媒体策略
            </label>
            <p className="text-sm leading-relaxed text-on-surface">
              {optimizationResult?.content_strategy?.xhs_angle || '—'}
            </p>
          </div>
          <div className="bg-surface-container p-4 rounded-lg border border-outline-variant/5">
            <label className="text-[20px] uppercase font-bold text-primary mb-2 block">
              视觉重点
            </label>
            <p className="text-sm leading-relaxed text-on-surface">
              {optimizationResult?.content_strategy?.visual_focus || '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-error/5 p-6 rounded-lg border border-error/20">
        <label className="text-[20px] uppercase font-bold text-error mb-2 block">
          风险与解决方案
        </label>
        <div className="grid grid-cols-1 gap-6 text-sm leading-relaxed text-on-surface-variant lg:grid-cols-2">
          <div>
            <div className="font-bold text-error/90 mb-2">主要风险</div>
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
            <div className="font-bold text-primary mb-2">解决方案</div>
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
  )
}

function Stage3Placeholder() {
  return (
    <div className="space-y-8 opacity-90">
      <div className="flex items-end justify-between border-b border-outline-variant/10 pb-4">
        <h2 className="font-headline text-3xl font-light">
          第三阶段：<span className="font-bold text-primary">优化后增量分析</span> 模拟
        </h2>
        <div className="px-4 py-2 bg-primary/10 rounded text-primary text-xs font-bold uppercase">
          偏差值: +12.4% 平均得分提升
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 items-end">
        <div className="relative h-[540px] overflow-hidden rounded-lg border border-outline-variant/10 bg-surface-container-low p-6 space-y-6">
          <div className="absolute right-0 top-0 p-4 font-headline text-4xl font-black text-orange-500/20">02</div>
          <PlaceholderShimmer className="h-12 w-40" />
          <PlaceholderShimmer className="h-6 w-48" />
          <div className="space-y-2 text-sm text-on-surface-variant">
            {[0, 1, 2, 3].map((i) => (
              <PlaceholderShimmer key={i} className="h-3 w-[90%]" />
            ))}
          </div>
        </div>

        <div className="bg-surface-container-high rounded-lg p-8 space-y-6 border border-primary/20 shadow-2xl relative overflow-hidden h-[600px] scale-[1.02] z-10">
          <div className="absolute top-0 right-0 p-6 font-headline text-6xl font-black text-primary/10">01</div>
          <PlaceholderShimmer className="h-12 w-44" />
          <PlaceholderShimmer className="h-6 w-44" />
          <div className="space-y-2 text-base">
            {[0, 1, 2, 3].map((i) => (
              <PlaceholderShimmer key={i} className="h-4 w-[92%]" />
            ))}
          </div>
        </div>

        <div className="bg-surface-container-low rounded-lg p-6 space-y-6 border border-outline-variant/10 relative overflow-hidden h-[480px]">
          <div className="absolute top-0 right-0 p-4 font-headline text-3xl font-black text-error/20">03</div>
          <PlaceholderShimmer className="h-12 w-36" />
          <PlaceholderShimmer className="h-6 w-40" />
          <div className="space-y-2 text-sm text-on-surface-variant">
            {[0, 1, 2, 3].map((i) => (
              <PlaceholderShimmer key={i} className="h-3 w-[88%]" />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-lg p-10 border border-outline-variant/20 flex items-center justify-between gap-12">
        <div className="max-w-2xl space-y-4">
          <h3 className="font-headline font-bold text-xl uppercase tracking-wider text-primary">最终对比总结</h3>
          {[0, 1, 2].map((i) => (
            <PlaceholderShimmer key={i} className="h-4 w-[90%]" />
          ))}
        </div>
        <div className="flex gap-4">
          <div className="text-center p-4 bg-surface-container-high rounded-lg min-w-[120px]">
            <PlaceholderShimmer className="mx-auto mb-2 h-3 w-24" />
            <PlaceholderShimmer className="mx-auto h-8 w-28" />
          </div>
        </div>
      </div>
    </div>
  )
}

function toScore100(score10) {
  const n = Number(score10)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 10)))
}

function marketFitLabelFromScores(scores100) {
  const best = Math.max(...scores100, 0)
  if (best >= 90) return '极高'
  if (best >= 75) return '较高'
  if (best >= 60) return '中等'
  return '一般'
}

function alignedScore100ByOriginalIndex(analysisResult, inputProducts) {
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
    return toScore100(matched?.score)
  })
}

function Stage1AnalyzedView({
  analysisResult,
  inputProducts,
  deltaByOriginalIndex,
  activeProductIndexes = [0, 1, 2],
}) {
  const raw = analysisResult?.products || []

  // 后端返回的 products 顺序可能被排序（例如按分数），这里强制对齐到上传区 01/02/03 的输入顺序。
  const normalizeName = (s) => (s == null ? '' : String(s)).trim()
  const byName = new Map()
  for (const p of raw) {
    const key = normalizeName(p?.name)
    if (!key) continue
    if (!byName.has(key)) byName.set(key, p)
  }

  const rows = [0, 1, 2].map((originalIndex) => {
    const inputName = normalizeName(inputProducts?.[originalIndex]?.name)
    const matched =
      (inputName && byName.get(inputName)) || raw[originalIndex] || raw[0] || {}
    return {
      name: matched?.name,
      originalIndex,
      score10: matched?.score,
      score100: toScore100(matched?.score),
      positioning: matched?.positioning,
      strengths: matched?.strengths,
      weaknesses: matched?.weaknesses,
      suggestion: matched?.suggestion,
    }
  })

  const displayIndexes = (activeProductIndexes || []).length ? activeProductIndexes : [0, 1, 2]
  const displayRows = displayIndexes.map((idx) => rows[idx]).filter(Boolean)

  // 固定渲染顺序：始终与上传区 01/02/03 对齐（即 originalIndex 0/1/2）
  // 但 rank / 颜色 / 高度仍按分数排名决定：最高分的那张在它自己的位置变成“第一名”样式
  const ranksByOriginalIndex = (() => {
    const sorted = [...displayRows].sort((a, b) => b.score100 - a.score100)
    const out = {}
    sorted.forEach((r, i) => {
      out[r.originalIndex] = i + 1
    })
    return out
  })()

  const baseHeights = [600, 540, 480]
  const stepDelta = baseHeights[0] - baseHeights[1] // 60
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

  const avg100 =
    displayRows.length > 0
      ? displayRows.reduce((acc, r) => acc + r.score100, 0) / displayRows.length
      : 0

  const successRate = `${avg100.toFixed(1)}%`
  const fitLabel = marketFitLabelFromScores(displayRows.map((r) => r.score100))
  const singleProductSummary =
    displayRows.length === 1
      ? `当前为单产品分析模式，系统将聚焦该产品的定位、优势与优化方向。${
          displayRows[0]?.suggestion ? `AI建议：${displayRows[0].suggestion}` : ''
        }`
      : ''

  const contentRefs = useRef([])
  const [fixedHeights, setFixedHeights] = useState(null)

  useLayoutEffect(() => {
    if (displayRows.length === 0) return

    function measureAndSet() {
      // 以“固定位置（产品一/二/三）”为序测量需要的高度
      const neededByOriginal = [0, 0, 0].map((_, originalIdx) => {
        const el = contentRefs.current[originalIdx]
        if (!el) return 0
        // 直接测量整张卡容器的内容高度，避免只测正文导致底部溢出
        return Math.ceil(el.scrollHeight)
      })

      // 目标：三档等差高度，且每张都能容纳内容（不截断）
      // base >= need(rank=1), base-step >= need(rank=2), base-2step >= need(rank=3)
      const buffer = 12
      let nextBase = baseHeights[0]
      for (const originalIdx of displayIndexes) {
        const rank = ranksByOriginalIndex[originalIdx] || 3
        const need = neededByOriginal[originalIdx] || 0
        const impliedBase = need + stepDelta * (rank - 1) + buffer
        nextBase = Math.max(nextBase, impliedBase)
      }

      const nextByOriginal = [0, 0, 0].map((_, originalIdx) => {
        const rank = ranksByOriginalIndex[originalIdx] || 3
        return nextBase - stepDelta * (rank - 1)
      })
      setFixedHeights(nextByOriginal)
    }

    const raf = window.requestAnimationFrame(measureAndSet)
    window.addEventListener('resize', measureAndSet)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', measureAndSet)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displayRows.map((r) => `${r.name}:${r.score100}`).join('|'),
    displayIndexes.join('|'),
  ])

  return (
    <div className="space-y-8">
      <div
        className="grid grid-cols-1 gap-8 items-end"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, displayIndexes.length)}, minmax(0, 1fr))` }}
      >
        {displayIndexes.map((originalIdx) => {
          const row = rows[originalIdx]
          if (!row) return null
          const rankNum = ranksByOriginalIndex[originalIdx] || 3
          const meta = tones[rankNum - 1] || tones[2]
          const rank = String(rankNum).padStart(2, '0')
          const isTop = rankNum === 1
          return (
            <div
              key={`stage1-card-${originalIdx}`}
              className={[
                'relative rounded-lg border border-outline-variant/10 bg-surface-container-low',
                isTop ? 'p-8 shadow-2xl border-primary/20 scale-[1.02] z-10' : 'p-6',
              ].join(' ')}
              ref={(el) => {
                contentRefs.current[originalIdx] = el
              }}
              style={
                fixedHeights
                  ? { height: fixedHeights[originalIdx] }
                  : { minHeight: baseHeights[rankNum - 1] || 540 }
              }
            >
              <div
                className={`absolute right-0 top-0 p-6 font-headline font-black ${
                  isTop ? 'text-6xl' : 'text-4xl'
                } ${meta.rankColor}`}
              >
                {rank}
              </div>

              <div className="space-y-2">
                <div
                  className={`relative inline-block font-headline font-bold leading-none ${meta.color} ${
                    isTop ? 'text-6xl' : 'text-4xl'
                  }`}
                >
                  {row.score100}
                  <span
                    className={`ml-1 ${isTop ? 'text-2xl' : 'text-lg'} font-normal text-on-surface-variant`}
                  >
                    /100
                  </span>
                  {typeof deltaByOriginalIndex?.[row.originalIndex] === 'number' ? (
                    <span
                      className={[
                        'absolute',
                        isTop ? '-top-1 -right-8 text-[20px]' : '-top-1 -right-7 text-[12px]',
                        'font-headline font-black leading-none',
                        deltaByOriginalIndex[row.originalIndex] >= 0
                          ? 'text-primary'
                          : 'text-error',
                      ].join(' ')}
                    >
                      {deltaByOriginalIndex[row.originalIndex] >= 0 ? '+' : ''}
                      {deltaByOriginalIndex[row.originalIndex]}
                    </span>
                  ) : null}
                </div>
                <div className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold ${meta.badgeBg} ${meta.badgeText}`}>
                  {meta.tag}
                </div>
                <div className="text-xs font-bold text-on-surface-variant">
                  产品{['一', '二', '三'][row.originalIndex] || row.originalIndex + 1}
                </div>
              </div>

              <div className={`mt-6 space-y-4 ${isTop ? 'text-base' : 'text-sm'} font-body`}>
                <div>
                  <label
                    className={`mb-2 block text-[15px] font-bold uppercase ${meta.color}`}
                  >
                    定位
                  </label>
                  <p className="text-on-surface-variant">{row.positioning || '—'}</p>
                </div>
                <div>
                  <label
                    className={`mb-2 block text-[15px] font-bold uppercase ${meta.color}`}
                  >
                    优势
                  </label>
                  <p className="text-on-surface-variant">
                    {Array.isArray(row.strengths) ? row.strengths.join('，') : row.strengths || '—'}
                  </p>
                </div>
                <div>
                  <label
                    className={`mb-2 block text-[15px] font-bold uppercase ${meta.color}`}
                  >
                    劣势
                  </label>
                  <p className="text-on-surface-variant">
                    {Array.isArray(row.weaknesses) ? row.weaknesses.join('，') : row.weaknesses || '—'}
                  </p>
                </div>
                <div>
                  <label
                    className={`mb-2 block text-[15px] font-bold uppercase ${meta.color}`}
                  >
                    AI 建议
                  </label>
                  <p className={`${meta.color} font-medium`}>{row.suggestion || '—'}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-12 rounded-lg border border-outline-variant/10 bg-surface-container-low p-10">
        <div className="max-w-2xl space-y-4">
          <h3 className="font-headline text-xl font-bold uppercase tracking-wider text-primary">综合分析摘要</h3>
          <p className="leading-relaxed text-on-surface-variant">
            {singleProductSummary ||
              analysisResult?.comparison?.summary ||
              '分析摘要将在完成初始分析后自动生成。'}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="min-w-[120px] rounded-lg bg-primary/10 p-4 text-center border border-primary/20">
            <div className="mb-1 text-xs font-bold uppercase text-primary">预期成功率</div>
            <div className="font-headline text-2xl font-bold text-primary">{successRate}</div>
          </div>
          <div className="min-w-[120px] rounded-lg bg-primary/10 p-4 text-center border border-primary/20">
            <div className="mb-1 text-xs font-bold uppercase text-primary">市场契合度</div>
            <div className="font-headline text-2xl font-bold text-primary">{fitLabel}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ index, product, bridge, onOpenHistoryPicker }) {
  const fileInputRef = useRef(null)
  const [imageDisplayUrl, setImageDisplayUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    const v = product?.image_url
    if (!v) {
      setImageDisplayUrl('')
      return
    }
    if (v.startsWith('http://') || v.startsWith('https://')) {
      setImageDisplayUrl(v)
      return
    }
    void resolveProductImageDisplayUrl(v).then((url) => {
      if (!cancelled) setImageDisplayUrl(url || '')
    })
    return () => {
      cancelled = true
    }
  }, [product?.image_url])

  const hasImage = !!imageDisplayUrl
  return (
    <div className="flex h-full flex-col space-y-6 rounded-lg border border-outline-variant/10 bg-surface-container-low p-6">
      <div className="flex items-center justify-between">
        <span className="ml-[1em] font-label text-[1rem] font-semibold leading-none text-primary">
          {index === 0 ? '产品一' : index === 1 ? '产品二' : '产品三'}
        </span>
        <button
          type="button"
          onClick={() => onOpenHistoryPicker?.(index)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-highest text-on-surface-variant transition hover:text-on-surface hover:border-primary/30"
          aria-label="从历史选择产品"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-outline-variant/30 bg-surface-container-highest transition-colors hover:border-primary/50"
        style={{ aspectRatio: '3 / 4' }}
      >
        {hasImage ? (
          <>
            <img
              src={imageDisplayUrl}
              alt={`产品${index + 1}`}
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
            <div className="relative z-10 text-center">
              <span className="material-symbols-outlined text-4xl text-primary">check_circle</span>
              <p className="mt-1 text-[10px] font-label uppercase tracking-wide text-on-surface-variant">
                已上传素材
              </p>
            </div>
          </>
        ) : (
          <div className="text-center relative z-10">
            <span className="material-symbols-outlined mb-2 text-4xl text-outline-variant group-hover:text-primary">
              cloud_upload
            </span>
            <p className="text-[10px] font-label uppercase text-on-surface-variant">
              拖拽高清素材
            </p>
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) bridge.handleImageSelect(index, file)
          e.target.value = ''
        }}
      />

      <div className="grid flex-1 grid-cols-2 gap-4">
        {FIELD_CONFIG.map((field) => (
          <div key={field.key} className={`space-y-1 ${field.full ? 'col-span-2' : ''}`}>
            <label className="text-[10px] font-bold uppercase text-on-surface-variant">
              {field.label}
            </label>
            {field.key === 'selling_points' || field.key === 'notes' ? (
              <textarea
                rows={4}
                className={[
                  'w-full resize-none rounded-md border border-outline-variant/20 bg-white/5 px-3 py-2',
                  'text-sm text-on-surface outline-none transition-all',
                  'leading-6',
                  'shadow-[inset_0_1px_8px_rgba(0,0,0,0.35)]',
                  'focus:border-primary/60 focus:bg-white/7 focus:shadow-[inset_0_1px_10px_rgba(0,0,0,0.45)]',
                ].join(' ')}
                placeholder={field.placeholder}
                value={product?.[field.key] || ''}
                onChange={(e) => bridge.updateProduct(index, field.key, e.target.value)}
              />
            ) : (
              <input
                className={[
                  'w-full rounded-md border border-outline-variant/20 bg-white/5 px-3 py-2',
                  'text-sm text-on-surface outline-none transition-all',
                  'shadow-[inset_0_1px_8px_rgba(0,0,0,0.35)]',
                  'focus:border-primary/60 focus:bg-white/7 focus:shadow-[inset_0_1px_10px_rgba(0,0,0,0.45)]',
                ].join(' ')}
                placeholder={field.placeholder}
                value={product?.[field.key] || ''}
                onChange={(e) => bridge.updateProduct(index, field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-highest py-3 text-xs font-bold text-primary transition-all hover:bg-surface-bright"
        onClick={() => bridge.handleAiFillFromImage(index)}
        disabled={bridge.isAiFillLoading?.(index)}
      >
        <span className="material-symbols-outlined text-sm">scan</span>
        {bridge.isAiFillLoading?.(index) ? '识别中...' : 'AI智能填表'}
      </button>
    </div>
  )
}

export default function StitchProductLabPanel({
  bridge,
  reanalysisResult,
  labVersions,
  pipelineRunning,
  optimizingAll,
  reanalyzingOptimized,
  optimizeProgress,
  analyzeProgress,
  labHistoryCatalog,
  onRemoveLabHistoryItem,
  onAnalyze,
  onOptimizeAll,
  onReanalyzeOptimized,
  onSwitchWorkspace,
  activeWorkspace = 'productLab',
  canAffordAnalyze = true,
  canAffordOptimize = true,
  estimatedAnalyzePoints = 0,
  estimatedOptimizePoints = 0,
}) {
  const hasAnalysis = !!bridge.analysisResult?.products?.length
  const hasReanalysis = !!reanalysisResult

  const activeProductIndexes =
    Array.isArray(bridge.analyzableProductIndexes) && bridge.analyzableProductIndexes.length
      ? bridge.analyzableProductIndexes
      : [0, 1, 2]

  const hasOptimizedVersions = (labVersions || []).some((v) => v.versionType === 'optimized')
  const [stage2ActiveIndex, setStage2ActiveIndex] = useState(activeProductIndexes[0] ?? 0)
  const [historyPicker, setHistoryPicker] = useState({ open: false, targetIndex: 0 })
  const [showMarketModeHint, setShowMarketModeHint] = useState(false)
  const [marketModeHintKey, setMarketModeHintKey] = useState(0)

  useEffect(() => {
    if (!activeProductIndexes.includes(stage2ActiveIndex)) {
      setStage2ActiveIndex(activeProductIndexes[0] ?? 0)
    }
  }, [activeProductIndexes, stage2ActiveIndex])

  useEffect(() => {
    if (!showMarketModeHint) return
    const timer = window.setTimeout(() => {
      setShowMarketModeHint(false)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [showMarketModeHint, marketModeHintKey])

  const stage2OptimizedByIndex = [0, 1, 2].map((i) => {
    const productId = `product-${i + 1}`
    const candidates = (labVersions || []).filter(
      (v) => v.versionType === 'optimized' && v.productId === productId,
    )
    return candidates.length ? candidates[candidates.length - 1] : null
  })
  const hasOptimization = stage2OptimizedByIndex.some(Boolean)
  const stage2ActiveOptimizationResult = stage2OptimizedByIndex[stage2ActiveIndex]?.optimizationResult || null

  const stage3OptimizedInputProducts = [0, 1, 2].map((i) => {
    const v = stage2OptimizedByIndex[i]
    return v?.snapshotData || bridge.products?.[i] || {}
  })

  const stage3DeltaByOriginalIndex = (() => {
    if (!bridge.analysisResult?.products?.length) return null
    if (!reanalysisResult?.products?.length) return null
    const before = alignedScore100ByOriginalIndex(bridge.analysisResult, bridge.products)
    const after = alignedScore100ByOriginalIndex(reanalysisResult, stage3OptimizedInputProducts)
    return [0, 1, 2].map((i) => after[i] - before[i])
  })()

  return (
    <div className="space-y-20">
      <div className="mb-10 flex justify-center">
        <div className="flex gap-2 rounded-full border border-outline-variant/20 bg-zinc-900/40 p-1.5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => onSwitchWorkspace?.('productLab')}
            className={`rounded-full px-8 py-2.5 text-sm font-headline font-bold transition-all ${
              activeWorkspace === 'productLab'
                ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(211,254,93,0.3)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            产品实验室
          </button>
          <button
            type="button"
            aria-disabled="true"
            onClick={() => {
              setMarketModeHintKey((k) => k + 1)
              setShowMarketModeHint(true)
            }}
            title="市场模拟即将推出"
            className="rounded-full px-8 py-2.5 text-sm font-headline font-bold text-on-surface-variant/55 transition-colors hover:text-on-surface-variant"
          >
            市场模拟
          </button>
        </div>
      </div>

      <section id="lab-prep" className="space-y-10">
        <div className="space-y-1">
          <h2 className="border-l-4 border-primary pl-4 font-headline text-3xl font-light">
            <span className="text-on-surface">实验准备：</span>
            <span className="font-bold text-primary">产品上传</span>
          </h2>
          <p className="pl-5 text-xs leading-relaxed text-on-surface-variant/80">
            分析将根据用户填写的产品信息为基础得出结果，请严格根据事实填写产品信息。
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          {bridge.products.map((product, index) => (
            <ProductCard
              key={index}
              index={index}
              product={product}
              bridge={bridge}
              onOpenHistoryPicker={(targetIndex) =>
                setHistoryPicker({ open: true, targetIndex: targetIndex ?? 0 })
              }
            />
          ))}
        </div>
      </section>

      {historyPicker.open ? (
        <HistoryProductPickerModal
          open={historyPicker.open}
          loading={false}
          records={Array.isArray(labHistoryCatalog) ? labHistoryCatalog : []}
          onClose={() => setHistoryPicker((prev) => ({ ...prev, open: false }))}
          onDelete={(item) => onRemoveLabHistoryItem?.(item?.id)}
          onSelect={(item) => {
            const input = item?.product || {}
            const idx = historyPicker.targetIndex || 0
            for (const f of FIELD_CONFIG) {
              bridge.updateProduct(idx, f.key, input?.[f.key] ?? '')
            }
            bridge.updateProduct(idx, 'image_url', input?.image_url || '')
            bridge.updateProduct(idx, 'uploading_image', false)
            setHistoryPicker((prev) => ({ ...prev, open: false }))
          }}
        />
      ) : null}

      <section id="lab-stage1" className="space-y-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end border-b border-outline-variant/20 pb-4">
          <h2 className="font-headline text-3xl font-light">
            第一阶段：<span className="font-bold text-primary">产品分析</span>
          </h2>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={bridge.analyzing || pipelineRunning || !canAffordAnalyze}
            className="rounded-full bg-primary px-12 py-4 text-sm font-black uppercase tracking-widest text-on-primary shadow-[0_0_30px_rgba(212,255,94,0.3)] transition-transform hover:scale-[1.02] disabled:opacity-50"
            title={
              canAffordAnalyze ? '' : `积分不足，预计分析需约 ${Math.max(0, Math.ceil(Number(estimatedAnalyzePoints) || 0))} 积分`
            }
          >
            {bridge.analyzing ? '分析中...' : '开始分析'}
          </button>
          <div className="text-right text-xs font-bold text-on-surface-variant">
            本次预计消耗 {Math.max(0, Math.ceil(Number(estimatedAnalyzePoints) || 0))} 积分
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Stage1PotentialLegend />
          {bridge.analyzing && analyzeProgress?.total ? (
            <div className="min-w-[260px] max-w-[380px] flex-1">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span className="truncate">{analyzeProgress.label || '分析中...'}</span>
                <span>
                  {Math.min(100, Math.round((analyzeProgress.done / analyzeProgress.total) * 100))}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (analyzeProgress.done / analyzeProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
        {!hasAnalysis ? (
          <Stage1Placeholder showOptimizeCta={false} />
        ) : (
          <>
          <Stage1AnalyzedView
            analysisResult={bridge.analysisResult}
            inputProducts={bridge.products}
            activeProductIndexes={bridge.analyzableProductIndexes}
          />
          </>
        )}
      </section>

      <section id="lab-stage2" className="space-y-8">
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end border-b border-outline-variant/20 pb-4">
            <h2 className="font-headline text-3xl font-light">
              第二阶段：<span className="font-bold text-primary">产品优化</span>{' '}
              <span className="text-[0.75em]">深度策略</span>
            </h2>
            <button
              type="button"
              onClick={onOptimizeAll}
              disabled={
                bridge.analyzing ||
                pipelineRunning ||
                optimizingAll ||
                !hasAnalysis ||
                !canAffordOptimize
              }
              className="rounded-full bg-primary px-12 py-4 text-sm font-black uppercase tracking-widest text-on-primary shadow-[0_0_30px_rgba(212,255,94,0.3)] transition-transform hover:scale-[1.02] disabled:opacity-60"
              title={
                canAffordOptimize ? '' : `积分不足，预计优化需约 ${Math.max(0, Math.ceil(Number(estimatedOptimizePoints) || 0))} 积分`
              }
            >
              {optimizingAll ? '优化中...' : '产品优化'}
            </button>
            <div className="text-right text-xs font-bold text-on-surface-variant">
              本次预计消耗 {Math.max(0, Math.ceil(Number(estimatedOptimizePoints) || 0))} 积分
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-fit rounded-full border border-outline-variant/10 bg-surface-container-high p-1">
              <div
                aria-hidden="true"
                className="absolute left-1 top-1 h-10 w-10 rounded-full bg-primary shadow-[0_0_18px_rgba(211,254,93,0.35)] transition-transform duration-500"
                style={{
                  transform: `translateX(${
                    Math.max(0, activeProductIndexes.indexOf(stage2ActiveIndex)) * 40
                  }px)`,
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
              <div className="relative flex">
                {activeProductIndexes.map((idx, visibleOrder) => {
                  const active = stage2ActiveIndex === idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStage2ActiveIndex(idx)}
                      className={[
                        'h-10 w-10 rounded-full font-bold transition-colors',
                        active ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface',
                      ].join(' ')}
                      aria-pressed={active}
                    >
                      {visibleOrder + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            {optimizingAll && optimizeProgress?.total ? (
              <div className="min-w-[260px] max-w-[380px] flex-1">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-on-surface-variant">
                  <span className="truncate">{optimizeProgress.label || '优化中...'}</span>
                  <span>
                    {Math.min(
                      100,
                      Math.round((optimizeProgress.done / optimizeProgress.total) * 100),
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (optimizeProgress.done / optimizeProgress.total) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {!hasOptimization || !stage2ActiveOptimizationResult ? (
          <Stage2Placeholder
            productOrdinalLabel={`产品${['一', '二', '三'][stage2ActiveIndex] || stage2ActiveIndex + 1}`}
          />
        ) : (
          <>
            <Stage2OptimizedCard
              productOrdinalLabel={`产品${['一', '二', '三'][stage2ActiveIndex] || stage2ActiveIndex + 1}`}
              optimizationResult={stage2ActiveOptimizationResult}
              originalPrice={bridge.products?.[stage2ActiveIndex]?.price ?? ''}
            />
          </>
        )}
      </section>

      {/* 第三阶段与底部建议/迭代轨迹区块已移除（按最新需求） */}
      {showMarketModeHint ? (
        <div key={marketModeHintKey} className="market-mode-coming-hint" role="status" aria-live="polite">
          超现实市场模拟功能即将推出，敬请期待！
        </div>
      ) : null}
    </div>
  )
}
