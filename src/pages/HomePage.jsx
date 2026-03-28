import { useEffect, useMemo, useState, useRef } from 'react'
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ProductExhibitionSection from '../components/home/ProductExhibitionSection'
import SettingsPanel from '../components/home/SettingsPanel'
import MouseGlowWrap from '../components/home/MouseGlowWrap'
import FrostedGlowOverlay from '../components/home/FrostedGlowOverlay'
import {
  fetchAnalyzedProductIdsForUser,
  fetchMergedComparisonHistory,
  fetchOptimizationHistoryRows,
  schedulePurgeOptimizations,
  schedulePurgeProducts,
} from '../services/productDatabase'
import { fetchUserProductsForGallery } from '../services/productGallery'
import { resolveProductImageDisplayUrl } from '../utils/productImageUrl'
import { groupWorkshopRecordsIntoBatches } from '../utils/workshopReportBatches.js'
import ReportImagePreviewContent from '../components/workspace/ReportImagePreviewContent.jsx'
import CatalogFolderItem from '../components/home/CatalogFolderItem.jsx'
import ProductDetailModal from '../components/home/ProductDetailModal.jsx'
import '../styles/homePage.css'

const LEFT_TOP_ACTIONS = [
  { id: 'home', label: '首页', icon: '⌂', type: 'scroll-top' },
  { id: 'workshop', label: '工作坊', icon: 'handyman', type: 'toggle-workshop' },
  { id: 'catalog', label: '产品目录', icon: 'menu_book', type: 'open-catalog' },
  { id: 'gallery', label: '展览', icon: '▦', type: 'scroll-gallery' },
  { id: 'settings', label: '设置', icon: '⚙', type: 'open-settings' },
]

const LEFT_BOTTOM_ACTIONS = [
  { id: 'profile', label: '个人资料', icon: '◉', type: 'open-profile' },
]

const RIGHT_ACTIONS = [
  { id: 'report', label: '导出报告', icon: '⎙', type: 'open-print' },
]

