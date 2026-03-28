export const REQUIRED_SIM_FIELDS = [
  'name',
  'image_url',
  'price',
  'material',
  'style',
  'selling_points',
  'target_audience',
  'usage_scenario',
]

export function createEmptySandboxSlot(slotId) {
  return {
    slotId,
    selectedProductId: null,
    selectedVersionId: null,
    displayInfo: {
      name: '',
      image_url: '',
      price: '',
      material: '',
      style: '',
      selling_points: '',
      target_audience: '',
      usage_scenario: '',
    },
    editableSimulationFields: {
      price: '',
      material: '',
      style: '',
      selling_points: '',
      target_audience: '',
      usage_scenario: '',
    },
    validationStatus: 'empty',
    missingRequiredFields: [],
    ui: {
      expanded: false,
      highlightFields: [],
    },
  }
}

export function getMergedSlotData(slot) {
  return {
    ...slot.displayInfo,
    ...slot.editableSimulationFields,
  }
}

export function getMissingFields(slot) {
  if (!slot.selectedVersionId) return []
  const data = getMergedSlotData(slot)
  return REQUIRED_SIM_FIELDS.filter((key) => {
    const value = data[key]
    return value == null || String(value).trim() === ''
  })
}

export function computeSlotStatus(slot) {
  if (!slot.selectedVersionId) return 'empty'
  return slot.missingRequiredFields.length > 0 ? 'incomplete' : 'ready'
}

export function computeSandboxMode(validCount) {
  if (validCount === 1) return 'single'
  if (validCount === 2) return 'compare2'
  if (validCount === 3) return 'compare3'
  return 'invalid'
}

export function recomputeSandboxDerived(slots) {
  const nextSlots = slots.map((slot) => {
    const missingRequiredFields = getMissingFields(slot)
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
  })

  const selectedCount = nextSlots.filter((slot) => !!slot.selectedVersionId).length
  const validCount = nextSlots.filter((slot) => slot.validationStatus === 'ready').length
  const currentMode = computeSandboxMode(validCount)
  const missingSummary = nextSlots
    .filter((slot) => slot.validationStatus === 'incomplete')
    .map((slot) => ({
      slotId: slot.slotId,
      missing: slot.missingRequiredFields,
    }))

  return {
    slots: nextSlots,
    derived: {
      selectedCount,
      validCount,
      currentMode,
      missingSummary,
    },
  }
}
