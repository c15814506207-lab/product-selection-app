import { useMemo, useState } from 'react'

export function useReportMode({ analysisResult, sandboxResult, optimizationResult }) {
  const [reportMode, setReportMode] = useState(false)
  const canOpenReport = useMemo(
    () => !!(analysisResult || sandboxResult || optimizationResult),
    [analysisResult, sandboxResult, optimizationResult],
  )
  return { reportMode, setReportMode, canOpenReport }
}