function ReportFolderItem({ item, selected, badgeText, badgeClass, onToggle, onClickCard, onPreview }) {
  const [thumbUrl, setThumbUrl] = useState('')
  const clickTimerRef = useRef(null)
  useEffect(() => {
    const v = item?.image_url
    if (!v) {
      setThumbUrl('')
      return
    }
    let cancelled = false
    if (String(v).startsWith('data:')) {
      setThumbUrl(String(v))
      return () => {
        cancelled = true
      }
    }
    if (String(v).startsWith('http://') || String(v).startsWith('https://')) {
      setThumbUrl(String(v))
      return () => {
        cancelled = true
      }
    }
    resolveProductImageDisplayUrl(String(v)).then((url) => {
      if (!cancelled) setThumbUrl(url || '')
    })
    return () => {
      cancelled = true
    }
  }, [item?.image_url])

  function handleCardClick(e) {
    if (e.shiftKey) {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      onClickCard?.(e)
      return
    }
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current)
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null
      onClickCard?.(e)
    }, 240)
  }

  function handleCardDoubleClick(e) {
    e.preventDefault()
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    if (item?.type === 'workshop-batch' && item?.pages?.length) {
      onPreview?.()
    } else if (item?.type === 'generated-image' && item?.imageDataUrl) {
      onPreview?.()
    }
  }

  return (
    <button
      type="button"
      className={`home-catalog-modal__folder${selected ? ' home-catalog-modal__folder--selected' : ''}`}
      onClick={handleCardClick}
      onDoubleClick={handleCardDoubleClick}
    >
      {badgeText ? <div className={badgeClass}>{badgeText}</div> : null}
      <button
        type="button"
        className={`home-catalog-modal__folder-check${selected ? ' home-catalog-modal__folder-check--on' : ''}`}
        aria-label={selected ? '取消选择' : '选择'}
        onClick={onToggle}
      >
        <span aria-hidden="true">✓</span>
      </button>
      <div className="home-catalog-modal__folder-icon" aria-hidden>
        {thumbUrl ? (
          <img src={thumbUrl} alt="" />
        ) : (
          <span className="home-catalog-modal__folder-placeholder">
            {item?.type === 'workshop-batch' ? '📑' : item?.type === 'generated-image' ? '🖼️' : item?.type === 'analysis' ? '📊' : '📈'}
          </span>
        )}
      </div>
      <div className="home-catalog-modal__folder-meta">
        <div className="home-catalog-modal__folder-meta-main">
          <span className="home-catalog-modal__folder-name">{item?.title || '报告'}</span>
          {item?.type === 'workshop-batch' && item?.pageCount ? (
            <span className="home-catalog-modal__folder-extra">共 {item.pageCount} 页 · 双击翻页预览</span>
          ) : null}
        </div>
        <span className="home-catalog-modal__folder-time">
          {item?.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
        </span>
      </div>
    </button>
  )
}

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { openAuthModal } = useOutletContext()

  const [notice, setNotice] = useState('')
  const [ctaAnimating, setCtaAnimating] = useState(false)
  const [pageTransitioning, setPageTransitioning] = useState(false)
  const [showRecharge, setShowRecharge] = useState(false)
  const [showPrintPicker, setShowPrintPicker] = useState(false)
  const [reportImagePreview, setReportImagePreview] = useState(null)
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showProfileBubble, setShowProfileBubble] = useState(false)
  const [scrollPastHeroMid, setScrollPastHeroMid] = useState(false)
  const [scrollAnchorOpacity, setScrollAnchorOpacity] = useState(0.82)
  const [comparisonHistory, setComparisonHistory] = useState([])
  const [optimizationHistory, setOptimizationHistory] = useState([])
  const [catalogProducts, setCatalogProducts] = useState([])
  const [catalogOptimizations, setCatalogOptimizations] = useState([])
  const [catalogAnalyzedProductIds, setCatalogAnalyzedProductIds] = useState(() => new Set())
  const [loadingHomeData, setLoadingHomeData] = useState(false)
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [catalogLoadError, setCatalogLoadError] = useState('')
  const [modalOrigin, setModalOrigin] = useState({ x: 0, y: 0 })
  const [printView, setPrintView] = useState('reports') // 'reports' | 'trash'
  const [printSelection, setPrintSelection] = useState(() => ({}))
  const [printLastSelectedIndex, setPrintLastSelectedIndex] = useState(null)
  const [printTrashState, setPrintTrashState] = useState(() => ({
    trashed: [],
    deleted: [],
  }))
  const [printTrashHydrated, setPrintTrashHydrated] = useState(false)
  const [catalogView, setCatalogView] = useState('catalog') // 'catalog' | 'favorites' | 'trash'
  const [catalogEditMode, setCatalogEditMode] = useState(false)
  const [catalogSelection, setCatalogSelection] = useState(() => ({
    products: {},
    optimizations: {},
  }))
  const [catalogLastSelectedIndex, setCatalogLastSelectedIndex] = useState(() => ({
    products: null,
    optimizations: null,
  }))
  const [catalogTrashState, setCatalogTrashState] = useState(() => ({
    trashed: { products: [], optimizations: [] },
    deleted: { products: [], optimizations: [] },
  }))
  const [catalogTrashHydrated, setCatalogTrashHydrated] = useState(false)
  const [catalogFavorites, setCatalogFavorites] = useState(() => [])
  const [catalogFavoritesHydrated, setCatalogFavoritesHydrated] = useState(false)
  const [catalogDetailOpen, setCatalogDetailOpen] = useState(null)
  const [mousePos, setMousePos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  }))

  const gallerySentinelRef = useRef(null)
  const exhibitionTitleRef = useRef(null)
  const heroSectionRef = useRef(null)
  const startUseTimersRef = useRef({ t1: 0, t2: 0 })
  const [sentinelMounted, setSentinelMounted] = useState(false)

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || '用户'
  const userId = user?.id ?? null
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture

  const catalogStorageKey = useMemo(
    () => (userId ? `catalogTrash.v1.${userId}` : 'catalogTrash.v1.guest'),
    [userId],
  )
  const catalogFavoritesKey = useMemo(
    () => (userId ? `catalogFavorites.v1.${userId}` : 'catalogFavorites.v1.guest'),
    [userId],
  )

  useEffect(() => {
    setCatalogTrashHydrated(false)
    const empty = {
      trashed: { products: [], optimizations: [] },
      deleted: { products: [], optimizations: [] },
    }
    try {
      const raw = window.localStorage.getItem(catalogStorageKey)
      if (!raw) {
        setCatalogTrashState(empty)
        setCatalogTrashHydrated(true)
        return
      }
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') {
        setCatalogTrashState(empty)
        setCatalogTrashHydrated(true)
        return
      }
      const next = {
        trashed: {
          products: Array.isArray(parsed?.trashed?.products) ? parsed.trashed.products : [],
          optimizations: Array.isArray(parsed?.trashed?.optimizations) ? parsed.trashed.optimizations : [],
        },
        deleted: {
          products: Array.isArray(parsed?.deleted?.products) ? parsed.deleted.products : [],
          optimizations: Array.isArray(parsed?.deleted?.optimizations) ? parsed.deleted.optimizations : [],
        },
      }
      setCatalogTrashState(next)
    } catch {
      // ignore
    }
    setCatalogTrashHydrated(true)
  }, [catalogStorageKey])

  useEffect(() => {
    if (!catalogTrashHydrated) return
    try {
      window.localStorage.setItem(catalogStorageKey, JSON.stringify(catalogTrashState))
    } catch {
      // ignore quota
    }
  }, [catalogStorageKey, catalogTrashState, catalogTrashHydrated])

  useEffect(() => {
    setCatalogFavoritesHydrated(false)
    try {
      const raw = window.localStorage.getItem(catalogFavoritesKey)
      const parsed = raw ? JSON.parse(raw) : []
      setCatalogFavorites(Array.isArray(parsed) ? parsed.map((x) => String(x)) : [])
    } catch {
      setCatalogFavorites([])
    }
    setCatalogFavoritesHydrated(true)
  }, [catalogFavoritesKey])

  useEffect(() => {
    if (!catalogFavoritesHydrated) return
    try {
      window.localStorage.setItem(catalogFavoritesKey, JSON.stringify(catalogFavorites))
    } catch {
      // ignore quota
    }
  }, [catalogFavoritesKey, catalogFavorites, catalogFavoritesHydrated])

  const favoriteProductIdSet = useMemo(
    () => new Set((catalogFavorites || []).map((x) => String(x))),
    [catalogFavorites],
  )

  const trashedProductIdSet = useMemo(
    () => new Set((catalogTrashState?.trashed?.products || []).map((x) => String(x))),
    [catalogTrashState?.trashed?.products],
  )
  const trashedOptimizationIdSet = useMemo(
    () => new Set((catalogTrashState?.trashed?.optimizations || []).map((x) => String(x))),
    [catalogTrashState?.trashed?.optimizations],
  )
  const deletedProductIdSet = useMemo(
    () => new Set((catalogTrashState?.deleted?.products || []).map((x) => String(x))),
    [catalogTrashState?.deleted?.products],
  )
  const deletedOptimizationIdSet = useMemo(
    () => new Set((catalogTrashState?.deleted?.optimizations || []).map((x) => String(x))),
    [catalogTrashState?.deleted?.optimizations],
  )

  const productsInCatalog = useMemo(
    () =>
      (catalogProducts || []).filter(
        (p) =>
          p &&
          !trashedProductIdSet.has(String(p.id)) &&
          !deletedProductIdSet.has(String(p.id)),
      ),
    [catalogProducts, trashedProductIdSet, deletedProductIdSet],
  )
  const productsInFavorites = useMemo(
    () =>
      (catalogProducts || []).filter(
        (p) =>
          p &&
          favoriteProductIdSet.has(String(p.id)) &&
          !trashedProductIdSet.has(String(p.id)) &&
          !deletedProductIdSet.has(String(p.id)),
      ),
    [catalogProducts, favoriteProductIdSet, trashedProductIdSet, deletedProductIdSet],
  )
  const productsInTrash = useMemo(
    () =>
      (catalogProducts || []).filter(
        (p) =>
          p &&
          trashedProductIdSet.has(String(p.id)) &&
          !deletedProductIdSet.has(String(p.id)),
      ),
    [catalogProducts, trashedProductIdSet, deletedProductIdSet],
  )
  const productNamesWithActiveOptimization = useMemo(() => {
    const s = new Set()
    for (const o of catalogOptimizations || []) {
      if (!o?.product_name) continue
      if (trashedOptimizationIdSet.has(String(o.id))) continue
      if (deletedOptimizationIdSet.has(String(o.id))) continue
      s.add(o.product_name)
    }
    return s
  }, [catalogOptimizations, trashedOptimizationIdSet, deletedOptimizationIdSet])

  const catalogSelectedCount = useMemo(
    () => Object.keys(catalogSelection?.products || {}).length,
    [catalogSelection?.products],
  )

  function resetCatalogSelection() {
    setCatalogSelection({ products: {}, optimizations: {} })
    setCatalogLastSelectedIndex({ products: null, optimizations: null })
  }

  function toggleSelect(kind, id, opts = {}) {
    const sid = String(id)
    setCatalogSelection((prev) => {
      const next = { ...prev, [kind]: { ...(prev?.[kind] || {}) } }
      if (next[kind][sid]) delete next[kind][sid]
      else next[kind][sid] = true
      return next
    })
    if (typeof opts?.lastIndex === 'number') {
      setCatalogLastSelectedIndex((prev) => ({ ...prev, [kind]: opts.lastIndex }))
    }
  }

  function setSelectAll(kind, ids, on) {
    const sids = (ids || []).map((x) => String(x))
    setCatalogSelection((prev) => {
      const next = { ...prev, [kind]: { ...(prev?.[kind] || {}) } }
      if (!on) {
        sids.forEach((id) => {
          delete next[kind][id]
        })
        return next
      }
      sids.forEach((id) => {
        next[kind][id] = true
      })
      return next
    })
  }

  function selectRange(kind, ids, fromIndex, toIndex) {
    const lo = Math.min(fromIndex, toIndex)
    const hi = Math.max(fromIndex, toIndex)
    const slice = (ids || []).slice(lo, hi + 1).map((x) => String(x))
    setCatalogSelection((prev) => {
      const next = { ...prev, [kind]: { ...(prev?.[kind] || {}) } }
      slice.forEach((id) => {
        next[kind][id] = true
      })
      return next
    })
    setCatalogLastSelectedIndex((prev) => ({ ...prev, [kind]: toIndex }))
  }

  function batchMoveToTrash() {
    const productIds = Object.keys(catalogSelection.products || {})
    const optimizationIds = Object.keys(catalogSelection.optimizations || {})
    if (!productIds.length && !optimizationIds.length) return
    setCatalogTrashState((prev) => {
      const prevTrashedP = new Set(prev?.trashed?.products || [])
      const prevTrashedO = new Set(prev?.trashed?.optimizations || [])
      productIds.forEach((id) => prevTrashedP.add(String(id)))
      optimizationIds.forEach((id) => prevTrashedO.add(String(id)))
      return {
        ...prev,
        trashed: { products: Array.from(prevTrashedP), optimizations: Array.from(prevTrashedO) },
      }
    })
    resetCatalogSelection()
  }

  async function batchDeleteForever() {
    const productIds = Object.keys(catalogSelection.products || {})
    const optimizationIds = Object.keys(catalogSelection.optimizations || {})
    if (!productIds.length && !optimizationIds.length) return
    // 在“垃圾桶”页：后端保留 14 天后清理；前端立即隐藏
    if (catalogView === 'trash' && userId) {
      try {
        await Promise.all([
          schedulePurgeProducts(userId, productIds, 14),
          schedulePurgeOptimizations(userId, optimizationIds, 14),
        ])
      } catch {
        // 后端失败时不阻塞 UI（仍然本地隐藏）
      }
    }
    setCatalogTrashState((prev) => {
      const nextTrashedP = new Set(prev?.trashed?.products || [])
      const nextTrashedO = new Set(prev?.trashed?.optimizations || [])
      const nextDeletedP = new Set(prev?.deleted?.products || [])
      const nextDeletedO = new Set(prev?.deleted?.optimizations || [])
      productIds.forEach((id) => {
        const sid = String(id)
        nextTrashedP.delete(sid)
        nextDeletedP.add(sid)
      })
      optimizationIds.forEach((id) => {
        const sid = String(id)
        nextTrashedO.delete(sid)
        nextDeletedO.add(sid)
      })
      return {
        trashed: { products: Array.from(nextTrashedP), optimizations: Array.from(nextTrashedO) },
        deleted: { products: Array.from(nextDeletedP), optimizations: Array.from(nextDeletedO) },
      }
    })
    resetCatalogSelection()
  }

  function restoreSelectedCatalogItems() {
    const productIds = Object.keys(catalogSelection.products || {})
    const optimizationIds = Object.keys(catalogSelection.optimizations || {})
    if (!productIds.length && !optimizationIds.length) return
    setCatalogTrashState((prev) => {
      const nextTrashedP = new Set((prev?.trashed?.products || []).map((x) => String(x)))
      const nextTrashedO = new Set((prev?.trashed?.optimizations || []).map((x) => String(x)))
      productIds.forEach((id) => nextTrashedP.delete(String(id)))
      optimizationIds.forEach((id) => nextTrashedO.delete(String(id)))
      return {
        ...prev,
        trashed: { products: Array.from(nextTrashedP), optimizations: Array.from(nextTrashedO) },
      }
    })
    resetCatalogSelection()
  }

  function toggleCatalogFavoriteId(productId) {
    const sid = String(productId)
    setCatalogFavorites((prev) => {
      const s = new Set((prev || []).map(String))
      if (s.has(sid)) s.delete(sid)
      else s.add(sid)
      return Array.from(s)
    })
  }

  function moveCatalogProductToTrash(productId) {
    const sid = String(productId)
    setCatalogTrashState((prev) => {
      const t = new Set((prev?.trashed?.products || []).map(String))
      t.add(sid)
      return {
        ...prev,
        trashed: { ...prev.trashed, products: Array.from(t) },
      }
    })
    setCatalogFavorites((prev) => (prev || []).filter((x) => String(x) !== sid))
  }

  useEffect(() => {
    const hero = heroSectionRef.current
    if (!hero) return
    const handler = () => {
      const rect = hero.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      setScrollPastHeroMid(mid < 0)
    }
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      const titleEl = exhibitionTitleRef.current
      const sentinel = gallerySentinelRef.current
      const vh = window.innerHeight
      const baseOpacity = 0.82

      if (!titleEl || !sentinel) {
        setScrollAnchorOpacity(baseOpacity)
        return
      }

      const titleRect = titleEl.getBoundingClientRect()
      const sentinelRect = sentinel.getBoundingClientRect()

      if (titleRect.bottom > vh) {
        setScrollAnchorOpacity(baseOpacity)
        return
      }
      if (sentinelRect.top < vh - 120) {
        setScrollAnchorOpacity(0)
        return
      }
      const progress = Math.min(1, Math.max(0, (vh - 120 - sentinelRect.top) / 120))
      setScrollAnchorOpacity(baseOpacity * (1 - progress))
    }
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [sentinelMounted])

  useEffect(() => {
    // 支持从功能页跳回首页时自动打开对应面板/滚动位置
    const open = location?.state?.open
    if (!open) return
    if (open === 'catalog') {
      setShowCatalogModal(true)
      navigate('.', { replace: true, state: null })
      return
    }
    if (open === 'settings') {
      setShowSettingsModal(true)
      navigate('.', { replace: true, state: null })
      return
    }
    if (open === 'profile') {
      setShowProfileBubble(true)
      navigate('.', { replace: true, state: null })
      return
    }
    if (open === 'recharge') {
      setShowRecharge(true)
      navigate('.', { replace: true, state: null })
      return
    }
    if (open === 'gallery') {
      const el = document.getElementById('gallery-section')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
      navigate('.', { replace: true, state: null })
    }
  }, [location?.state])

  useEffect(() => {
    if (!userId) setSentinelMounted(false)
  }, [userId])

  useEffect(() => {
    if (!showCatalogModal || !userId) {
      if (!showCatalogModal) setLoadingCatalog(false)
      if (!userId) setCatalogLoadError('请先登录')
      return
    }
    let cancelled = false
    setLoadingCatalog(true)
    setCatalogLoadError('')
    Promise.all([
      fetchUserProductsForGallery(userId),
      fetchOptimizationHistoryRows(userId),
      fetchAnalyzedProductIdsForUser(userId),
    ])
      .then(([products, optimizations, analyzedSet]) => {
        if (cancelled) return
        setCatalogProducts(products || [])
        setCatalogOptimizations(optimizations || [])
        setCatalogAnalyzedProductIds(analyzedSet instanceof Set ? analyzedSet : new Set())
      })
      .catch((err) => {
        if (cancelled) return
        setCatalogProducts([])
        setCatalogOptimizations([])
        setCatalogAnalyzedProductIds(new Set())
        setCatalogLoadError(err?.message || '加载失败（可能是数据库权限或表结构未更新）')
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false)
      })
    return () => {
      cancelled = true
    }
  }, [showCatalogModal, userId])

  useEffect(() => {
    if (!userId) {
      setComparisonHistory([])
      setOptimizationHistory([])
      return
    }
    let cancelled = false
    setLoadingHomeData(true)
    Promise.all([fetchMergedComparisonHistory(userId), fetchOptimizationHistoryRows(userId)])
      .then(([analysisRows, optimizationRows]) => {
        if (cancelled) return
        setComparisonHistory(analysisRows || [])
        setOptimizationHistory(optimizationRows || [])
      })
      .catch(() => {
        if (!cancelled) {
          setComparisonHistory([])
          setOptimizationHistory([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHomeData(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const historyProjects = useMemo(() => {
    let raw = []
    try {
      const key = userId ? `generatedWorkshopReports.v1.${userId}` : 'generatedWorkshopReports.v1.guest'
      const ls = window.localStorage.getItem(key)
      const parsed = ls ? JSON.parse(ls) : []
      raw = Array.isArray(parsed) ? parsed : []
    } catch {
      raw = []
    }
    return groupWorkshopRecordsIntoBatches(raw)
  }, [userId, showPrintPicker])

  const reportStorageKey = useMemo(
    () => (userId ? `reportTrash.v1.${userId}` : 'reportTrash.v1.guest'),
    [userId],
  )

  useEffect(() => {
    setPrintTrashHydrated(false)
    try {
      const raw = window.localStorage.getItem(reportStorageKey)
      if (!raw) {
        setPrintTrashState({ trashed: [], deleted: [] })
        setPrintTrashHydrated(true)
        return
      }
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') {
        setPrintTrashState({ trashed: [], deleted: [] })
        setPrintTrashHydrated(true)
        return
      }
      setPrintTrashState({
        trashed: Array.isArray(parsed?.trashed) ? parsed.trashed : [],
        deleted: Array.isArray(parsed?.deleted) ? parsed.deleted : [],
      })
    } catch {
      // ignore
    }
    setPrintTrashHydrated(true)
  }, [reportStorageKey])

  useEffect(() => {
    if (!printTrashHydrated) return
    try {
      window.localStorage.setItem(reportStorageKey, JSON.stringify(printTrashState))
    } catch {
      // ignore
    }
  }, [reportStorageKey, printTrashState, printTrashHydrated])

  const trashedReportIdSet = useMemo(
    () => new Set((printTrashState?.trashed || []).map((x) => String(x))),
    [printTrashState?.trashed],
  )
  const deletedReportIdSet = useMemo(
    () => new Set((printTrashState?.deleted || []).map((x) => String(x))),
    [printTrashState?.deleted],
  )

  const reportsInList = useMemo(
    () =>
      (historyProjects || []).filter(
        (it) =>
          it &&
          !deletedReportIdSet.has(String(it.id)) &&
          (printView === 'trash'
            ? trashedReportIdSet.has(String(it.id))
            : !trashedReportIdSet.has(String(it.id))),
      ),
    [historyProjects, deletedReportIdSet, printView, trashedReportIdSet],
  )

  const printSelectedCount = useMemo(() => Object.keys(printSelection || {}).length, [printSelection])
  const printAllSelected = useMemo(() => {
    const total = reportsInList.length
    if (!total) return false
    return reportsInList.every((it) => !!printSelection?.[String(it.id)])
  }, [reportsInList, printSelection])
  const productListInView = useMemo(() => {
    if (catalogView === 'trash') return productsInTrash
    if (catalogView === 'favorites') return productsInFavorites
    return productsInCatalog
  }, [catalogView, productsInTrash, productsInFavorites, productsInCatalog])

  const catalogProductBuckets = useMemo(() => {
    const analyzedNotOpt = []
    const analyzedOpt = []
    const pending = []
    for (const p of productListInView) {
      if (!p) continue
      const hasA = catalogAnalyzedProductIds.has(String(p.id))
      const hasO = productNamesWithActiveOptimization.has(p.name)
      if (!hasA) pending.push(p)
      else if (hasO) analyzedOpt.push(p)
      else analyzedNotOpt.push(p)
    }
    return { analyzedNotOpt, analyzedOpt, pending }
  }, [productListInView, catalogAnalyzedProductIds, productNamesWithActiveOptimization])

  const catalogFlatProductOrder = useMemo(
    () => [...catalogProductBuckets.analyzedNotOpt, ...catalogProductBuckets.analyzedOpt],
    [catalogProductBuckets],
  )

  const catalogProductsAllSelected = useMemo(() => {
    if (!catalogFlatProductOrder.length) return false
    return catalogFlatProductOrder.every((x) => !!catalogSelection?.products?.[String(x.id)])
  }, [catalogFlatProductOrder, catalogSelection])

  function resetPrintSelection() {
    setPrintSelection({})
    setPrintLastSelectedIndex(null)
  }

  function togglePrintSelect(id, opts = {}) {
    const sid = String(id)
    setPrintSelection((prev) => {
      const next = { ...(prev || {}) }
      if (next[sid]) delete next[sid]
      else next[sid] = true
      return next
    })
    if (typeof opts?.lastIndex === 'number') setPrintLastSelectedIndex(opts.lastIndex)
  }

  function selectPrintRange(ids, fromIndex, toIndex) {
    const lo = Math.min(fromIndex, toIndex)
    const hi = Math.max(fromIndex, toIndex)
    const slice = (ids || []).slice(lo, hi + 1).map((x) => String(x))
    setPrintSelection((prev) => {
      const next = { ...(prev || {}) }
      slice.forEach((sid) => {
        next[sid] = true
      })
      return next
    })
    setPrintLastSelectedIndex(toIndex)
  }

  function selectAllReports(ids) {
    const sids = (ids || []).map((x) => String(x))
    setPrintSelection((prev) => {
      const next = { ...(prev || {}) }
      sids.forEach((sid) => {
        next[sid] = true
      })
      return next
    })
  }

  function unselectAllReports() {
    resetPrintSelection()
  }

  function moveSelectedReportsToTrash() {
    const ids = Object.keys(printSelection || {})
    if (!ids.length) return
    setPrintTrashState((prev) => {
      const s = new Set((prev?.trashed || []).map((x) => String(x)))
      ids.forEach((id) => s.add(String(id)))
      return { ...prev, trashed: Array.from(s) }
    })
    resetPrintSelection()
  }

  function deleteSelectedReportsForever() {
    const ids = Object.keys(printSelection || {})
    if (!ids.length) return
    setPrintTrashState((prev) => {
      const trashed = new Set((prev?.trashed || []).map((x) => String(x)))
      const deleted = new Set((prev?.deleted || []).map((x) => String(x)))
      ids.forEach((id) => {
        const sid = String(id)
        trashed.delete(sid)
        deleted.add(sid)
      })
      return { trashed: Array.from(trashed), deleted: Array.from(deleted) }
    })
    resetPrintSelection()
  }

  function restoreSelectedReports() {
    const ids = Object.keys(printSelection || {})
    if (!ids.length) return
    setPrintTrashState((prev) => {
      const trashed = new Set((prev?.trashed || []).map((x) => String(x)))
      ids.forEach((id) => trashed.delete(String(id)))
      return { ...prev, trashed: Array.from(trashed) }
    })
    resetPrintSelection()
  }

  function exportSelectedReports() {
    const ids = new Set(Object.keys(printSelection || {}).map((x) => String(x)))
    if (!ids.size) return
    const selectedItems = (historyProjects || []).filter((it) => ids.has(String(it.id)))
    const payload = {
      exportedAt: new Date().toISOString(),
      count: selectedItems.length,
      items: selectedItems,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selvora-reports-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function goWorkspace() {
    if (!user) {
      openAuthModal('signin', { redirectTo: '/workspace' })
      return
    }
    navigate('/workspace')
  }

  function handleStartUse() {
    if (!user) {
      goWorkspace()
      return
    }
    if (ctaAnimating || pageTransitioning) return
    setCtaAnimating(true)
    setPageTransitioning(true)
    try {
      if (startUseTimersRef.current.t1) window.clearTimeout(startUseTimersRef.current.t1)
      if (startUseTimersRef.current.t2) window.clearTimeout(startUseTimersRef.current.t2)
    } catch {
      // ignore
    }
    // 更丝滑：过渡层立即出现，路由切换在动画中段发生，让加载与过渡重叠
    startUseTimersRef.current.t1 = window.setTimeout(() => {
      navigate('/workspace')
    }, 520)
    // 兜底：如果由于某些原因没跳过去，再补一次
    startUseTimersRef.current.t2 = window.setTimeout(() => {
      navigate('/workspace')
    }, 1200)
  }

  async function handleSignOutClick() {
    try {
      await signOut?.()
    } catch {
      // ignore signOut error and continue redirecting to home
    }
    navigate('/', { replace: true })
  }

  useEffect(() => {
    return () => {
      try {
        if (startUseTimersRef.current.t1) window.clearTimeout(startUseTimersRef.current.t1)
        if (startUseTimersRef.current.t2) window.clearTimeout(startUseTimersRef.current.t2)
      } catch {
        // ignore
      }
    }
  }, [])

  function printSimpleHtml(title, contentHtml) {
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title><style>body{font-family:Arial,'Microsoft YaHei UI',sans-serif;padding:28px;color:#111}h1{font-size:22px;margin:0 0 16px}p{line-height:1.7}section{margin-top:14px;padding-top:10px;border-top:1px solid #ddd}</style></head><body><h1>${title}</h1>${contentHtml}</body></html>`
    const w = window.open('', '_blank', 'width=980,height=760')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  function handlePrintRecord(item) {
    if (!item) return
    if (item.type === 'analysis') {
      const r = item.payload
      const body = `<p><strong>推荐产品：</strong>${r.winner?.name || '-'}</p><p><strong>摘要：</strong>${r.summary || '-'}</p>`
      printSimpleHtml(item.title, body)
      return
    }
    const r = item.payload
    const body = `<p><strong>产品：</strong>${r.product_name || '-'}</p><p><strong>结论：</strong>${r.final_verdict || '-'}</p>`
    printSimpleHtml(item.title, body)
  }

  function closeOtherPopups(except) {
    if (except !== 'catalog') {
      setShowCatalogModal(false)
      setCatalogDetailOpen(null)
    }
    if (except !== 'settings') setShowSettingsModal(false)
    if (except !== 'profile') setShowProfileBubble(false)
    if (except !== 'print') setShowPrintPicker(false)
  }

  function captureOriginFromEl(el, opts = {}) {
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const vw = window.innerWidth
    const modalW = opts.width ?? Math.min(1120, vw - 48)
    const modalLeft = (vw - modalW) / 2
    const modalTop = opts.top ?? 24
    setModalOrigin({ x: cx - modalLeft, y: cy - modalTop })
  }

  function handleAction(type, label, e) {
    if (type === 'toggle-workshop') {
      goWorkspace()
      return
    }
    if (type === 'scroll-top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (type === 'scroll-gallery') {
      const el = document.getElementById('gallery-section')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (type === 'go-workspace') {
      goWorkspace()
      return
    }
    if (type === 'open-catalog') {
      closeOtherPopups('catalog')
      if (e?.currentTarget) captureOriginFromEl(e.currentTarget)
      setShowCatalogModal((v) => !v)
      return
    }
    if (type === 'open-settings') {
      closeOtherPopups('settings')
      if (e?.currentTarget) captureOriginFromEl(e.currentTarget)
      setShowSettingsModal((v) => !v)
      return
    }
    if (type === 'open-profile') {
      closeOtherPopups('profile')
      setShowProfileBubble((v) => !v)
      return
    }
    if (type === 'open-print') {
      closeOtherPopups('print')
      if (e?.currentTarget) captureOriginFromEl(e.currentTarget)
      setShowPrintPicker((v) => !v)
      return
    }
    setNotice(`「${label}」功能即将上线`)
    window.setTimeout(() => setNotice(''), 2200)
  }

  return (
    <main
      className={`home${pageTransitioning ? ' home--leaving' : ''}`}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <FrostedGlowOverlay mouseX={mousePos.x} mouseY={mousePos.y} />
      <header className="home-topbar">
        <div className="home-topbar__left">
          <MouseGlowWrap className="home-topbar__glow-area">
            <img src="/selvora-logo.png" alt="Selvora" className="home-topbar__logo" />
            <div className="home-topbar__hello">
              <div>{user ? `Hello, ${displayName}!` : 'Hello!'}</div>
              {user && <p>Ready for today&apos;s creation?</p>}
            </div>
          </MouseGlowWrap>
        </div>
        <div className="home-topbar__right">
          {user ? (
            <>
              <button type="button" className="home-top-pill home-top-pill--gray" onClick={() => setShowRecharge(false)}>
                账户余额：—
              </button>
              <button
                type="button"
                className="home-top-pill home-top-pill--violet"
                onClick={(e) => {
                  if (e?.currentTarget) {
                    const r = e.currentTarget.getBoundingClientRect()
                    const cx = r.left + r.width / 2
                    const cy = r.top + r.height / 2
                    const vw = window.innerWidth
                    const modalW = Math.min(420, vw - 40)
                    const modalLeft = (vw - modalW) / 2
                    const modalTop = window.innerHeight * 0.16
                    setModalOrigin({ x: cx - modalLeft, y: cy - modalTop })
                  }
                  setShowRecharge(true)
                }}
              >
                充值
              </button>
              <button
                type="button"
                className="home-top-pill home-top-pill--gray"
                onClick={() => {
                  void handleSignOutClick()
                }}
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="home-top-pill home-top-pill--gray"
                onClick={() => openAuthModal('signin')}
              >
                登录
              </button>
              <button
                type="button"
                className="home-top-pill home-top-pill--violet"
                onClick={() => openAuthModal('signup')}
              >
                注册
              </button>
            </>
          )}
        </div>
      </header>

      <div className="home-noise" />
      <div className="home-light home-light--left" />
      <div className="home-light home-light--right" />

      <div className="home-left-stack" aria-label="快捷操作">
        <aside className="home-rail home-rail--left home-rail--left-top">
          {LEFT_TOP_ACTIONS.map((action) => {
            const isActive =
              (action.id === 'home' && !scrollPastHeroMid) ||
              (action.id === 'gallery' && scrollPastHeroMid) ||
              (action.id === 'catalog' && showCatalogModal) ||
              (action.id === 'settings' && showSettingsModal)
            return (
              <div key={action.id} className="home-rail__group">
                <button
                  type="button"
                  className={`home-rail__btn${isActive ? ' home-rail__btn--active' : ''}`}
                  onClick={(e) => handleAction(action.type, action.label, e)}
                  title={action.label}
                >
                  <span
                    aria-hidden="true"
                    className={
                      action.id === 'workshop' || action.id === 'catalog'
                        ? 'material-symbols-outlined'
                        : undefined
                    }
                  >
                    {action.icon}
                  </span>
                  <span className="home-rail__tip">{action.label}</span>
                </button>
              </div>
            )
          })}
        </aside>
        <aside className="home-rail home-rail--left home-rail--left-bottom">
          {LEFT_BOTTOM_ACTIONS.map((action) => {
            const isActive = action.id === 'profile' && showProfileBubble
            const switchIcon = action.icon
            return (
              <div key={action.id} className="home-rail__group home-rail__group--relative">
                <button
                  type="button"
                  className={`home-rail__btn${isActive ? ' home-rail__btn--active' : ''}${action.id === 'profile' && user ? ' home-rail__btn--avatar' : ''}`}
                  onClick={(e) => handleAction(action.type, action.label, e)}
                  title={action.label}
                >
                  {action.id === 'profile' && user ? (
                    avatarUrl ? (
                      <img src={avatarUrl} alt="" className="home-rail__avatar" />
                    ) : (
                      <span className="home-rail__avatar-initial">
                        {(displayName || '?').charAt(0).toUpperCase()}
                      </span>
                    )
                  ) : (
                    <span aria-hidden="true">{action.id === 'switch' ? switchIcon : action.icon}</span>
                  )}
                  <span className="home-rail__tip">{action.label}</span>
                </button>
              </div>
            )
          })}
        </aside>
      </div>

      <aside className="home-rail home-rail--right" aria-label="快捷入口">
        {RIGHT_ACTIONS.map((action) => {
          const isActive = action.id === 'report' && showPrintPicker
          return (
            <button
              key={action.id}
              type="button"
              className={`home-rail__btn${isActive ? ' home-rail__btn--active' : ''}`}
              onClick={(e) => handleAction(action.type, action.label, e)}
              title={action.label}
            >
              <span aria-hidden="true">{action.icon}</span>
              <span className="home-rail__tip home-rail__tip--left">{action.label}</span>
            </button>
          )
        })}
      </aside>

      {showProfileBubble && (
        <button
          type="button"
          className="home-bubbles-backdrop"
          aria-label="关闭弹窗"
          onClick={() => {
            setShowProfileBubble(false)
          }}
        />
      )}

      {showPrintPicker && (
        <div className="home-print-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="home-print-modal__backdrop"
            aria-label="关闭打印窗口"
            onClick={() => {
              setShowPrintPicker(false)
              setPrintView('reports')
              resetPrintSelection()
            }}
          />
          <div
            className="home-print-modal__panel home-modal--pop"
            style={{ '--modal-origin-x': `${modalOrigin.x}px`, '--modal-origin-y': `${modalOrigin.y}px` }}
          >
            <div className="home-print-modal__head">
              <h3>导出报告</h3>
              <div className="home-catalog-modal__head-actions">
                <button
                  type="button"
                  className="home-catalog-modal__head-btn home-catalog-modal__head-btn--danger"
                  disabled={printSelectedCount === 0}
                  onClick={() => {
                    if (printView === 'trash') deleteSelectedReportsForever()
                    else moveSelectedReportsToTrash()
                  }}
                >
                  删除
                </button>
                <button
                  type="button"
                  className="home-catalog-modal__head-btn"
                  disabled={reportsInList.length === 0}
                  onClick={() => selectAllReports(reportsInList.map((x) => x.id))}
                >
                  全选
                </button>
                <button
                  type="button"
                  className="home-catalog-modal__head-btn"
                  disabled={!printAllSelected}
                  onClick={() => unselectAllReports()}
                >
                  取消全选
                </button>
                <button
                  type="button"
                  className="home-catalog-modal__head-btn home-catalog-modal__head-btn--close home-print-modal__close"
                  aria-label="关闭"
                  onClick={() => {
                    setShowPrintPicker(false)
                    setPrintView('reports')
                    resetPrintSelection()
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            {historyProjects.length === 0 && (
              <div className="home-float-panel__empty">暂无可打印的项目</div>
            )}
            {historyProjects.length > 0 && (
              <div className="home-print-modal__layout">
                <div className="home-catalog-modal__side" aria-label="报告分区">
                  <button
                    type="button"
                    className={`home-catalog-modal__side-btn${printView === 'reports' ? ' home-catalog-modal__side-btn--active' : ''}`}
                    onClick={() => {
                      setPrintView('reports')
                      resetPrintSelection()
                    }}
                  >
                    <span>报告</span>
                  </button>
                  <button
                    type="button"
                    className={`home-catalog-modal__side-btn${printView === 'trash' ? ' home-catalog-modal__side-btn--active' : ''}`}
                    onClick={() => {
                      setPrintView('trash')
                      resetPrintSelection()
                    }}
                  >
                    <span>垃圾桶</span>
                  </button>
                </div>
                <div className="home-print-modal__content">
                  {reportsInList.length === 0 ? (
                    <div className="home-catalog-modal__empty">
                      {printView === 'trash' ? '暂无内容' : '暂无报告'}
                    </div>
                  ) : (
                    <div className="home-catalog-modal__grid home-print-modal__grid--catalog">
                      {reportsInList.slice(0, 48).map((item, idx) => {
                        const selected = !!printSelection?.[String(item.id)]
                        const ids = reportsInList.map((x) => String(x.id))
                        const hasOptimizationPage = Array.isArray(item?.pages)
                          ? item.pages.some((p) => (p?.kind ?? p?.payload?.kind) === 'optimization')
                          : false
                        const badgeText = hasOptimizationPage ? '已分析/已优化' : '已分析/未优化'
                        const badgeClass = hasOptimizationPage
                          ? 'home-print-modal__badge home-print-modal__badge--green'
                          : 'home-print-modal__badge home-print-modal__badge--blue'
                        const pos = ids.indexOf(String(item.id))
                        return (
                          <ReportFolderItem
                            key={item.id}
                            item={item}
                            selected={selected}
                            badgeText={badgeText}
                            badgeClass={badgeClass}
                            onClickCard={(e) => {
                              if (e.shiftKey && typeof printLastSelectedIndex === 'number' && pos >= 0) {
                                selectPrintRange(ids, printLastSelectedIndex, pos)
                                return
                              }
                              togglePrintSelect(item.id, { lastIndex: pos })
                            }}
                            onPreview={() => {
                              if (item.type === 'workshop-batch' && item.pages?.length) {
                                setReportImagePreview({
                                  title: item.title,
                                  pages: item.pages.map((p) => ({
                                    title: p.title,
                                    url: p.imageDataUrl,
                                  })),
                                })
                              } else if (item.imageDataUrl) {
                                setReportImagePreview({ title: item.title, url: item.imageDataUrl })
                              }
                            }}
                            onToggle={(ev) => {
                              ev.stopPropagation()
                              if (ev.shiftKey && typeof printLastSelectedIndex === 'number' && pos >= 0) {
                                selectPrintRange(ids, printLastSelectedIndex, pos)
                                return
                              }
                              togglePrintSelect(item.id, { lastIndex: pos })
                            }}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {printView === 'trash' ? (
              <button
                type="button"
                className="home-trash-restore"
                disabled={printSelectedCount === 0}
                onClick={() => restoreSelectedReports()}
              >
                恢复
              </button>
            ) : null}

            {printView !== 'trash' ? (
              <button
                type="button"
                className="home-print-modal__export"
                disabled={printSelectedCount === 0}
                onClick={() => exportSelectedReports()}
              >
                导出报告
              </button>
            ) : null}
          </div>
        </div>
      )}

      {reportImagePreview ? (
        <div className="home-report-preview" role="dialog" aria-modal="true">
          <button
            type="button"
            className="home-report-preview__backdrop"
            aria-label="关闭预览"
            onClick={() => setReportImagePreview(null)}
          />
          <div className="home-report-preview__panel">
            <div className="home-report-preview__head">
              <h3>{reportImagePreview.title}</h3>
              <button type="button" className="home-report-preview__close" onClick={() => setReportImagePreview(null)}>
                ×
              </button>
            </div>
            <div className="home-report-preview__body">
              <ReportImagePreviewContent preview={reportImagePreview} />
            </div>
          </div>
        </div>
      ) : null}

      {showProfileBubble && (
        <div className="home-profile-bubble">
          <div className="home-profile-bubble__title">个人资料</div>
          {!user ? (
            <div className="home-profile-bubble__empty">请先登录</div>
          ) : (
            <dl className="home-profile-bubble__list">
              <dt>账号ID</dt>
              <dd>{user.id ?? '—'}</dd>
              <dt>账户名称</dt>
              <dd>{user.email ?? user.user_metadata?.name ?? '—'}</dd>
              <dt>邮箱</dt>
              <dd>{user.email ?? '—'}</dd>
              <dt>注册时间</dt>
              <dd>
                {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
              </dd>
            </dl>
          )}
        </div>
      )}

      {showCatalogModal && (
        <div className="home-catalog-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="home-catalog-overlay__backdrop"
            aria-label="关闭"
            onClick={() => {
              setShowCatalogModal(false)
              setCatalogEditMode(false)
              resetCatalogSelection()
              setCatalogDetailOpen(null)
            }}
          />
          <div
            className="home-catalog-modal home-modal--pop"
            style={{ '--modal-origin-x': `${modalOrigin.x}px`, '--modal-origin-y': `${modalOrigin.y}px` }}
          >
            <div className="home-catalog-modal__head">
              <h3>产品目录</h3>
              <div className="home-catalog-modal__head-actions">
                {catalogEditMode ? (
                  <>
                    <button
                      type="button"
                      className="home-catalog-modal__head-btn home-catalog-modal__head-btn--danger"
                      disabled={catalogSelectedCount === 0}
                      onClick={() => {
                        if (catalogView === 'trash') batchDeleteForever()
                        else batchMoveToTrash()
                      }}
                    >
                      删除
                    </button>
                    <button
                      type="button"
                      className="home-catalog-modal__head-btn"
                      onClick={() => {
                        setCatalogEditMode(false)
                        resetCatalogSelection()
                      }}
                    >
                      退出编辑
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="home-catalog-modal__head-btn"
                    onClick={() => {
                      setCatalogEditMode(true)
                      resetCatalogSelection()
                    }}
                  >
                    编辑
                  </button>
                )}
                <button
                  type="button"
                  className="home-catalog-modal__head-btn home-catalog-modal__head-btn--close"
                  onClick={() => {
                    setShowCatalogModal(false)
                    setCatalogEditMode(false)
                    resetCatalogSelection()
                    setCatalogDetailOpen(null)
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="home-catalog-modal__body home-catalog-modal__body--with-side">
              <div className="home-catalog-modal__side" aria-label="目录分区">
                <button
                  type="button"
                  className={`home-catalog-modal__side-btn${catalogView === 'catalog' ? ' home-catalog-modal__side-btn--active' : ''}`}
                  onClick={() => {
                    setCatalogView('catalog')
                    resetCatalogSelection()
                  }}
                >
                  <span>目录</span>
                </button>
                <button
                  type="button"
                  className={`home-catalog-modal__side-btn${catalogView === 'favorites' ? ' home-catalog-modal__side-btn--active' : ''}`}
                  onClick={() => {
                    setCatalogView('favorites')
                    resetCatalogSelection()
                  }}
                >
                  <span>收藏夹</span>
                </button>
                <button
                  type="button"
                  className={`home-catalog-modal__side-btn${catalogView === 'trash' ? ' home-catalog-modal__side-btn--active' : ''}`}
                  onClick={() => {
                    setCatalogView('trash')
                    resetCatalogSelection()
                  }}
                >
                  <span>垃圾桶</span>
                </button>
              </div>

              <div className="home-catalog-modal__main-panel">
                  <div className="home-catalog-modal__col-head">
                    {catalogEditMode ? (
                      <div className="home-catalog-modal__col-actions">
                        <button
                          type="button"
                          className="home-catalog-modal__col-action"
                          disabled={!catalogProductsAllSelected}
                          onClick={() => {
                            setCatalogSelection((prev) => ({ ...prev, products: {} }))
                            setCatalogLastSelectedIndex((prev) => ({ ...prev, products: null }))
                          }}
                        >
                          取消全选
                        </button>
                        <button
                          type="button"
                          className="home-catalog-modal__col-action"
                          onClick={() => {
                            const ids = catalogFlatProductOrder.map((x) => String(x.id))
                            setSelectAll('products', ids, true)
                          }}
                        >
                          全选
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {!userId && <div className="home-catalog-modal__empty">请先登录</div>}
                  {userId && loadingCatalog && <div className="home-catalog-modal__loading">加载中...</div>}
                  {userId && !loadingCatalog && catalogLoadError && (
                    <div className="home-catalog-modal__empty">{catalogLoadError}</div>
                  )}
                  {userId &&
                    !loadingCatalog &&
                    !catalogLoadError &&
                    catalogFlatProductOrder.length === 0 && (
                    <div className="home-catalog-modal__empty">
                      {catalogView === 'trash'
                        ? '暂无内容'
                        : catalogView === 'favorites'
                          ? '暂无收藏'
                          : catalogProductBuckets.pending.length > 0
                            ? '暂无已分析的产品，请在工作坊完成分析后将显示为「已分析/未优化」'
                            : '暂无产品'}
                    </div>
                  )}
                  {userId &&
                    !loadingCatalog &&
                    !catalogLoadError &&
                    catalogFlatProductOrder.length > 0 && (
                    <div className="home-catalog-modal__bucket-wrap">
                      {catalogProductBuckets.analyzedNotOpt.length > 0 ? (
                        <div className="home-catalog-modal__bucket">
                          <h4 className="home-catalog-modal__bucket-title">已分析/未优化</h4>
                          <div className="home-catalog-modal__grid">
                            {catalogProductBuckets.analyzedNotOpt.map((p) => (
                              <CatalogFolderItem
                                key={p.id}
                                itemId={String(p.id)}
                                product={p}
                                editMode={catalogEditMode}
                                selected={!!catalogSelection?.products?.[String(p.id)]}
                                badgeText="已分析/未优化"
                                badgeClass="home-print-modal__badge home-print-modal__badge--blue"
                                onToggleSelect={(id, meta) => {
                                  const ids = catalogFlatProductOrder.map((x) => String(x.id))
                                  const idx = ids.indexOf(String(id))
                                  if (
                                    meta?.shiftKey &&
                                    typeof catalogLastSelectedIndex.products === 'number' &&
                                    idx >= 0
                                  ) {
                                    selectRange('products', ids, catalogLastSelectedIndex.products, idx)
                                    return
                                  }
                                  toggleSelect('products', id, { lastIndex: idx })
                                }}
                                onClickCard={(e) => {
                                  const ids = catalogFlatProductOrder.map((x) => String(x.id))
                                  const idx = ids.indexOf(String(p.id))
                                  if (
                                    e?.shiftKey &&
                                    typeof catalogLastSelectedIndex.products === 'number' &&
                                    idx >= 0
                                  ) {
                                    selectRange('products', ids, catalogLastSelectedIndex.products, idx)
                                    return
                                  }
                                  toggleSelect('products', p.id, { lastIndex: idx })
                                }}
                                onOpenDetail={() => setCatalogDetailOpen({ product: p, optimization: null })}
                                showQuickActions={!!userId && !catalogEditMode}
                                isFavorite={favoriteProductIdSet.has(String(p.id))}
                                onFavoriteClick={() => toggleCatalogFavoriteId(p.id)}
                                onTrashClick={() => moveCatalogProductToTrash(p.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {catalogProductBuckets.analyzedOpt.length > 0 ? (
                        <div className="home-catalog-modal__bucket">
                          <h4 className="home-catalog-modal__bucket-title">已分析/已优化</h4>
                          <div className="home-catalog-modal__grid">
                            {catalogProductBuckets.analyzedOpt.map((p) => (
                              <CatalogFolderItem
                                key={p.id}
                                itemId={String(p.id)}
                                product={p}
                                editMode={catalogEditMode}
                                selected={!!catalogSelection?.products?.[String(p.id)]}
                                badgeText="已分析/已优化"
                                badgeClass="home-print-modal__badge home-print-modal__badge--green"
                                onToggleSelect={(id, meta) => {
                                  const ids = catalogFlatProductOrder.map((x) => String(x.id))
                                  const idx = ids.indexOf(String(id))
                                  if (
                                    meta?.shiftKey &&
                                    typeof catalogLastSelectedIndex.products === 'number' &&
                                    idx >= 0
                                  ) {
                                    selectRange('products', ids, catalogLastSelectedIndex.products, idx)
                                    return
                                  }
                                  toggleSelect('products', id, { lastIndex: idx })
                                }}
                                onClickCard={(e) => {
                                  const ids = catalogFlatProductOrder.map((x) => String(x.id))
                                  const idx = ids.indexOf(String(p.id))
                                  if (
                                    e?.shiftKey &&
                                    typeof catalogLastSelectedIndex.products === 'number' &&
                                    idx >= 0
                                  ) {
                                    selectRange('products', ids, catalogLastSelectedIndex.products, idx)
                                    return
                                  }
                                  toggleSelect('products', p.id, { lastIndex: idx })
                                }}
                                onOpenDetail={() => setCatalogDetailOpen({ product: p, optimization: null })}
                                showQuickActions={!!userId && !catalogEditMode}
                                isFavorite={favoriteProductIdSet.has(String(p.id))}
                                onFavoriteClick={() => toggleCatalogFavoriteId(p.id)}
                                onTrashClick={() => moveCatalogProductToTrash(p.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
              </div>
            </div>
            {catalogView === 'trash' ? (
              <button
                type="button"
                className="home-trash-restore"
                disabled={catalogSelectedCount === 0}
                onClick={() => restoreSelectedCatalogItems()}
              >
                恢复
              </button>
            ) : null}
          </div>
        </div>
      )}

      {catalogDetailOpen && (
        <ProductDetailModal
          userId={userId}
          product={catalogDetailOpen.product}
          focusOptimization={catalogDetailOpen.optimization}
          onClose={() => setCatalogDetailOpen(null)}
        />
      )}

      {showSettingsModal && (
        <div className="home-catalog-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="home-catalog-overlay__backdrop"
            aria-label="关闭"
            onClick={() => setShowSettingsModal(false)}
          />
          <div
            className="home-catalog-modal home-settings-modal home-modal--pop"
            style={{ '--modal-origin-x': `${modalOrigin.x}px`, '--modal-origin-y': `${modalOrigin.y}px` }}
          >
            <div className="home-catalog-modal__head">
              <h3>设置</h3>
              <button type="button" onClick={() => setShowSettingsModal(false)}>
                ×
              </button>
            </div>
            <div className="home-catalog-modal__body home-settings-modal__body">
              {user ? (
                <SettingsPanel onClose={() => setShowSettingsModal(false)} />
              ) : (
                <div className="settings-panel__empty">请先登录</div>
              )}
            </div>
          </div>
        </div>
      )}

      <section ref={heroSectionRef} className="home-hero" aria-labelledby="home-hero-title">
        <MouseGlowWrap className="home-hero__glow-area">
          <div className="home-hero__brand">SELVORA</div>
          <h1 id="home-hero-title" className="home-hero__title">
            {user ? `你好，${displayName}！` : '你好！'}
            <br />
            <span className="home-hero__title-accent">欢迎使用 Selvora！</span>
          </h1>
        </MouseGlowWrap>

        <div className="home-hero__cta-wrap">
          <button
            type="button"
            className={`home-hero__cta${ctaAnimating ? ' home-hero__cta--pulse' : ''}`}
            onClick={handleStartUse}
          >
            开始使用
          </button>
        </div>
        <p className="home-hero__lead">
          使用全球领先大模型，一站式实现产品分析与优化，并生成详细的市场模拟报告！
        </p>
      </section>

      <a
        className="home-scroll-anchor"
        href="#gallery-section"
        aria-label="跳转到展览馆"
        style={{
          opacity: scrollAnchorOpacity,
          pointerEvents: scrollAnchorOpacity <= 0 ? 'none' : 'auto',
        }}
      >
        <span className="home-scroll-anchor__text">展览馆</span>
        <span className="home-scroll-anchor__arrow" aria-hidden="true">▼</span>
      </a>

      {notice && <div className="home-toast">{notice}</div>}
      {showRecharge && (
        <div className="home-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="home-overlay__backdrop"
            aria-label="关闭"
            onClick={() => setShowRecharge(false)}
          />
          <div
            className="home-overlay__card home-modal--pop"
            style={{ '--modal-origin-x': `${modalOrigin.x}px`, '--modal-origin-y': `${modalOrigin.y}px` }}
          >
            <h3>充值中心</h3>
            <p>充值功能即将接入支付通道。当前可先联系管理员开通测试额度。</p>
            <button type="button" onClick={() => setShowRecharge(false)}>
              我知道了
            </button>
          </div>
        </div>
      )}
      {pageTransitioning && <div className="home-page-transition" aria-hidden="true" />}

      <ProductExhibitionSection
          userId={user?.id ?? null}
          favoriteProductIds={catalogFavorites}
          favoritesReady={catalogFavoritesHydrated}
          sectionId="gallery-section"
          firstRowSentinelRef={gallerySentinelRef}
          onFirstRowSentinelMount={() => setSentinelMounted(true)}
          exhibitionTitleRef={exhibitionTitleRef}
        />
    </main>
  )
}
