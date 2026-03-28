import { useCallback, useEffect, useState } from 'react'
import { fetchMergedComparisonHistory } from '../services/productDatabase'

export function useComparisonHistory(setErrorText, userId) {
  const [historyRecords, setHistoryRecords] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setHistoryRecords([])
      setHistoryLoading(false)
      return
    }
    setHistoryLoading(true)
    try {
      const merged = await fetchMergedComparisonHistory(userId)
      setHistoryRecords(merged)
    } catch (err) {
      setErrorText(err.message || '读取历史记录失败')
    } finally {
      setHistoryLoading(false)
    }
  }, [setErrorText, userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggleExpanded = useCallback((id) => {
    setExpandedHistoryId((prev) => (prev === id ? null : id))
  }, [])

  return {
    historyRecords,
    historyLoading,
    expandedHistoryId,
    refresh,
    toggleExpanded,
  }
}
