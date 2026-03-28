import { useEffect, useState } from 'react'
import { resolveProductImageDisplayUrl } from '../../utils/productImageUrl'
import { formatDate } from '../../utils/formatDate'
import { fetchProductCatalogDetail } from '../../services/productDatabase'

function TextBlock({ label, children }) {
  if (children == null || children === '') return null
  return (
    <div className="product-detail-panel__block">
      <h3 className="product-detail-panel__h3">{label}</h3>
      <div className="product-detail-panel__prose">{children}</div>
    </div>
  )
}

function formatOptimizationRecord(row) {
  if (!row) return null
  const r = row.optimization_result || {}
  const lines = []
  const push = (k, v) => {
    if (v == null || v === '') return
    if (Array.isArray(v)) {
      if (v.length) lines.push(`${k}：${v.join('；')}`)
      return
    }
    lines.push(`${k}：${String(v)}`)
  }
  push('优化定位', r.optimized_positioning || row.optimized_positioning)
  push('目标人群', r.optimized_target_audience || row.optimized_target_audience)
  if (Array.isArray(r.optimized_selling_points) && r.optimized_selling_points.length) {
    push('卖点', r.optimized_selling_points.join('；'))
  }
  push('建议价位', r.recommended_price_range || row.recommended_price_range)
  push('总结', r.final_verdict || row.final_verdict)
  if (!lines.length && row.optimization_result && typeof row.optimization_result === 'object') {
    try {
      return JSON.stringify(row.optimization_result, null, 2)
    } catch {
      return String(row.optimization_result)
    }
  }
  return lines.length ? lines.join('\n\n') : null
}

export default function ProductDetailModal({ product, userId, focusOptimization, onClose }) {
  const [imgSrc, setImgSrc] = useState('')
  const [loading, setLoading] = useState(false)
  const [bundle, setBundle] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!product?.image_url) {
      setImgSrc('')
      return
    }
    let cancel = false
    const v = product.image_url
    if (v.startsWith('http://') || v.startsWith('https://')) {
      setImgSrc(v)
      return
    }
    void resolveProductImageDisplayUrl(v).then((url) => {
      if (!cancel) setImgSrc(url || '')
    })
    return () => {
      cancel = true
    }
  }, [product])

  useEffect(() => {
    if (!product?.id || !userId) {
      setBundle(null)
      setLoadError('')
      return
    }
    let cancel = false
    setLoading(true)
    setLoadError('')
    fetchProductCatalogDetail(userId, product.id)
      .then((data) => {
        if (!cancel) setBundle(data)
      })
      .catch((err) => {
        if (!cancel) setLoadError(err?.message || '加载失败')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [product?.id, userId])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!product) return null

  const analysis = bundle?.analysis
  const optimizations = bundle?.optimizations || []
  const primaryOptimization = focusOptimization ?? optimizations[0] ?? null

  const analysisBody = !product.id ? (
    <p>未关联数据库产品，无法读取分析报告。</p>
  ) : loading && !bundle ? (
    <p>加载中…</p>
  ) : analysis ? (
    <>
      {analysis.ai_score != null ? (
        <p>
          <strong>评分：</strong>
          {analysis.ai_score}
        </p>
      ) : null}
      {analysis.recommendation ? (
        <p>
          <strong>建议：</strong>
          {analysis.recommendation}
        </p>
      ) : null}
      {analysis.strengths ? (
        <p>
          <strong>优势：</strong>
          {analysis.strengths}
        </p>
      ) : null}
      {analysis.weaknesses ? (
        <p>
          <strong>不足：</strong>
          {analysis.weaknesses}
        </p>
      ) : null}
      {!analysis.recommendation && !analysis.strengths && !analysis.weaknesses && analysis.ai_score == null ? (
        <p>暂无结构化分析字段</p>
      ) : null}
    </>
  ) : (
    <p>暂无分析报告</p>
  )

  const optText = formatOptimizationRecord(primaryOptimization)

  return (
    <div className="product-detail-overlay" role="dialog" aria-modal="true">
      <button type="button" className="product-detail-backdrop" aria-label="关闭" onClick={onClose} />
      <div className="product-detail-panel">
        <button type="button" className="product-detail-panel__close" aria-label="关闭" onClick={onClose}>
          ×
        </button>
        <h2>{product.name || '未命名产品'}</h2>
        <div className="product-detail-panel__img-wrap" aria-hidden={!imgSrc}>
          {imgSrc ? <img className="product-detail-panel__img" src={imgSrc} alt="" /> : null}
        </div>

        <div className="product-detail-panel__section">
          <h3 className="product-detail-panel__h3">基本信息</h3>
          <dl>
            <div>
              <dt>价格</dt>
              <dd>{product.price != null && product.price !== '' ? String(product.price) : '—'}</dd>
            </div>
            <div>
              <dt>材质</dt>
              <dd>{product.material || '—'}</dd>
            </div>
            <div>
              <dt>风格</dt>
              <dd>{product.style || '—'}</dd>
            </div>
            <div>
              <dt>目标人群</dt>
              <dd>{product.target_audience || '—'}</dd>
            </div>
            <div>
              <dt>卖点</dt>
              <dd>{product.selling_points || '—'}</dd>
            </div>
            <div>
              <dt>录入时间</dt>
              <dd>{product.created_at ? formatDate(product.created_at) : '—'}</dd>
            </div>
          </dl>
        </div>

        {loadError ? <p className="product-detail-panel__err">{loadError}</p> : null}

        <TextBlock label="分析报告">{analysisBody}</TextBlock>

        <TextBlock label="优化方案">
          {primaryOptimization ? (
            optText || <p>暂无优化方案正文</p>
          ) : product.id ? (
            loading && !bundle ? (
              <p>加载中…</p>
            ) : (
              <p>暂无优化方案</p>
            )
          ) : (
            <p>当前记录未入库，无法自动匹配优化方案。</p>
          )}
        </TextBlock>
      </div>
    </div>
  )
}
