import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../../styles/homePage.css'
import { fetchUserProductsForGallery } from '../../services/productGallery'
import {
  fetchAnalyzedProductIdsForUser,
  fetchMergedComparisonHistory,
  fetchOptimizationHistoryRows,
  schedulePurgeOptimizations,
  schedulePurgeProducts,
} from '../../services/productDatabase'
import { resolveProductImageDisplayUrl } from '../../utils/productImageUrl'
import { groupWorkshopRecordsIntoBatches } from '../../utils/workshopReportBatches.js'
import ReportImagePreviewContent from './ReportImagePreviewContent.jsx'
import { useAuth } from '../../contexts/AuthContext'
import SettingsPanel from '../home/SettingsPanel'
import MouseGlowWrap from '../home/MouseGlowWrap'
import CatalogFolderItem from '../home/CatalogFolderItem.jsx'
import ProductDetailModal from '../home/ProductDetailModal.jsx'

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

  function handleCardPointerDown(e) {
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
      onClick={handleCardPointerDown}
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

export default function StitchWorkspaceShell({
  children,
  greetingName = '用户',
  userId,
  activeWorkspace,
  onSelectProductLab,
  onOpenHistory,
  historyOpen,
  canOpenReport,
  onOpenReport,
  onGenerateReport,
  generatingReport,
  canGenerateReport,
  generateReportProgress,
  generateReportStatus,
  workshopGeneratedReports = [],
  userAvatarUrl,
  accountBalance = null,
  unlimitedPoints = false,
  pointsConsumptionRecords = [],
  imageOptimizeCandidates = [],
  onSendImageOptimizeChat,
}) {
  const ENABLE_IMAGE_OPTIMIZE = false
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [workshopExpanded, setWorkshopExpanded] = useState(false)
  const workshopBtnRef = useRef(null)
  const [activeWorkshopAnchor, setActiveWorkshopAnchor] = useState(null)
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showProfileBubble, setShowProfileBubble] = useState(false)
  const [showPrintPicker, setShowPrintPicker] = useState(false)
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [showImageOptimizeModal, setShowImageOptimizeModal] = useState(false)
  const [imageOptimizeSelectedIds, setImageOptimizeSelectedIds] = useState([])
  const [imageOptimizeInput, setImageOptimizeInput] = useState('')
  const [imageOptimizeModel, setImageOptimizeModel] = useState('gemini-2.5-pro')
  const [imageOptimizeSending, setImageOptimizeSending] = useState(false)
  const [imageOptimizeMessages, setImageOptimizeMessages] = useState([])
  const [imageOptimizeThumbMap, setImageOptimizeThumbMap] = useState({})
  const [imageCompareModal, setImageCompareModal] = useState(null) // { beforeUrl, afterUrl, title }
  const [imageCompareMode, setImageCompareMode] = useState('slider') // slider | side
  const [imageCompareSplit, setImageCompareSplit] = useState(50)
  const imageOptimizeStorageKey = useMemo(
    () => (userId ? `imageOptimizeChat.v1.${userId}` : 'imageOptimizeChat.v1.guest'),
    [userId],
  )
  const [imageOptimizeHydrated, setImageOptimizeHydrated] = useState(false)
  const [reportImagePreview, setReportImagePreview] = useState(null)
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [catalogLoadError, setCatalogLoadError] = useState('')
  const [catalogProducts, setCatalogProducts] = useState([])
  const [catalogOptimizations, setCatalogOptimizations] = useState([])
  const [catalogAnalyzedProductIds, setCatalogAnalyzedProductIds] = useState(() => new Set())
  const [comparisonHistory, setComparisonHistory] = useState([])
  const [optimizationHistory, setOptimizationHistory] = useState([])
  const [loadingHomeData, setLoadingHomeData] = useState(false)
  const [modalOrigin, setModalOrigin] = useState({ x: 0, y: 0 })
  const [printView, setPrintView] = useState('reports') // 'reports' | 'trash'
  const [printSelection, setPrintSelection] = useState(() => ({}))
  const [printLastSelectedIndex, setPrintLastSelectedIndex] = useState(null)
  const [printTrashState, setPrintTrashState] = useState(() => ({
    trashed: [],
    deleted: [],
  }))
  /** 避免在从 localStorage 读到数据之前就把空状态写回，导致刷新后丢失删除/回收站记录 */
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
  /** 避免未从 localStorage 恢复前先写入空状态，导致刷新后删除记录丢失 */
  const [catalogTrashHydrated, setCatalogTrashHydrated] = useState(false)
  const [catalogFavorites, setCatalogFavorites] = useState(() => [])
  const [catalogFavoritesHydrated, setCatalogFavoritesHydrated] = useState(false)
  const [catalogDetailOpen, setCatalogDetailOpen] = useState(null)
  const avatarInitial = useMemo(
    () => (greetingName || '?').slice(0, 1).toUpperCase(),
    [greetingName],
  )
  const displayName = useMemo(
    () => user?.user_metadata?.name || user?.email?.split('@')[0] || greetingName || '用户',
    [user, greetingName],
  )
  const totalConsumedPoints = useMemo(
    () =>
      (Array.isArray(pointsConsumptionRecords) ? pointsConsumptionRecords : []).reduce(
        (acc, row) => acc + Math.max(0, Math.floor(Number(row?.points) || 0)),
        0,
      ),
    [pointsConsumptionRecords],
  )
  const monthConsumedPoints = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    return (Array.isArray(pointsConsumptionRecords) ? pointsConsumptionRecords : []).reduce((acc, row) => {
      if (!row?.time) return acc
      const d = new Date(row.time)
      if (d.getFullYear() !== y || d.getMonth() !== m) return acc
      return acc + Math.max(0, Math.floor(Number(row?.points) || 0))
    }, 0)
  }, [pointsConsumptionRecords])
  const selectedImageOptimizeCandidates = useMemo(() => {
    const ids = new Set((imageOptimizeSelectedIds || []).map((x) => String(x)))
    return (Array.isArray(imageOptimizeCandidates) ? imageOptimizeCandidates : []).filter((x) =>
      ids.has(String(x?.id)),
    )
  }, [imageOptimizeCandidates, imageOptimizeSelectedIds])

  useEffect(() => {
    setImageOptimizeHydrated(false)
    try {
      const raw = window.localStorage.getItem(imageOptimizeStorageKey)
      const parsed = raw ? JSON.parse(raw) : null
      const nextMessages = Array.isArray(parsed?.messages) ? parsed.messages : []
      const nextModel = typeof parsed?.model === 'string' ? parsed.model : ''
      setImageOptimizeMessages(nextMessages)
      if (nextModel) setImageOptimizeModel(nextModel)
    } catch {
      setImageOptimizeMessages([])
    }
    setImageOptimizeHydrated(true)
  }, [imageOptimizeStorageKey])

  useEffect(() => {
    if (!imageOptimizeHydrated) return
    const sanitizeMessages = (list) => {
      const arr = Array.isArray(list) ? list : []
      const trimmed = arr.slice(-60) // 避免 localStorage 过大
      return trimmed.map((m) => {
        const safe = {
          id: m?.id || `m-${Date.now()}`,
          role: m?.role === 'user' ? 'user' : 'assistant',
          text: typeof m?.text === 'string' ? m.text : '',
          time: typeof m?.time === 'string' ? m.time : '',
          isError: !!m?.isError,
          beforeImageUrl: typeof m?.beforeImageUrl === 'string' ? m.beforeImageUrl : '',
          imageUrl: typeof m?.imageUrl === 'string' ? m.imageUrl : '',
        }
        // 若图片是超长 data url，容易撑爆 localStorage：保留文本，丢弃图片
        if (safe.imageUrl.startsWith('data:') && safe.imageUrl.length > 180_000) safe.imageUrl = ''
        if (safe.beforeImageUrl.startsWith('data:') && safe.beforeImageUrl.length > 180_000) safe.beforeImageUrl = ''
        return safe
      })
    }
    try {
      const payload = {
        v: 1,
        model: imageOptimizeModel,
        messages: sanitizeMessages(imageOptimizeMessages),
        updatedAt: new Date().toISOString(),
      }
      window.localStorage.setItem(imageOptimizeStorageKey, JSON.stringify(payload))
    } catch {
      // ignore quota; chat 仍可用，只是不会持久化
    }
  }, [
    imageOptimizeHydrated,
    imageOptimizeMessages,
    imageOptimizeModel,
    imageOptimizeStorageKey,
  ])

  useEffect(() => {
    const list = Array.isArray(imageOptimizeCandidates) ? imageOptimizeCandidates : []
    if (!list.length) {
      setImageOptimizeSelectedIds([])
      return
    }
    const valid = new Set(list.map((x) => String(x?.id)))
    setImageOptimizeSelectedIds((prev) => {
      const next = (prev || []).map((x) => String(x)).filter((x) => valid.has(x))
      return next
    })
  }, [imageOptimizeCandidates])

  useEffect(() => {
    const list = Array.isArray(imageOptimizeCandidates) ? imageOptimizeCandidates : []
    if (!list.length) {
      setImageOptimizeThumbMap({})
      return
    }
    let cancelled = false
    ;(async () => {
      const pairs = await Promise.all(
        list.map(async (item) => {
          const raw = item?.imageUrl || ''
          if (!raw) return [String(item?.id || ''), '']
          if (String(raw).startsWith('http://') || String(raw).startsWith('https://') || String(raw).startsWith('data:')) {
            return [String(item?.id || ''), String(raw)]
          }
          const resolved = await resolveProductImageDisplayUrl(String(raw))
          return [String(item?.id || ''), resolved || String(raw)]
        }),
      )
      if (cancelled) return
      setImageOptimizeThumbMap(Object.fromEntries(pairs))
    })()
    return () => {
      cancelled = true
    }
  }, [imageOptimizeCandidates])
  const todayConsumedPoints = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const d0 = now.getDate()
    return (Array.isArray(pointsConsumptionRecords) ? pointsConsumptionRecords : []).reduce((acc, row) => {
      if (!row?.time) return acc
      const d = new Date(row.time)
      if (d.getFullYear() !== y || d.getMonth() !== m || d.getDate() !== d0) return acc
      return acc + Math.max(0, Math.floor(Number(row?.points) || 0))
    }, 0)
  }, [pointsConsumptionRecords])

  /** 仅展示工作坊「生成报告」PNG（按批次合并为一张卡片）。数据库中的分析/优化记录与 PNG 重复，不再混入本列表，避免刷新后出现双倍条目。 */
  const historyProjects = useMemo(
    () => groupWorkshopRecordsIntoBatches(workshopGeneratedReports || []),
    [workshopGeneratedReports],
  )

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
    if (except !== 'points') setShowPointsModal(false)
    if (except !== 'image-optimize') setShowImageOptimizeModal(false)
  }

  async function handleSignOutClick() {
    try {
      await signOut?.()
    } catch {
      // ignore signOut error and continue redirecting to home
    }
    navigate('/', { replace: true })
  }

  function handleSelectImageOptimizeCandidate(item) {
    if (!item) return
    const sid = String(item?.id || '')
    if (!sid) return
    setImageOptimizeSelectedIds((prev) => {
      const set = new Set((prev || []).map((x) => String(x)))
      if (set.has(sid)) set.delete(sid)
      else set.add(sid)
      return Array.from(set)
    })
    setImageOptimizeInput('默认按照优化方案进行优化。')
  }

  async function handleSendImageOptimizeMessage() {
    if (imageOptimizeSending) return
    const text = String(imageOptimizeInput || '').trim()
    if (!text) return
    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      time: new Date().toISOString(),
    }
    setImageOptimizeMessages((prev) => [...prev, userMsg])
    setImageOptimizeInput('')
    setImageOptimizeSending(true)
    try {
      const runnable = selectedImageOptimizeCandidates || []
      if (!runnable.length) throw new Error('请先在左侧选择至少一个产品')
      if (typeof onSendImageOptimizeChat !== 'function') {
        throw new Error('产品图优化服务未连接')
      }
      for (let i = 0; i < runnable.length; i += 1) {
        const candidate = runnable[i]
        const beforeUrl = imageOptimizeThumbMap[String(candidate?.id || '')] || candidate?.imageUrl || ''
        // eslint-disable-next-line no-await-in-loop
        const result = await onSendImageOptimizeChat({
          productIndex: candidate.productIndex,
          sourceImageUrl: candidate.imageUrl,
          productName: candidate.productName,
          optimizationResult: candidate.optimizationResult || null,
          message: text,
          model: imageOptimizeModel,
        })
        setImageOptimizeMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}-${i}`,
            role: 'assistant',
            text: `【${candidate?.productName || `产品${(candidate?.productIndex || 0) + 1}`}】${
              result?.assistantText || '已完成产品图优化。'
            }`,
            imageUrl: result?.optimizedImageUrl || '',
            beforeImageUrl: beforeUrl,
            time: new Date().toISOString(),
          },
        ])
      }
    } catch (err) {
      setImageOptimizeMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: err?.message || '产品图优化失败，请稍后重试。',
          time: new Date().toISOString(),
          isError: true,
        },
      ])
    } finally {
      setImageOptimizeSending(false)
    }
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
      // ignore
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
      // ignore
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
    if (catalogView === 'trash' && userId) {
      try {
        await Promise.all([
          schedulePurgeProducts(userId, productIds, 14),
          schedulePurgeOptimizations(userId, optimizationIds, 14),
        ])
      } catch {
        // ignore
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

  function scrollToAnchor(anchorId) {
    const el = document.getElementById(anchorId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!workshopExpanded) return
    let raf = 0

    const anchors = ['lab-prep', 'lab-stage1', 'lab-stage2']

    const computeActive = () => {
      const candidates = anchors
        .map((id) => {
          const el = document.getElementById(id)
          if (!el) return null
          const r = el.getBoundingClientRect()
          // 距离视口顶部 140px 的参考线最近者视为当前段落（贴合有顶部栏的页面）
          const targetY = 140
          const dist = Math.abs(r.top - targetY)
          return { id, dist, top: r.top }
        })
        .filter(Boolean)

      if (!candidates.length) return
      candidates.sort((a, b) => a.dist - b.dist)
      setActiveWorkshopAnchor(candidates[0].id)
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        computeActive()
      })
    }

    computeActive()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [workshopExpanded])

  useEffect(() => {
    if (!showCatalogModal) return
    if (!userId) {
      setCatalogProducts([])
      setCatalogOptimizations([])
      setCatalogAnalyzedProductIds(new Set())
      setLoadingCatalog(false)
      setCatalogLoadError('请先登录')
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

  return (
    <div className="stitch-workspace-root">
      <div className="min-h-screen overflow-x-hidden bg-surface font-body text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[60%] w-[60%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-secondary-container/5 blur-[120px]" />
      </div>

      <div className="home-left-stack" aria-label="快捷操作">
        <aside className="home-rail home-rail--left home-rail--left-top" aria-label="左侧菜单">
          <div className="home-rail__group">
            <button
              type="button"
              className="home-rail__btn"
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                try {
                  navigate('/', { replace: true })
                } catch {
                  // ignore
                }
                try {
                  window.location.href = '/'
                } catch {
                  // ignore
                }
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                try {
                  window.location.href = '/'
                } catch {
                  // ignore
                }
              }}
              title="首页"
            >
              <span aria-hidden="true">⌂</span>
              <span className="home-rail__tip">首页</span>
            </button>
          </div>
          <div className="home-rail__group">
            <button
              type="button"
              className="home-rail__btn home-rail__btn--active"
              onClick={() => setWorkshopExpanded((v) => !v)}
              title="工作坊"
              ref={workshopBtnRef}
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                handyman
              </span>
              <span className="home-rail__tip">工作坊</span>
            </button>

            {workshopExpanded ? (
              <div className="home-rail__sub">
                <button
                  type="button"
                  className="home-rail__btn home-rail__btn--sub"
                  onClick={() => scrollToAnchor('lab-prep')}
                  title="实验准备"
                  style={
                    activeWorkshopAnchor === 'lab-prep'
                      ? {
                          boxShadow: '0 0 0 2px rgba(255,255,255,0.85), 0 0 18px rgba(255,255,255,0.35)',
                        }
                      : undefined
                  }
                >
                  <span aria-hidden="true">●</span>
                  <span className="home-rail__tip">实验准备</span>
                </button>
                <button
                  type="button"
                  className="home-rail__btn home-rail__btn--sub"
                  onClick={() => scrollToAnchor('lab-stage1')}
                  title="第一阶段：初始分析"
                  style={
                    activeWorkshopAnchor === 'lab-stage1'
                      ? {
                          boxShadow: '0 0 0 2px rgba(255,255,255,0.85), 0 0 18px rgba(255,255,255,0.35)',
                        }
                      : undefined
                  }
                >
                  <span aria-hidden="true">●</span>
                  <span className="home-rail__tip">初始分析</span>
                </button>
                <button
                  type="button"
                  className="home-rail__btn home-rail__btn--sub"
                  onClick={() => scrollToAnchor('lab-stage2')}
                  title="第二阶段：优化面板"
                  style={
                    activeWorkshopAnchor === 'lab-stage2'
                      ? {
                          boxShadow: '0 0 0 2px rgba(255,255,255,0.85), 0 0 18px rgba(255,255,255,0.35)',
                        }
                      : undefined
                  }
                >
                  <span aria-hidden="true">●</span>
                  <span className="home-rail__tip">优化面板</span>
                </button>
              </div>
            ) : null}
          </div>
          <div className="home-rail__group">
            <button
              type="button"
              className={`home-rail__btn${showCatalogModal ? ' home-rail__btn--active' : ''}`}
              onClick={(e) => {
                closeOtherPopups('catalog')
                if (e?.currentTarget) captureOriginFromEl(e.currentTarget)
                setShowCatalogModal((v) => !v)
              }}
              title="产品目录"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                menu_book
              </span>
              <span className="home-rail__tip">产品目录</span>
            </button>
          </div>
          <div className="home-rail__group">
            <button
              type="button"
              className="home-rail__btn"
              onClick={() => navigate('/', { state: { open: 'gallery' } })}
              title="展览"
            >
              <span aria-hidden="true">▦</span>
              <span className="home-rail__tip">展览</span>
            </button>
          </div>
          <div className="home-rail__group">
            <button
              type="button"
              className={`home-rail__btn${showSettingsModal ? ' home-rail__btn--active' : ''}`}
              onClick={(e) => {
                closeOtherPopups('settings')
                if (e?.currentTarget) captureOriginFromEl(e.currentTarget)
                setShowSettingsModal((v) => !v)
              }}
              title="设置"
            >
              <span aria-hidden="true">⚙</span>
              <span className="home-rail__tip">设置</span>
            </button>
          </div>
        </aside>

        <aside className="home-rail home-rail--left home-rail--left-bottom" aria-label="左侧底部">
          <div className="home-rail__group home-rail__group--relative">
            <button
              type="button"
              className={`home-rail__btn home-rail__btn--avatar${showProfileBubble ? ' home-rail__btn--active' : ''}`}
              title="个人资料"
              onClick={() => {
                closeOtherPopups('profile')
                setShowProfileBubble((v) => !v)
              }}
            >
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" className="home-rail__avatar" />
              ) : (
                <span className="home-rail__avatar-initial">{avatarInitial}</span>
              )}
              <span className="home-rail__tip">个人资料</span>
            </button>
          </div>
        </aside>
      </div>

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
              <div className="relative group">
                <button
                  type="button"
                  className="home-top-pill home-top-pill--gray"
                  onClick={() => {
                    closeOtherPopups('points')
                    setShowPointsModal(true)
                  }}
                >
                  账户积分：
                  {unlimitedPoints
                    ? '无限积分'
                    : typeof accountBalance === 'number'
                      ? `${Math.max(0, Math.floor(accountBalance))} 积分`
                      : '—'}
                </button>
                <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-30 hidden min-w-[320px] max-w-[420px] rounded-xl border border-outline-variant/20 bg-surface-container-high/95 p-3 shadow-2xl backdrop-blur-md group-hover:pointer-events-auto group-hover:block">
                  <div className="mb-2 text-xs font-bold text-on-surface">积分消耗记录</div>
                  <div className="max-h-56 space-y-1 overflow-auto pr-1 text-xs">
                    {Array.isArray(pointsConsumptionRecords) && pointsConsumptionRecords.length ? (
                      pointsConsumptionRecords.slice(0, 12).map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center justify-between rounded-md border border-outline-variant/10 bg-surface-container-low px-2 py-1.5"
                        >
                          <span className="truncate text-on-surface-variant">
                            {row.label} -{Math.max(0, Math.floor(Number(row.points) || 0))}积分
                          </span>
                          <span className="ml-2 shrink-0 text-[11px] text-on-surface-variant/80">
                            {row.time ? new Date(row.time).toLocaleString() : '—'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border border-outline-variant/10 bg-surface-container-low px-2 py-2 text-on-surface-variant">
                        暂无积分消耗记录
                      </div>
                    )}
                  </div>
                  <Link
                    to="/billing"
                    className="mt-2 block text-xs font-semibold text-primary hover:underline"
                  >
                    查看计费说明
                  </Link>
                </div>
              </div>
              <button
                type="button"
                className="home-top-pill home-top-pill--violet"
                onClick={() => navigate('/', { state: { open: 'recharge' } })}
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
              <button type="button" className="home-top-pill home-top-pill--gray" onClick={() => navigate('/')}>
                登录
              </button>
              <button type="button" className="home-top-pill home-top-pill--violet" onClick={() => navigate('/')}>
                注册
              </button>
            </>
          )}
        </div>
      </header>

      <aside className="home-rail home-rail--right" aria-label="快捷入口">
        {ENABLE_IMAGE_OPTIMIZE ? (
          <button
            type="button"
            className={`home-rail__btn home-rail__btn--label-reportlike${
              showImageOptimizeModal ? ' home-rail__btn--label-reportlike--active' : ''
            }`}
            onClick={() => {
              closeOtherPopups('image-optimize')
              setShowImageOptimizeModal((v) => !v)
            }}
            title="产品图优化"
          >
            <span className="home-rail__label-text">产品图优化</span>
          </button>
        ) : null}
        <button
          type="button"
          className={`home-rail__btn home-rail__btn--tall-report${
            generateReportStatus === 'success' ? ' home-rail__btn--tall-report--done' : ''
          }${generatingReport ? ' home-rail__btn--tall-report--running' : ''}`}
          onClick={onGenerateReport}
          disabled={!canGenerateReport || !!generatingReport}
          title="生成报告"
        >
          {generatingReport ? (
            <span
              className="home-rail__tall-water"
              style={{ height: `${Math.max(0, Math.min(100, generateReportProgress || 0))}%` }}
              aria-hidden="true"
            />
          ) : null}
          <span className="home-rail__tall-foreground">
            {generatingReport ? (
              <>
                <span className="home-rail__tall-percent">
                  {Math.max(0, Math.min(100, generateReportProgress || 0))}%
                </span>
                <span className="home-rail__tall-text">生成报告</span>
              </>
            ) : generateReportStatus === 'success' ? (
              <span className="home-rail__tall-text">已完成</span>
            ) : (
              <span className="home-rail__tall-text">生成报告</span>
            )}
          </span>
        </button>
        <button
          type="button"
          className={`home-rail__btn${showPrintPicker ? ' home-rail__btn--active' : ''}`}
          onClick={(e) => {
            closeOtherPopups('print')
            if (e?.currentTarget) captureOriginFromEl(e.currentTarget, { width: 640, top: window.innerHeight * 0.16 })
            setShowPrintPicker((v) => !v)
          }}
          title="导出报告"
        >
          <span aria-hidden="true">⎙</span>
          <span className="home-rail__tip home-rail__tip--left">导出报告</span>
        </button>
      </aside>

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
                    <div>{printView === 'trash' ? '暂无内容' : '暂无报告'}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="home-catalog-modal__head-btn"
                        onClick={() => {
                          setPrintTrashState({ trashed: [], deleted: [] })
                          resetPrintSelection()
                        }}
                      >
                        显示全部（清除隐藏）
                      </button>
                      <button
                        type="button"
                        className="home-catalog-modal__head-btn"
                        onClick={() => {
                          // 触发 WorkspacePage 的 localStorage 扫描/迁移 useEffect 重新跑
                          try {
                            window.dispatchEvent(new CustomEvent('workshop-reports-local-restore'))
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        本地恢复
                      </button>
                    </div>
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

      {ENABLE_IMAGE_OPTIMIZE && showImageOptimizeModal ? (
        <>
          <button
            type="button"
            className="home-bubbles-backdrop"
            aria-label="关闭产品图优化"
            onClick={() => setShowImageOptimizeModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed right-[84px] top-1/2 z-30 flex h-[72vh] w-[min(980px,calc(100vw-180px))] -translate-y-1/2 overflow-hidden rounded-2xl border border-white/15 bg-[rgba(16,18,23,0.96)] shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          >
            <aside className="w-[240px] shrink-0 border-r border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 text-xs font-bold text-on-surface-variant">已优化产品</div>
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(72vh - 24px)' }}>
                {(Array.isArray(imageOptimizeCandidates) ? imageOptimizeCandidates : []).length ? (
                  (imageOptimizeCandidates || []).map((item) => {
                    const sid = String(item?.id || '')
                    const active = (imageOptimizeSelectedIds || []).some((x) => String(x) === sid)
                    const thumb = imageOptimizeThumbMap[sid] || ''
                    return (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => handleSelectImageOptimizeCandidate(item)}
                        className={`flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${
                          active
                            ? 'border-primary/45 bg-primary/10'
                            : 'border-white/10 bg-white/[0.02] hover:border-primary/25'
                        }`}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-black/20">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-on-surface-variant">
                              无图
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-on-surface">{item?.productName || '未命名产品'}</div>
                          <div className="mt-0.5 text-[11px] text-on-surface-variant">点击自动填充</div>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 text-xs text-on-surface-variant">
                    暂无可优化产品。请先完成产品优化。
                  </div>
                )}
              </div>
            </aside>

            <section className="flex min-h-0 flex-1 flex-col p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-on-surface">产品图优化对话</div>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full bg-white/10 text-on-surface"
                  onClick={() => setShowImageOptimizeModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-on-surface-variant">模型</span>
                <select
                  value={imageOptimizeModel}
                  onChange={(e) => setImageOptimizeModel(e.target.value)}
                  className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs text-on-surface"
                >
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                </select>
                {selectedImageOptimizeCandidates.length ? (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
                    已选产品：{selectedImageOptimizeCandidates.length} 个
                  </span>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="space-y-3">
                  {imageOptimizeMessages.length ? (
                    imageOptimizeMessages.map((m) => (
                      <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                            m.role === 'user'
                              ? 'bg-primary/20 text-on-surface'
                              : m.isError
                                ? 'bg-error/15 text-error'
                                : 'bg-white/10 text-on-surface'
                          }`}
                        >
                          <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                          {m.imageUrl ? (
                            <button
                              type="button"
                              className="mt-2 block w-full overflow-hidden rounded-md border border-white/10 text-left"
                              onClick={() => {
                                setImageCompareMode('slider')
                                setImageCompareSplit(50)
                                setImageCompareModal({
                                  beforeUrl: m.beforeImageUrl || '',
                                  afterUrl: m.imageUrl || '',
                                  title: '优化前后对比',
                                })
                              }}
                              title="点击放大/对比"
                            >
                              <img src={m.imageUrl} alt="" className="max-h-[260px] w-full object-cover" />
                              <div className="flex items-center justify-between gap-2 bg-black/35 px-2 py-1 text-[11px] text-on-surface-variant">
                                <span>点击放大</span>
                                <span>{m.beforeImageUrl ? '优化前后对比' : '查看大图'}</span>
                              </div>
                            </button>
                          ) : null}
                          <div className="mt-1 text-[11px] text-on-surface-variant/80">
                            {m.time ? new Date(m.time).toLocaleString() : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-on-surface-variant">
                      在左侧选择产品后，输入你的指令并发送。系统会自动结合该产品的优化方案进行产品图优化。
                    </div>
                  )}
                </div>
              </div>

              {selectedImageOptimizeCandidates.length ? (
                <div className="mt-3 rounded-md border border-primary/30 bg-primary/10 p-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedImageOptimizeCandidates.map((candidate) => {
                      const sid = String(candidate?.id || '')
                      const thumb = imageOptimizeThumbMap[sid] || candidate?.imageUrl || ''
                      return (
                        <div key={sid} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/20">
                            {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="max-w-[180px] truncate text-xs font-bold text-on-surface">
                            {candidate?.productName || '未命名产品'}
                          </div>
                          <button
                            type="button"
                            className="h-5 w-5 rounded-full bg-white/10 text-xs text-on-surface-variant hover:text-on-surface"
                            onClick={() =>
                              setImageOptimizeSelectedIds((prev) =>
                                (prev || []).filter((x) => String(x) !== sid),
                              )
                            }
                            title="移除该产品"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-2 truncate text-xs text-on-surface-variant">
                    已选择产品，发送后将按优化方案处理主图
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex items-end gap-2">
                <textarea
                  rows={6}
                  value={imageOptimizeInput}
                  onChange={(e) => setImageOptimizeInput(e.target.value)}
                  placeholder="输入你希望优化的方向，例如：突出高级感、提升主图点击率、保留主体结构..."
                  className="min-h-[164px] flex-1 resize-none rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-on-surface outline-none focus:border-primary/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleSendImageOptimizeMessage()
                  }}
                  disabled={
                    imageOptimizeSending ||
                    !selectedImageOptimizeCandidates.length ||
                    !String(imageOptimizeInput || '').trim()
                  }
                  className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
                >
                  {imageOptimizeSending ? '发送中...' : '发送'}
                </button>
              </div>
            </section>
          </div>
        </>
      ) : null}

      {ENABLE_IMAGE_OPTIMIZE && imageCompareModal ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="关闭图片预览"
            onClick={() => setImageCompareModal(null)}
          />
          <div className="absolute left-1/2 top-1/2 z-10 w-[min(1100px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/15 bg-[rgba(16,18,23,0.96)] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="truncate text-sm font-bold text-on-surface">{imageCompareModal.title || '图片预览'}</div>
              <div className="flex items-center gap-2">
                {imageCompareModal.beforeUrl ? (
                  <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 text-xs">
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 ${imageCompareMode === 'slider' ? 'bg-primary text-on-primary' : 'text-on-surface'}`}
                      onClick={() => setImageCompareMode('slider')}
                    >
                      滑杆对比
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 ${imageCompareMode === 'side' ? 'bg-primary text-on-primary' : 'text-on-surface'}`}
                      onClick={() => setImageCompareMode('side')}
                    >
                      左右对照
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="h-8 w-8 rounded-full bg-white/10 text-on-surface"
                  onClick={() => setImageCompareModal(null)}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4">
              {imageCompareModal.beforeUrl && imageCompareMode === 'slider' ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <img
                      src={imageCompareModal.beforeUrl}
                      alt=""
                      className="block max-h-[70vh] w-full select-none object-contain"
                      draggable="false"
                    />
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ clipPath: `inset(0 ${100 - imageCompareSplit}% 0 0)` }}
                    >
                      <img
                        src={imageCompareModal.afterUrl}
                        alt=""
                        className="block max-h-[70vh] w-full select-none object-contain"
                        draggable="false"
                      />
                    </div>
                    <div
                      className="pointer-events-none absolute inset-y-0"
                      style={{ left: `${imageCompareSplit}%`, width: 0 }}
                    >
                      <div className="h-full w-[2px] bg-primary shadow-[0_0_12px_rgba(175,255,100,0.35)]" />
                    </div>
                    <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white">
                      优化前
                    </div>
                    <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white">
                      优化后
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-on-surface-variant">对比</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={imageCompareSplit}
                      onChange={(e) => setImageCompareSplit(Number(e.target.value) || 0)}
                      className="w-full"
                    />
                    <span className="w-12 text-right text-xs text-on-surface-variant">{imageCompareSplit}%</span>
                  </div>
                </div>
              ) : imageCompareModal.beforeUrl ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <div className="border-b border-white/10 px-3 py-2 text-xs font-bold text-on-surface-variant">优化前</div>
                    <img src={imageCompareModal.beforeUrl} alt="" className="block max-h-[70vh] w-full object-contain" />
                  </div>
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <div className="border-b border-white/10 px-3 py-2 text-xs font-bold text-on-surface-variant">优化后</div>
                    <img src={imageCompareModal.afterUrl} alt="" className="block max-h-[70vh] w-full object-contain" />
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  <img src={imageCompareModal.afterUrl} alt="" className="block max-h-[76vh] w-full object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showPointsModal ? (
        <div className="home-catalog-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="home-catalog-overlay__backdrop"
            aria-label="关闭积分消耗记录"
            onClick={() => setShowPointsModal(false)}
          />
          <div className="home-catalog-modal home-modal--pop" style={{ maxWidth: 780 }}>
            <div className="home-catalog-modal__head">
              <div>
                <h3>积分消耗记录</h3>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                  <span>
                    总消耗积分：<span className="font-bold text-primary">{totalConsumedPoints}</span>
                  </span>
                  <span>
                    本月消耗积分：<span className="font-bold text-primary">{monthConsumedPoints}</span>
                  </span>
                  <span>
                    今日消耗积分：<span className="font-bold text-primary">{todayConsumedPoints}</span>
                  </span>
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  扣费规则与充值方式见{' '}
                  <Link to="/billing" className="font-semibold text-primary hover:underline" onClick={() => setShowPointsModal(false)}>
                    计费说明
                  </Link>
                  。
                </p>
              </div>
              <button type="button" onClick={() => setShowPointsModal(false)}>
                ×
              </button>
            </div>
            <div className="home-catalog-modal__body">
              <div className="max-h-[62vh] overflow-auto rounded-lg border border-outline-variant/10">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface-container-high">
                    <tr>
                      <th className="px-3 py-2">类型</th>
                      <th className="px-3 py-2">消耗</th>
                      <th className="px-3 py-2">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(pointsConsumptionRecords) && pointsConsumptionRecords.length ? (
                      pointsConsumptionRecords.map((row) => (
                        <tr key={row.id} className="border-t border-outline-variant/10">
                          <td className="px-3 py-2">{row.label}</td>
                          <td className="px-3 py-2 font-bold text-primary">-{Math.max(0, Math.floor(Number(row.points) || 0))}积分</td>
                          <td className="px-3 py-2 text-on-surface-variant">
                            {row.time ? new Date(row.time).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-on-surface-variant">
                          暂无积分消耗记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
              <dd>{user.created_at ? new Date(user.created_at).toLocaleString() : '—'}</dd>
            </dl>
          )}
        </div>
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
              {user ? <SettingsPanel onClose={() => setShowSettingsModal(false)} /> : <div className="settings-panel__empty">请先登录</div>}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1600px] space-y-6 pb-24 pl-6 pr-6 pt-24 sm:space-y-8 sm:pl-36 sm:pr-28 sm:pt-32">
        {children}
      </div>

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
          <div className="home-catalog-modal home-modal--pop">
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
                  {loadingCatalog && <div className="home-catalog-modal__loading">加载中...</div>}
                  {!loadingCatalog && catalogLoadError && (
                    <div className="home-catalog-modal__empty">{catalogLoadError}</div>
                  )}
                  {!loadingCatalog &&
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
                  {!loadingCatalog &&
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

      <footer className="px-6 pb-10 pl-24 text-center sm:pl-36">
        <p className="font-label text-[0.625rem] uppercase tracking-widest text-on-surface-variant opacity-35">
          Selvora Intelligence Systems · AI Workbench
        </p>
      </footer>
      </div>
    </div>
  )
}
