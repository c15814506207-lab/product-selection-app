import { useEffect, useMemo, useRef, useState } from 'react'
import {
  WORKSHOP_EXPORT_PAGE_HEIGHT,
  WORKSHOP_EXPORT_PAGE_WIDTH,
} from '../report/WorkshopReportLayouts.jsx'

const ZOOM_MIN = 1
const ZOOM_MAX = 5
const ZOOM_STEP = 0.18

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function PreviewImageFrame({ url, hasPages, onPrevPage, onNextPage }) {
  const frameRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  })

  useEffect(() => {
    // 切页后重置缩放和平移，避免沿用上页视图偏移。
    setScale(1)
    setTranslate({ x: 0, y: 0 })
    setDragging(false)
    dragStateRef.current = {
      active: false,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
      moved: false,
    }
  }, [url])

  useEffect(() => {
    function onMove(e) {
      const st = dragStateRef.current
      if (!st.active) return
      const dx = e.clientX - st.startX
      const dy = e.clientY - st.startY
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) st.moved = true
      setTranslate({ x: st.originX + dx, y: st.originY + dy })
    }

    function onUp() {
      if (!dragStateRef.current.active) return
      dragStateRef.current.active = false
      setDragging(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const imageTransform = useMemo(
    () => `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
    [translate.x, translate.y, scale],
  )

  function handleWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setScale((s) => clamp(Number((s + delta).toFixed(3)), ZOOM_MIN, ZOOM_MAX))
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: translate.x,
      originY: translate.y,
      moved: false,
    }
    setDragging(true)
  }

  function handleClick(e) {
    if (!hasPages) return
    // 拖拽结束后抬手会触发 click，这里直接忽略。
    if (dragStateRef.current.moved) return
    const el = frameRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const localX = e.clientX - rect.left
    if (localX < rect.width / 2) onPrevPage?.()
    else onNextPage?.()
  }

  if (!url) return null
  return (
    <div
      ref={frameRef}
      className="home-report-preview__frame"
      style={{
        aspectRatio: `${WORKSHOP_EXPORT_PAGE_WIDTH} / ${WORKSHOP_EXPORT_PAGE_HEIGHT}`,
        width: `min(96vw, ${Math.round(WORKSHOP_EXPORT_PAGE_WIDTH * 1.5)}px)`,
        maxHeight: 'min(calc(94vh - 160px), 90vh)',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <img
        src={url}
        alt=""
        className={`home-report-preview__frame-img${dragging ? ' home-report-preview__frame-img--dragging' : ''}`}
        style={{ transform: imageTransform }}
        draggable={false}
      />
    </div>
  )
}

/**
 * 支持单张 url 或多页 pages: [{ title, url }]
 */
export default function ReportImagePreviewContent({ preview }) {
  const [pageIndex, setPageIndex] = useState(0)
  const pages = preview?.pages
  const hasPages = Array.isArray(pages) && pages.length > 0

  useEffect(() => {
    setPageIndex(0)
  }, [preview])

  if (!preview) return null

  if (hasPages) {
    const cur = pages[pageIndex]
    const n = pages.length
    const goPrev = () => setPageIndex((i) => Math.max(0, i - 1))
    const goNext = () => setPageIndex((i) => Math.min(n - 1, i + 1))
    return (
      <>
        {cur?.title ? <div className="home-report-preview__sub">{cur.title}</div> : null}
        <div className="home-report-preview__pager">
          <button
            type="button"
            className="home-report-preview__pager-btn"
            disabled={pageIndex <= 0}
            onClick={goPrev}
          >
            上一页
          </button>
          <span className="home-report-preview__pager-pos">
            {pageIndex + 1} / {n}
          </span>
          <button
            type="button"
            className="home-report-preview__pager-btn"
            disabled={pageIndex >= n - 1}
            onClick={goNext}
          >
            下一页
          </button>
        </div>
        {cur?.url ? (
          <PreviewImageFrame
            url={cur.url}
            hasPages
            onPrevPage={goPrev}
            onNextPage={goNext}
          />
        ) : null}
      </>
    )
  }

  return preview.url ? <PreviewImageFrame url={preview.url} hasPages={false} /> : null
}
