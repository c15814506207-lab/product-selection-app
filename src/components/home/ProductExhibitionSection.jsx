import { useEffect, useMemo, useState } from 'react'
import { fetchUserProductsForGallery } from '../../services/productGallery'
import { resolveProductImageDisplayUrl } from '../../utils/productImageUrl'
import ProductDetailModal from './ProductDetailModal'

function shortDate(value) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

function ExhibitionThumb({ product, onSelect }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!product.image_url) {
      setSrc('')
      return
    }
    let cancel = false
    const v = product.image_url
    if (v.startsWith('http://') || v.startsWith('https://')) {
      setSrc(v)
      return
    }
    void resolveProductImageDisplayUrl(v).then((url) => {
      if (!cancel) setSrc(url || '')
    })
    return () => {
      cancel = true
    }
  }, [product.image_url])

  return (
    <button type="button" className="home-exhibition__card" onClick={() => onSelect(product)}>
      <div className="home-exhibition__thumb-wrap home-exhibition__thumb-wrap--wide">
        {src ? (
          <img className="home-exhibition__thumb" src={src} alt="" />
        ) : (
          <span className="home-exhibition__thumb-placeholder">暂无预览图</span>
        )}
        <span className="home-exhibition__badge">
          {(product.style || product.material || '产品').toUpperCase()}
        </span>
      </div>
      <div className="home-exhibition__card-body">
        <div className="home-exhibition__card-name">{product.name || '未命名产品'}</div>
        <div className="home-exhibition__card-desc">
          {product.selling_points || product.target_audience || '可点击查看详细信息'}
        </div>
        <div className="home-exhibition__card-foot">
          <span>{shortDate(product.created_at)}</span>
          <span className="home-exhibition__arrow">→</span>
        </div>
      </div>
    </button>
  )
}

export default function ProductExhibitionSection({
  userId,
  favoriteProductIds = [],
  favoritesReady = true,
  sectionId = 'gallery-section',
  firstRowSentinelRef,
  onFirstRowSentinelMount,
  exhibitionTitleRef,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const favoriteSet = useMemo(
    () => new Set((favoriteProductIds || []).map((x) => String(x))),
    [favoriteProductIds],
  )

  const visibleItems = useMemo(() => {
    if (!favoritesReady) return []
    return (items || []).filter((p) => p && favoriteSet.has(String(p.id)))
  }, [items, favoriteSet, favoritesReady])

  useEffect(() => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    let cancel = false
    setLoading(true)
    setError('')
    void fetchUserProductsForGallery(userId)
      .then((rows) => {
        if (!cancel) setItems(rows)
      })
      .catch((err) => {
        if (!cancel) setError(err.message || '加载失败')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [userId])

  return (
    <section id={sectionId} className="home-exhibition" aria-labelledby="exhibition-heading">
      <h2
        id="exhibition-heading"
        ref={exhibitionTitleRef}
        className="home-exhibition__title"
      >
        产品展览馆
      </h2>
      <p className="home-exhibition__sub">
        展示您在产品目录中收藏的产品；点击卡片可查看基本信息、分析报告与优化方案。
      </p>

      {!userId && (
        <div className="home-exhibition__empty">请登录后查看展览馆</div>
      )}
      {userId && (!favoritesReady || loading) && <p className="home-exhibition__empty">加载中…</p>}
      {userId && favoritesReady && !loading && error && <p className="home-exhibition__empty">{error}</p>}
      {userId && favoritesReady && !loading && !error && visibleItems.length === 0 && (
        <div className="home-exhibition__empty">暂无收藏产品，请在「产品目录」中点击星标收藏</div>
      )}
      {userId && favoritesReady && !loading && !error && visibleItems.length > 0 && (
        <div className="home-exhibition__grid-wrap">
          {firstRowSentinelRef && (
            <div
              ref={(el) => {
                firstRowSentinelRef.current = el
                if (el) onFirstRowSentinelMount?.()
              }}
              className="home-exhibition__first-row-sentinel"
              aria-hidden
            />
          )}
          <div className="home-exhibition__grid">
            {visibleItems.map((p) => (
            <ExhibitionThumb key={p.id} product={p} onSelect={setSelected} />
            ))}
          </div>
        </div>
      )}

      {selected && (
        <ProductDetailModal
          userId={userId}
          product={selected}
          focusOptimization={null}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
