import { useCallback, useEffect, useState } from 'react'
import { fetchOptimizationHistoryRows } from '../services/productDatabase'

export function useOptimizationHistoryList(setErrorText, userId) {
  const [optimizationHistory, setOptimizationHistory] = useState([])
  const [optimizationHistoryLoading, setOptimizationHistoryLoading] = useState(false)
  const [expandedOptimizationId, setExpandedOptimizationId] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setOptimizationHistory([])
      setOptimizationHistoryLoading(false)
      return
    }
    setOptimizationHistoryLoading(true)
    try {
      const rows = await fetchOptimizationHistoryRows(userId)
      setOptimizationHistory(rows)
    } catch (err) {
      setErrorText(err.message || '读取优化记录失败')
    } finally {
      setOptimizationHistoryLoading(false)
    }
  }, [setErrorText, userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggleExpanded = useCallback((id) => {
    setExpandedOptimizationId((prev) => (prev === id ? null : id))
  }, [])

  return {
    optimizationHistory,
    optimizationHistoryLoading,
    expandedOptimizationId,
    refresh,
    toggleExpanded,
  }
}
