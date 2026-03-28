import { useMemo } from 'react'

function lineageKey(v) {
  return v?.lineageId || v?.rootProductId || v?.productId || 'unknown-lineage'
}

/**
 * @param {any[]} versions
 * @returns {Record<string, any[]>}
 */
export function groupVersionsByLineage(versions) {
  return (versions || []).reduce((acc, v) => {
    const k = lineageKey(v)
    if (!acc[k]) acc[k] = []
    acc[k].push(v)
    return acc
  }, {})
}

export function useVersionLineage(versions) {
  return useMemo(() => {
    const byLineage = groupVersionsByLineage(versions)
    const chains = Object.entries(byLineage).map(([lineageId, chain]) => ({
      lineageId,
      versions: [...chain].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    }))
    return { byLineage, chains }
  }, [versions])
}
