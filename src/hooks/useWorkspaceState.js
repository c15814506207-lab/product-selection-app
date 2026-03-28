import { useMemo, useState } from 'react'

export function useWorkspaceState() {
  const [activeWorkspace, setActiveWorkspace] = useState('productLab')
  const [productLabTaskStatus, setProductLabTaskStatus] = useState('idle')
  const [marketSandboxTaskStatus, setMarketSandboxTaskStatus] = useState('idle')

  const topTaskState = useMemo(
    () => ({
      productLabTaskStatus,
      marketSandboxTaskStatus,
    }),
    [productLabTaskStatus, marketSandboxTaskStatus],
  )

  return {
    activeWorkspace,
    setActiveWorkspace,
    productLabTaskStatus,
    setProductLabTaskStatus,
    marketSandboxTaskStatus,
    setMarketSandboxTaskStatus,
    topTaskState,
  }
}
