import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import ReportView from '../ReportView'
import { useAuth } from '../contexts/AuthContext'
import { useComparisonHistory } from '../hooks/useComparisonHistory'
import { useOptimizationHistoryList } from '../hooks/useOptimizationHistoryList'
import { useReportMode } from '../hooks/useReportMode'
import { useProductSelection } from '../hooks/useProductSelection'
import StitchWorkspaceShell from '../components/workspace/StitchWorkspaceShell'
import HistoryAnalysisSection from '../components/results/HistoryAnalysisSection'
import HistoryOptimizationSection from '../components/results/HistoryOptimizationSection'
import StitchProductLabPanel from '../components/productLab/StitchProductLabPanel'
import { useWorkspaceState } from '../hooks/useWorkspaceState'
import { requestAnalyzeThreeProducts } from '../api/edgeFunctionsClient'
import { resolveProductImageFetchUrl, resolveProductImageDisplayUrl } from '../utils/productImageUrl'
import { captureWorkshopReportImages } from '../utils/workshopReportCapture.jsx'
import {
  createOptimizedReanalyzedVersion,
  createOptimizedVersion,
  createOriginalVersion,
} from '../utils/productVersion'
import { formatDate } from '../utils/formatDate'
import { getUsageLedger } from '../utils/apiUsageLedger'
import { requestWalletDebit } from '../api/walletEdgeClient'
import { fetchWalletBalanceSafe, fetchWalletTransactionsSafe } from '../services/walletService'
import { estimateCostFromUsage, getStepDefaultEstimate } from '../utils/billingPricing'
import '../report-print.css'
import '../styles/appShell.css'
import '../styles/stitchWorkspaceInner.css'

const POINTS_PER_API_YUAN = 150
/** 生产环境默认走真实扣费；本地开发默认无限积分，可在 .env 设 VITE_DEV_UNLIMITED_POINTS=false 测扣费 */
const DEV_UNLIMITED_POINTS = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_UNLIMITED_POINTS !== 'false' && import.meta.env.VITE_DEV_UNLIMITED_POINTS !== '0'
  : import.meta.env.VITE_DEV_UNLIMITED_POINTS === 'true'

