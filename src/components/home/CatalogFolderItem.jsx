import { useEffect, useMemo, useState } from 'react'
import { resolveProductImageDisplayUrl } from '../../utils/productImageUrl'

export default function CatalogFolderItem({
  itemId,
  product,
  editMode,
  selected,
  onToggleSelect,
  onClickCard,
  onOpenDetail,
  showQuickActions,
  isFavorite,
  onFavoriteClick,
  onTrashClick,
  badgeText,
  badgeClass,
}) {
  const [thumbUrl, setThumbUrl] = useState('')
  const createdText = useMemo(() => {
    const raw = product?.createdAt || product?.created_at || product?.created || null
    if (!raw) return ''
    const d = raw instanceof Date ? raw : new Date(raw)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${y}.${m}.${day} ${hh}:${mm}`
  }, [product?.createdAt, product?.created_at, product?.created])

  useEffect(() => {
    if (!product?.image_url) {
      setThumbUrl('')
      return
    }
    let cancelled = false
    const v = product.image_url
    if (v.startsWith('http://') || v.startsWith('https://')) {
      setThumbUrl(v)
      return
    }
    resolveProductImageDisplayUrl(v).then((url) => {
      if (!cancelled) setThumbUrl(url || '')
    })
    return () => {
      cancelled = true
    }
  }, [product?.image_url])

  function handleCardActivate(e) {
    if (editMode) onClickCard?.(e)
    else onOpenDetail?.()
  }

  return (
    <div
      className={`home-catalog-modal__folder${selected ? ' home-catalog-modal__folder--selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleCardActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardActivate(e)
        }
      }}
    >
      {badgeText ? <div className={badgeClass}>{badgeText}</div> : null}
      {editMode ? (
        <button
          type="button"
          className={`home-catalog-modal__folder-check${selected ? ' home-catalog-modal__folder-check--on' : ''}`}
          aria-label={selected ? '取消选择' : '选择'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect?.(itemId, { shiftKey: e.shiftKey })
          }}
        >
          <span aria-hidden="true">✓</span>
        </button>
      ) : null}
      <div className="home-catalog-modal__folder-icon">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" />
        ) : (
          <span className="home-catalog-modal__folder-placeholder">📁</span>
        )}
      </div>
      <div className="home-catalog-modal__folder-meta">
        <span className="home-catalog-modal__folder-name">{product?.name || '未命名'}</span>
        {createdText ? (
          <span className="home-catalog-modal__folder-time">{createdText}</span>
        ) : null}
      </div>
      {showQuickActions ? (
        <div
          className="home-catalog-modal__folder-qt"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="home-catalog-modal__folder-qt-btn"
            aria-label={isFavorite ? '取消收藏' : '收藏'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onFavoriteClick?.()
            }}
          >
            <span
              aria-hidden
              className={`material-symbols-outlined home-catalog-modal__folder-qt-ico${isFavorite ? ' home-catalog-modal__folder-qt-ico--on' : ''}`}
            >
              star
            </span>
          </button>
          <button
            type="button"
            className="home-catalog-modal__folder-qt-btn"
            aria-label="移至垃圾桶"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTrashClick?.()
            }}
          >
            <span aria-hidden className="material-symbols-outlined home-catalog-modal__folder-qt-ico">
              delete
            </span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
