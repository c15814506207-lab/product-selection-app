export {
  REQUIRED_SIM_FIELDS as REQUIRED_MARKET_SANDBOX_FIELDS,
  createEmptySandboxSlot,
  getMergedSlotData,
  getMissingFields,
  computeSandboxMode,
  recomputeSandboxDerived,
} from './sandboxValidation'

export function validateSimulationSlot(slot, getMissingFieldsFn) {
  const getMissing = getMissingFieldsFn || ((s) => [])
  const missingRequiredFields = getMissing(slot)
  const validationStatus = !slot.selectedVersionId
    ? 'empty'
    : missingRequiredFields.length > 0
      ? 'incomplete'
      : 'ready'
  return {
    ...slot,
    missingRequiredFields,
    validationStatus,
  }
}

export function getMarketSandboxSummary(slots, recomputeFn) {
  const recompute = recomputeFn || ((x) => ({ slots: x, derived: { selectedCount: 0, validCount: 0, currentMode: 'invalid', missingSummary: [] } }))
  return recompute(slots).derived
}