export default function WorkspacePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { openAuthModal } = useOutletContext()

  const userId = user?.id ?? null
  const [errorText, setErrorText] = useState('')
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false)
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [optimizingAll, setOptimizingAll] = useState(false)
  const [optimizeProgress, setOptimizeProgress] = useState(null)
  const [analyzeProgress, setAnalyzeProgress] = useState(null)
  const [reanalyzingOptimized, setReanalyzingOptimized] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [generateReportProgress, setGenerateReportProgress] = useState(0)
  const [generateReportStatus, setGenerateReportStatus] = useState('idle') // idle | running | success | error
  const [workshopGeneratedReports, setWorkshopGeneratedReports] = useState([])
  const [reanalysisResult, setReanalysisResult] = useState(null)
  const [productVersions, setProductVersions] = useState([])
  const [lastReanalysisRunKey, setLastReanalysisRunKey] = useState(0)
  const walletKey = useMemo(
    () => (userId ? `walletBalance.v1.${userId}` : 'walletBalance.v1.guest'),
    [userId],
  )
  const walletProcessedCostIdsKey = useMemo(
    () => (userId ? `walletProcessedCostIds.v1.${userId}` : 'walletProcessedCostIds.v1.guest'),
    [userId],
  )
  const [walletBalance, setWalletBalance] = useState(0)
  const [usageLedger, setUsageLedger] = useState([])
  const [processedCostIdSet, setProcessedCostIdSet] = useState(() => new Set())
  const [walletRemoteEnabled, setWalletRemoteEnabled] = useState(false)
  const [walletSyncing, setWalletSyncing] = useState(false)
  const [walletTransactions, setWalletTransactions] = useState([])
  const [walletTxLoading, setWalletTxLoading] = useState(false)
  const [usageCostFilter, setUsageCostFilter] = useState('all') // all | actual | estimated
  const [usageTimeRange, setUsageTimeRange] = useState('month') // today | month | all | custom
  const [usageDateStart, setUsageDateStart] = useState('')
  const [usageDateEnd, setUsageDateEnd] = useState('')
  const [trendDays, setTrendDays] = useState(7) // 7 | 30
  const [labHistoryCatalog, setLabHistoryCatalog] = useState(() => {
    try {
      const raw = window.localStorage.getItem('labHistoryCatalog.v1')
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const comparison = useComparisonHistory(setErrorText, userId)
  const optHistory = useOptimizationHistoryList(setErrorText, userId)
  const selection = useProductSelection(
    setErrorText,
    comparison.refresh,
    optHistory.refresh,
    userId,
  )
  const report = useReportMode({
    analysisResult: selection.analysisResult,
    sandboxResult: null,
    optimizationResult: selection.optimizationResult,
  })
  const workspace = useWorkspaceState()

  const workspaceGreetingName = useMemo(
    () => user?.user_metadata?.name || user?.email?.split('@')[0] || '用户',
    [user],
  )

  const userAvatarUrl = user?.user_metadata?.avatar_url || null
  const usageTotalCost = useMemo(
    () =>
      (usageLedger || []).reduce((acc, item) => {
        const c = Number(item?.cost)
        if (Number.isFinite(c)) return acc + c
        const estimated = estimateCostFromUsage(item?.step, item?.usage)
        return acc + (Number.isFinite(estimated) ? estimated : 0)
      }, 0),
    [usageLedger],
  )
  const usageKnownCostCount = useMemo(
    () =>
      (usageLedger || []).reduce((acc, item) => {
        const c = Number(item?.cost)
        return Number.isFinite(c) ? acc + 1 : acc
      }, 0),
    [usageLedger],
  )
  const usageMissingCostCount = useMemo(
    () =>
      (usageLedger || []).reduce((acc, item) => {
        const c = Number(item?.cost)
        return Number.isFinite(c) ? acc : acc + 1
      }, 0),
    [usageLedger],
  )
  const usageRowsWithCostInfo = useMemo(
    () =>
      (usageLedger || []).map((row) => {
        const actual = Number(row?.cost)
        const hasActualCost = Number.isFinite(actual)
        const estimated = estimateCostFromUsage(row?.step, row?.usage)
        return {
          ...row,
          hasActualCost,
          displayCost: hasActualCost ? actual : estimated,
          costSource: hasActualCost ? 'actual' : 'estimated',
        }
      }),
    [usageLedger],
  )
  const pointsConsumptionRecords = useMemo(() => {
    const stepLabel = (step) => {
      if (step === 'analyze-product') return '产品分析'
      if (step === 'optimize-product') return '产品优化'
      return ''
    }
    return (usageRowsWithCostInfo || [])
      .map((row) => ({
        id: row.id,
        label: stepLabel(row.step),
        points: Math.max(1, Math.ceil((Number(row.displayCost) || 0) * POINTS_PER_API_YUAN)),
        time: row.timestamp || '',
      }))
      .filter((x) => !!x.label && Number.isFinite(x.points) && x.points > 0)
      .slice(-20)
      .reverse()
  }, [usageRowsWithCostInfo])
  const rangeFilteredUsageRows = useMemo(() => {
    const rows = usageRowsWithCostInfo || []
    if (usageTimeRange === 'all') return rows

    const now = new Date()
    let start = null
    let end = null
    if (usageTimeRange === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (usageTimeRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else if (usageTimeRange === 'custom') {
      if (!usageDateStart && !usageDateEnd) return rows
      start = usageDateStart ? new Date(`${usageDateStart}T00:00:00`) : null
      end = usageDateEnd ? new Date(`${usageDateEnd}T23:59:59.999`) : null
    }
    return rows.filter((row) => {
      if (!row?.timestamp) return false
      const d = new Date(row.timestamp)
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })
  }, [usageRowsWithCostInfo, usageTimeRange, usageDateStart, usageDateEnd])
  const filteredUsageRows = useMemo(() => {
    if (usageCostFilter === 'actual') return rangeFilteredUsageRows.filter((x) => x.costSource === 'actual')
    if (usageCostFilter === 'estimated') return rangeFilteredUsageRows.filter((x) => x.costSource === 'estimated')
    return rangeFilteredUsageRows
  }, [rangeFilteredUsageRows, usageCostFilter])
  const recentUsageRows = useMemo(() => filteredUsageRows.slice(-8).reverse(), [filteredUsageRows])
  const usagePeriodSummary = useMemo(() => {
    const rows = rangeFilteredUsageRows
    const actualCost = rows.reduce((acc, row) => (row.costSource === 'actual' ? acc + row.displayCost : acc), 0)
    const estimatedCost = rows.reduce(
      (acc, row) => (row.costSource === 'estimated' ? acc + row.displayCost : acc),
      0,
    )
    return {
      count: rows.length,
      actualCost,
      estimatedCost,
      totalCost: actualCost + estimatedCost,
    }
  }, [rangeFilteredUsageRows])
  const stepCostSummary = useMemo(() => {
    const group = new Map()
    const normalizeStep = (step) => {
      const s = String(step || '').trim()
      if (s === 'analyze-product') return '分析'
      if (s === 'optimize-product') return '优化'
      if (s === 'fill-product-from-image') return '识图填表'
      if (s === 'simulate-market') return '市场模拟'
      if (s === 'generate-workshop-report') return '生成报告'
      return s || '其他'
    }
    for (const row of filteredUsageRows || []) {
      const key = normalizeStep(row?.step)
      const cost = Number(row?.displayCost) || 0
      const prev = group.get(key) || 0
      group.set(key, prev + cost)
    }
    const rows = Array.from(group.entries())
      .map(([step, cost]) => ({ step, cost }))
      .sort((a, b) => b.cost - a.cost)
    const total = rows.reduce((acc, r) => acc + r.cost, 0)
    return { rows, total }
  }, [filteredUsageRows])
  const dailyTrendRows = useMemo(() => {
    const days = trendDays === 30 ? 30 : 7
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1), 0, 0, 0, 0)
    const buckets = new Map()
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      buckets.set(key, 0)
    }
    for (const row of filteredUsageRows || []) {
      if (!row?.timestamp) continue
      const d = new Date(row.timestamp)
      if (d < start) continue
      const key = d.toISOString().slice(0, 10)
      if (!buckets.has(key)) continue
      const cost = Number(row.displayCost) || 0
      buckets.set(key, (buckets.get(key) || 0) + cost)
    }
    const rows = Array.from(buckets.entries()).map(([date, cost]) => ({ date, cost }))
    const maxCost = rows.reduce((m, r) => Math.max(m, r.cost), 0)
    return { rows, maxCost }
  }, [filteredUsageRows, trendDays])

  function exportUsageCsv() {
    const rows = [...(filteredUsageRows || [])].reverse()
    if (!rows.length) return
    const escapeCsv = (v) => {
      const s = v == null ? '' : String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }
    const header = ['time', 'step', 'source', 'tokens_total', 'cost', 'http_status', 'endpoint']
    const body = rows.map((row) => [
      row.timestamp ? new Date(row.timestamp).toISOString() : '',
      row.step || '',
      row.costSource === 'actual' ? 'actual' : 'estimated',
      Number.isFinite(Number(row?.usage?.totalTokens)) ? Number(row.usage.totalTokens) : '',
      Number.isFinite(Number(row.displayCost)) ? Number(row.displayCost).toFixed(6) : '',
      Number.isFinite(Number(row?.httpStatus)) ? Number(row.httpStatus) : '',
      row.endpoint || '',
    ])
    const csv = [header, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    a.href = url
    a.download = `usage-bill-${usageCostFilter}-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  const averageKnownCostPerCall = useMemo(() => {
    if (!usageKnownCostCount) return 0
    const knownTotal = (usageLedger || []).reduce((acc, item) => {
      const c = Number(item?.cost)
      return Number.isFinite(c) ? acc + c : acc
    }, 0)
    return knownTotal / usageKnownCostCount
  }, [usageKnownCostCount, usageLedger])
  const activeAnalyzeCount = (selection.analyzableProductIndexes || []).length || 1
  const estimatedAnalyzeCost =
    averageKnownCostPerCall > 0
      ? averageKnownCostPerCall
      : getStepDefaultEstimate('analyze-product')
  const estimatedOptimizeCost =
    averageKnownCostPerCall > 0
      ? averageKnownCostPerCall * Math.max(1, activeAnalyzeCount)
      : getStepDefaultEstimate('optimize-product') * Math.max(1, activeAnalyzeCount)
  const estimatedAnalyzePoints = Math.max(1, Math.ceil(estimatedAnalyzeCost * POINTS_PER_API_YUAN))
  const estimatedOptimizePoints = Math.max(1, Math.ceil(estimatedOptimizeCost * POINTS_PER_API_YUAN))
  const canAffordAnalyze = DEV_UNLIMITED_POINTS ? true : walletBalance >= estimatedAnalyzePoints
  const canAffordOptimize = DEV_UNLIMITED_POINTS ? true : walletBalance >= estimatedOptimizePoints

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(walletKey)
      const parsed = raw == null ? 0 : Number(raw)
      setWalletBalance(Number.isFinite(parsed) ? parsed : 0)
    } catch {
      setWalletBalance(0)
    }
  }, [walletKey])

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      setWalletRemoteEnabled(false)
      return () => {
        cancelled = true
      }
    }
    setWalletSyncing(true)
    fetchWalletBalanceSafe(userId)
      .then((res) => {
        if (cancelled) return
        if (res?.supported) {
          setWalletRemoteEnabled(true)
          setWalletBalance(Number(res.balance) || 0)
        } else {
          setWalletRemoteEnabled(false)
        }
      })
      .catch(() => {
        if (!cancelled) setWalletRemoteEnabled(false)
      })
      .finally(() => {
        if (!cancelled) setWalletSyncing(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    if (!walletRemoteEnabled || !userId) {
      setWalletTransactions([])
      return () => {
        cancelled = true
      }
    }
    setWalletTxLoading(true)
    fetchWalletTransactionsSafe(userId, 20)
      .then((res) => {
        if (cancelled) return
        setWalletTransactions(Array.isArray(res?.rows) ? res.rows : [])
      })
      .catch(() => {
        if (!cancelled) setWalletTransactions([])
      })
      .finally(() => {
        if (!cancelled) setWalletTxLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [walletRemoteEnabled, userId, walletBalance])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(walletProcessedCostIdsKey)
      const parsed = raw ? JSON.parse(raw) : []
      const asSet = new Set(Array.isArray(parsed) ? parsed.map((x) => String(x)) : [])
      setProcessedCostIdSet(asSet)
    } catch {
      setProcessedCostIdSet(new Set())
    }
  }, [walletProcessedCostIdsKey])

  useEffect(() => {
    const refreshLedger = () => {
      const list = getUsageLedger()
      setUsageLedger(Array.isArray(list) ? list : [])
    }
    refreshLedger()
    const onUpdated = () => refreshLedger()
    window.addEventListener('poloapi-usage-ledger-updated', onUpdated)
    return () => window.removeEventListener('poloapi-usage-ledger-updated', onUpdated)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(walletKey, String(walletBalance))
    } catch {
      // ignore
    }
  }, [walletKey, walletBalance])

  useEffect(() => {
    let cancelled = false
    const pending = (usageLedger || []).filter((item) => {
      const id = String(item?.id || '')
      const actual = Number(item?.cost)
      const estimated = estimateCostFromUsage(item?.step, item?.usage)
      const c = Number.isFinite(actual) ? actual : estimated
      return !!id && !processedCostIdSet.has(id) && Number.isFinite(c) && c > 0
    })
    if (!pending.length) return () => { cancelled = true }

    const run = async () => {
      const next = new Set(processedCostIdSet)
      let localDelta = 0
      let remoteBalance = walletBalance

      for (const item of pending) {
        if (cancelled) return
        const id = String(item.id)
        const actualCost = Number(item.cost)
        const isActualCost = Number.isFinite(actualCost) && actualCost >= 0
        const c = isActualCost ? actualCost : estimateCostFromUsage(item?.step, item?.usage)
        if (!Number.isFinite(c) || c <= 0) continue
        const pointsToCharge = Math.max(1, Math.ceil(c * POINTS_PER_API_YUAN))
        if (DEV_UNLIMITED_POINTS) {
          next.add(id)
          continue
        }
        if (walletRemoteEnabled && userId) {
          const description = `API 调用扣费${isActualCost ? '' : '（估算）'} · ${item.step || 'unknown'}（${pointsToCharge}积分）`
          const meta = {
            step: item.step || '',
            endpoint: item.endpoint || '',
            httpStatus: item.httpStatus || 0,
            usage: item.usage || null,
            costSource: isActualCost ? 'actual' : 'estimated',
            chargedPoints: pointsToCharge,
            ledgerId: id,
          }
          try {
            const edgeRes = await requestWalletDebit({
              amountPoints: pointsToCharge,
              businessType: 'api_usage',
              businessId: id,
              idempotencyKey: id,
              description,
              meta,
            })
            remoteBalance = Number(edgeRes.balance_points) || remoteBalance
            next.add(id)
          } catch (e) {
            if (e?.code === 'INSUFFICIENT_POINTS') {
              setErrorText(
                '积分不足，无法完成扣费。若已产生 API 调用，请充值后系统将重试未入账的消耗记录。',
              )
              break
            }
            setErrorText(
              e?.message || '扣费失败（仅服务端可扣积分）。请稍后重试或检查 wallet-debit 是否已部署。',
            )
            break
          }
        } else {
          localDelta += pointsToCharge
          next.add(id)
        }
      }

      if (cancelled) return
      if (walletRemoteEnabled && userId) {
        setWalletBalance(remoteBalance)
      } else if (localDelta > 0) {
        setWalletBalance((prev) => Math.max(0, prev - localDelta))
      }
      setProcessedCostIdSet(next)
      try {
        window.localStorage.setItem(walletProcessedCostIdsKey, JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [
    usageLedger,
    processedCostIdSet,
    walletProcessedCostIdsKey,
    walletRemoteEnabled,
    userId,
    walletBalance,
  ])

  useEffect(() => {
    if (loading) return
    if (!user) {
      openAuthModal('signin', { redirectTo: '/workspace' })
      navigate('/', { replace: true })
    }
  }, [loading, user, navigate, openAuthModal])

  useEffect(() => {
    try {
      const userKey = userId ? `generatedWorkshopReports.v1.${userId}` : 'generatedWorkshopReports.v1.guest'
      const emailKey = user?.email ? `generatedWorkshopReports.v1.${String(user.email).toLowerCase()}` : ''
      const legacyKey = 'generatedWorkshopReports.v1'
      const guestKey = 'generatedWorkshopReports.v1.guest'
      const candidateKeys = [userKey, emailKey, guestKey, legacyKey].filter(Boolean)

      const parsedByKey = candidateKeys.map((k) => {
        try {
          const raw = window.localStorage.getItem(k)
          const parsed = raw ? JSON.parse(raw) : []
          const list = Array.isArray(parsed) ? parsed : []
          return { key: k, list }
        } catch {
          return { key: k, list: [] }
        }
      })

      // 更强恢复：扫描所有同前缀 key（历史版本/不同命名）里记录最多的一份
      const scanned = []
      try {
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const k = window.localStorage.key(i)
          if (!k) continue
          if (!String(k).startsWith('generatedWorkshopReports')) continue
          if (candidateKeys.includes(k)) continue
          try {
            const raw = window.localStorage.getItem(k)
            const parsed = raw ? JSON.parse(raw) : []
            const list = Array.isArray(parsed) ? parsed : []
            if (list.length) scanned.push({ key: k, list })
          } catch {
            // ignore parse
          }
        }
      } catch {
        // ignore scan
      }

      // 优先当前 userKey；如果为空，回收历史 key 中记录最多的一份。
      const current = parsedByKey.find((x) => x.key === userKey)?.list || []
      const bestLegacy = [...parsedByKey, ...scanned].reduce(
        (best, row) => (row.list.length > best.list.length ? row : best),
        { key: '', list: [] },
      )

      const finalList = current.length ? current : bestLegacy.list

      if (userId && finalList.length && userKey !== bestLegacy.key) {
        // 将找到的历史记录迁移到当前账号 key，后续读取稳定一致
        try {
          window.localStorage.setItem(userKey, JSON.stringify(finalList))
        } catch {
          // ignore quota
        }
      }

      setWorkshopGeneratedReports(finalList)
    } catch {
      setWorkshopGeneratedReports([])
    }
  }, [userId, user?.email])

  useEffect(() => {
    const handler = () => {
      // 触发上面依赖 userId 的恢复逻辑：通过重新设置同值来让 effect 再跑一次不可靠，
      // 这里直接读取一次并 set。
      try {
        const userKey = userId ? `generatedWorkshopReports.v1.${userId}` : 'generatedWorkshopReports.v1.guest'
        const keys = []
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const k = window.localStorage.key(i)
          if (k && String(k).startsWith('generatedWorkshopReports')) keys.push(k)
        }
        let best = []
        for (const k of keys) {
          try {
            const raw = window.localStorage.getItem(k)
            const parsed = raw ? JSON.parse(raw) : []
            const list = Array.isArray(parsed) ? parsed : []
            if (list.length > best.length) best = list
          } catch {
            // ignore
          }
        }
        if (best.length) {
          try {
            window.localStorage.setItem(userKey, JSON.stringify(best))
          } catch {
            // ignore
          }
          setWorkshopGeneratedReports(best)
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('workshop-reports-local-restore', handler)
    return () => window.removeEventListener('workshop-reports-local-restore', handler)
  }, [userId])

  useEffect(() => {
    if (selection.analyzing) {
      workspace.setProductLabTaskStatus('running')
      return
    }
    if (selection.analysisResult) {
      workspace.setProductLabTaskStatus('success')
    }
  }, [selection.analyzing, selection.analysisResult, workspace])

  useEffect(() => {
    // 仅在“开始分析成功后”把当前上传的产品录入到加号弹窗目录中
    if (!selection.analysisResult?.products?.length) return

    const requiredKeys = [
      'name',
      'price',
      'cost',
      'type',
      'style',
      'variants',
      'craft',
      'material',
      'target_audience',
      'selling_points',
    ]

    const isCompleteForCatalog = (p) => {
      if (!p?.image_url) return false
      for (const k of requiredKeys) {
        const v = p?.[k]
        if (v == null) return false
        const s = typeof v === 'string' ? v.trim() : String(v).trim()
        if (!s) return false
      }
      return true
    }

    const now = Date.now()
    const items = (selection.products || [])
      .map((p, idx) => ({
        id: `analyzed-${now}-${idx}`,
        createdAt: new Date().toISOString(),
        source: 'analysis',
        productIndex: idx,
        product: { ...p },
      }))
      .filter((x) => isCompleteForCatalog(x.product))

    if (!items.length) return

    setLabHistoryCatalog((prev) => {
      // 简单去重：同名+同主图视为同一个（保留最新）
      const keyOf = (it) => `${it?.product?.name || ''}::${it?.product?.image_url || ''}`
      const map = new Map()
      ;(prev || []).forEach((it) => map.set(keyOf(it), it))
      items.forEach((it) => map.set(keyOf(it), it))
      const next = Array.from(map.values()).slice(-60)
      try {
        window.localStorage.setItem('labHistoryCatalog.v1', JSON.stringify(next))
      } catch {
        // ignore quota
      }
      return next
    })
  }, [selection.analysisResult, selection.products])

  function removeLabHistoryItem(id) {
    if (id == null) return
    const sid = String(id)
    setLabHistoryCatalog((prev) => {
      const next = (prev || []).filter((x) => String(x?.id) !== sid)
      try {
        window.localStorage.setItem('labHistoryCatalog.v1', JSON.stringify(next))
      } catch {
        // ignore quota
      }
      return next
    })
  }

  useEffect(() => {
    setProductVersions((prev) => {
      const others = prev.filter((v) => v.versionType !== 'original')
      const originals = selection.products
        .map((p, idx) =>
          createOriginalVersion(
            p,
            idx,
            selection.analysisResult?.products?.find((row) => row.name === p.name) || null,
          ),
        )
        .filter((v) => v.snapshotData.name || v.snapshotData.image_url)
      return [...others, ...originals]
    })
  }, [selection.products, selection.analysisResult])

  useEffect(() => {
    if (!selection.optimizationResult) return
    setProductVersions((prev) => {
      const idx = selection.optimizationResult?.productIndex
      const base =
        typeof idx === 'number'
          ? prev.find((v) => v.versionType === 'original' && v.productId === `product-${idx + 1}`)
          : prev.find(
              (v) =>
                v.versionType === 'original' &&
                v.snapshotData?.name === selection.optimizationResult.productName,
            )
      const optimizeCount = prev.filter((v) => v.versionType === 'optimized').length + 1
      const next = createOptimizedVersion(base, selection.optimizationResult, optimizeCount)
      return [...prev, next]
    })
    workspace.setProductLabTaskStatus('success')
  }, [selection.optimizationResult, workspace])

  useEffect(() => {
    if (!reanalysisResult?.products?.length) return
    if (!lastReanalysisRunKey) return
    setProductVersions((prev) => {
      const optimizeVersions = prev.filter((v) => v.versionType === 'optimized')
      const appended = reanalysisResult.products
        .map((item, idx) => {
          const base = optimizeVersions.find((v) => v.snapshotData?.name === item.name) || optimizeVersions[idx]
          return createOptimizedReanalyzedVersion(base, item, idx + 1)
        })
      return [...prev, ...appended]
    })
  }, [reanalysisResult, lastReanalysisRunKey])

  useEffect(() => {
    if (errorText) {
      workspace.setProductLabTaskStatus('error')
    }
  }, [errorText, workspace])

  async function handleAnalyze() {
    if (!canAffordAnalyze) {
      setErrorText(`积分不足，预计本次分析消耗约 ${estimatedAnalyzePoints} 积分，请先充值`)
      workspace.setProductLabTaskStatus('error')
      return
    }
    workspace.setProductLabTaskStatus('running')
    setAnalyzeProgress({ done: 0, total: 100, label: '准备中...' })
    try {
      await selection.handleAnalyzeThreeProducts((p) => {
        if (p) setAnalyzeProgress(p)
      })
    } finally {
      setAnalyzeProgress(null)
    }
  }

  async function handleOptimizeAll() {
    if (!selection.analysisResult?.products?.length) {
      setErrorText('请先完成分析，再执行三产品优化')
      workspace.setProductLabTaskStatus('error')
      return
    }
    if (!canAffordOptimize) {
      setErrorText(`积分不足，预计本次优化消耗约 ${estimatedOptimizePoints} 积分，请先充值`)
      workspace.setProductLabTaskStatus('error')
      return
    }
    workspace.setProductLabTaskStatus('running')
    setOptimizingAll(true)
    const bestOfN = selection.bestOfN || 1
    const activeIndexes = selection.analyzableProductIndexes || []
    const totalSteps = activeIndexes.length * bestOfN * 2
    let done = 0
    setOptimizeProgress({ done: 0, total: totalSteps, label: '准备中...' })
    try {
      for (let cursor = 0; cursor < activeIndexes.length; cursor++) {
        const i = activeIndexes[cursor]
        const p = selection.products?.[i]
        const item =
          selection.analysisResult.products?.find((r) => r.name === p.name) ||
          selection.analysisResult.products?.[i] ||
          null
        if (!item) continue
        // eslint-disable-next-line no-await-in-loop
        await selection.handleOptimizeProduct(item, i, (evt) => {
          done += 1
          const phaseLabel = evt?.phase === 'score' ? '评分中' : '生成中'
          const cand = typeof evt?.candidateIndex === 'number' ? evt.candidateIndex + 1 : 0
          const candTotal = evt?.candidateCount || bestOfN
          setOptimizeProgress({
            done,
            total: totalSteps,
            label: `产品 ${cursor + 1}/${activeIndexes.length} · 候选 ${cand}/${candTotal} ${phaseLabel}...`,
          })
        })
      }
      workspace.setProductLabTaskStatus('success')
    } finally {
      setOptimizingAll(false)
      setOptimizeProgress(null)
    }
  }

  async function handleReanalyzeOptimized() {
    const latestOptimized = productVersions.filter((v) => v.versionType === 'optimized').slice(-3)
    if (latestOptimized.length < 3) {
      setErrorText('请先生成至少 3 个优化版本，再执行优化后分析')
      workspace.setProductLabTaskStatus('error')
      return
    }
    workspace.setProductLabTaskStatus('running')
    setReanalyzingOptimized(true)
    try {
      const uploadedProducts = await Promise.all(
        latestOptimized.map(async (v) => ({
          name: v.snapshotData.name,
          price: Number(v.snapshotData.price) || 0,
          material: v.snapshotData.material,
          style: v.snapshotData.style,
          target_audience: v.snapshotData.target_audience,
          selling_points: v.snapshotData.selling_points,
          image_url: await resolveProductImageFetchUrl(v.snapshotData.image_url),
        })),
      )
      const aiResult = await requestAnalyzeThreeProducts(uploadedProducts)
      setReanalysisResult(aiResult || null)
      setLastReanalysisRunKey(Date.now())
      workspace.setProductLabTaskStatus('success')
    } catch (err) {
      setErrorText(err?.message || '优化后再分析失败')
      workspace.setProductLabTaskStatus('error')
    } finally {
      setReanalyzingOptimized(false)
    }
  }

  function getLatestOptimizedForSlot(index) {
    const pid = `product-${index + 1}`
    const list = (productVersions || []).filter(
      (v) => v.versionType === 'optimized' && v.productId === pid,
    )
    return list.length ? list[list.length - 1] : null
  }

  async function handleGenerateReport() {
    if (generatingReport) return
    if (!selection.analysisResult?.products?.length) {
      setErrorText('请先完成产品分析后再生成报告')
      return
    }
    setGeneratingReport(true)
    setGenerateReportStatus('running')
    setGenerateReportProgress(0)

    const storageKey = userId ? `generatedWorkshopReports.v1.${userId}` : 'generatedWorkshopReports.v1.guest'

    try {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([]))
      } catch {
        // ignore
      }
      setWorkshopGeneratedReports([])

      const products = selection.products || []
      const activeIndexes = selection.analyzableProductIndexes || []
      const productThumbUrls = await Promise.all(
        [0, 1, 2].map(async (i) => {
          const u = products[i]?.image_url
          if (!u) return ''
          if (String(u).startsWith('http://') || String(u).startsWith('https://')) return String(u)
          const url = await resolveProductImageDisplayUrl(u)
          return url || ''
        }),
      )

      const hasOptimization = activeIndexes.some((i) => !!getLatestOptimizedForSlot(i))
      const optimizationPages = hasOptimization
        ? activeIndexes.map((i) => {
            const v = getLatestOptimizedForSlot(i)
            const ord = ['一', '二', '三'][i]
            return {
              productOrdinalLabel: `产品${ord}`,
              productName: products[i]?.name || '',
              originalPrice: products[i]?.price ?? '',
              optimizationResult: v?.optimizationResult || {},
              thumbUrl: productThumbUrls[i] || '',
              title: `优化方案 · 产品${ord}`,
              productIndex: i,
            }
          })
        : []

      const captured = await captureWorkshopReportImages({
        analysisResult: selection.analysisResult,
        inputProducts: products,
        productThumbUrls,
        optimizationPages,
        onProgress: (done, total) => {
          setGenerateReportProgress(total ? Math.round((done / total) * 100) : 0)
        },
      })

      const baseTs = Date.now()
      const batchId = `batch-${baseTs}`
      const pageCount = captured.length
      const records = captured.map((c, idx) => {
        const pi = c.productIndex
        const thumbSource =
          c.kind === 'analysis' ? products[0]?.image_url : typeof pi === 'number' ? products[pi]?.image_url : ''
        return {
          id: `${batchId}-p${idx}`,
          batchId,
          pageIndex: idx,
          pageCount,
          type: 'generated-image',
          kind: c.kind,
          title: c.title || '报告',
          createdAt: new Date().toISOString(),
          image_url: thumbSource || '',
          imageDataUrl: c.dataUrl,
          payload: { kind: c.kind, productIndex: pi, pageIndex: idx, pageCount, batchId },
        }
      })

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(records))
      } catch {
        setErrorText('报告图片过大，无法完整保存到本地，请尝试缩小图片或稍后重试')
      }
      setWorkshopGeneratedReports(records)
      setGenerateReportProgress(100)
      setGenerateReportStatus('success')
    } catch (e) {
      setErrorText(e?.message || '生成报告失败')
      setGenerateReportStatus('error')
    } finally {
      setGeneratingReport(false)
    }
  }

  const labBridge = useMemo(
    () => ({
      products: selection.products,
      isAiFillLoading: selection.isAiFillLoading,
      analyzing: selection.analyzing,
      analysisResult: selection.analysisResult,
      optimizingName: selection.optimizingName,
      optimizationResult: selection.optimizationResult,
      updateProduct: selection.updateProduct,
      handleImageSelect: selection.handleImageSelect,
      handleAiFillFromImage: selection.handleAiFillFromImage,
      handleAnalyzeThreeProducts: selection.handleAnalyzeThreeProducts,
      handleOptimizeProduct: selection.handleOptimizeProduct,
      analyzableProductIndexes: selection.analyzableProductIndexes,
    }),
    [selection],
  )
  // 产品图优化功能暂时下线：相关候选列表与发送回调不再生成/透传

  if (loading || !user) {
    return (
      <div className="app-auth-loading">
        <p>{loading ? '载入中…' : '请先登录…'}</p>
      </div>
    )
  }

  if (report.reportMode) {
    return (
      <ReportView
        analysisResult={selection.analysisResult}
        sandboxResult={null}
        optimizationResult={selection.optimizationResult}
        onClose={() => report.setReportMode(false)}
        onPrint={() => {
          try {
            window.print()
          } catch (err) {
            setErrorText(err?.message || '打印失败')
          }
        }}
      />
    )
  }

  return (
    <StitchWorkspaceShell
      greetingName={workspaceGreetingName}
      userId={userId}
      activeWorkspace="productLab"
      onSelectProductLab={() => {}}
      onOpenHistory={() => setShowHistoryDrawer((v) => !v)}
      historyOpen={showHistoryDrawer}
      canOpenReport={report.canOpenReport}
      onOpenReport={() => report.setReportMode(true)}
      onGenerateReport={workspace.activeWorkspace === 'productLab' ? handleGenerateReport : undefined}
      generatingReport={generatingReport}
      canGenerateReport={!!selection.analysisResult?.products?.length}
      generateReportProgress={generateReportProgress}
      generateReportStatus={generateReportStatus}
      workshopGeneratedReports={workshopGeneratedReports}
      userAvatarUrl={userAvatarUrl}
      accountBalance={DEV_UNLIMITED_POINTS ? null : walletBalance}
      unlimitedPoints={DEV_UNLIMITED_POINTS}
      pointsConsumptionRecords={pointsConsumptionRecords}
    >
      <main className="workspace-main">
        {errorText && (
          <div className="app-error-banner" role="alert" style={{ marginTop: 18 }}>
            <h3 className="app-error-banner__title">错误信息</h3>
            {errorText}
          </div>
        )}

        <StitchProductLabPanel
          bridge={labBridge}
          reanalysisResult={reanalysisResult}
          labVersions={productVersions}
          pipelineRunning={pipelineRunning}
          optimizingAll={optimizingAll}
          reanalyzingOptimized={reanalyzingOptimized}
          optimizeProgress={optimizeProgress}
          analyzeProgress={analyzeProgress}
          labHistoryCatalog={labHistoryCatalog}
          onRemoveLabHistoryItem={removeLabHistoryItem}
          onAnalyze={handleAnalyze}
          onOptimizeAll={handleOptimizeAll}
          onReanalyzeOptimized={handleReanalyzeOptimized}
          onSwitchWorkspace={workspace.setActiveWorkspace}
          activeWorkspace={workspace.activeWorkspace}
          canAffordAnalyze={canAffordAnalyze}
          canAffordOptimize={canAffordOptimize}
          estimatedAnalyzePoints={estimatedAnalyzePoints}
          estimatedOptimizePoints={estimatedOptimizePoints}
        />
      </main>

    </StitchWorkspaceShell>
  )
}
