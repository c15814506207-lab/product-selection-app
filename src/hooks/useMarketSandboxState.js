import { useMemo, useState } from 'react'
import {
  createEmptySandboxSlot,
  getMergedSlotData,
  recomputeSandboxDerived,
} from '../utils/marketSandboxValidation'

function createInitialState() {
  const slots = [createEmptySandboxSlot(1), createEmptySandboxSlot(2), createEmptySandboxSlot(3)]
  const recomputed = recomputeSandboxDerived(slots)
  return {
    config: {
      modelTier: 'standard',
      simulationScale: 'medium',
    },
    slots: recomputed.slots,
    derived: recomputed.derived,
    run: {
      status: 'idle',
      result: null,
      error: '',
      runId: null,
    },
    validationModal: {
      open: false,
      items: [],
      firstTarget: null,
    },
  }
}

export function useMarketSandboxState() {
  const [state, setState] = useState(createInitialState)

  function updateConfig(field, value) {
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }))
  }

  function updateSlots(updater) {
    setState((prev) => {
      const rawSlots = updater(prev.slots)
      const recomputed = recomputeSandboxDerived(rawSlots)
      return {
        ...prev,
        slots: recomputed.slots,
        derived: recomputed.derived,
      }
    })
  }

  function selectSlotVersion(slotId, version) {
    const payload = version?.snapshotData || version?.data || {}
    updateSlots((slots) =>
      slots.map((slot) => {
        if (slot.slotId !== slotId) return slot
        return {
          ...slot,
          selectedProductId: version?.productId || null,
          selectedVersionId: version?.versionId || null,
          displayInfo: {
            name: payload?.name || '',
            image_url: payload?.image_url || '',
            price: payload?.price || '',
            material: payload?.material || '',
            style: payload?.style || '',
            selling_points: payload?.selling_points || '',
            target_audience: payload?.target_audience || '',
            usage_scenario: payload?.usage_scenario || '',
          },
          editableSimulationFields: {
            name: payload?.name || '',
            image_url: payload?.image_url || '',
            price: payload?.price || '',
            material: payload?.material || '',
            style: payload?.style || '',
            selling_points: payload?.selling_points || '',
            target_audience: payload?.target_audience || '',
            usage_scenario: payload?.usage_scenario || '',
          },
          ui: {
            ...slot.ui,
            expanded: true,
            highlightFields: [],
          },
        }
      }),
    )
  }

  function updateSlotField(slotId, field, value) {
    updateSlots((slots) =>
      slots.map((slot) => {
        if (slot.slotId !== slotId) return slot
        const nextHighlight = slot.ui.highlightFields.filter((f) => f !== field)
        return {
          ...slot,
          editableSimulationFields: {
            ...slot.editableSimulationFields,
            [field]: value,
          },
          ui: {
            ...slot.ui,
            highlightFields: nextHighlight,
          },
        }
      }),
    )
  }

  function setSlotExpanded(slotId, expanded) {
    updateSlots((slots) =>
      slots.map((slot) =>
        slot.slotId === slotId
          ? {
              ...slot,
              ui: {
                ...slot.ui,
                expanded,
              },
            }
          : slot,
      ),
    )
  }

  function openValidationModalFromCurrent() {
    setState((prev) => {
      const incomplete = prev.derived.missingSummary
      const first = incomplete[0]
      return {
        ...prev,
        validationModal: {
          open: true,
          items: incomplete,
          firstTarget: first
            ? {
                slotId: first.slotId,
                fieldKey: first.missing[0],
              }
            : null,
        },
      }
    })
  }

  function closeValidationModal() {
    setState((prev) => ({
      ...prev,
      validationModal: {
        ...prev.validationModal,
        open: false,
      },
    }))
  }

  function markSlotMissingHighlights(slotId, fields) {
    updateSlots((slots) =>
      slots.map((slot) =>
        slot.slotId === slotId
          ? {
              ...slot,
              ui: {
                ...slot.ui,
                expanded: true,
                highlightFields: fields,
              },
            }
          : slot,
      ),
    )
  }

  function setRunState(patch) {
    setState((prev) => ({
      ...prev,
      run: {
        ...prev.run,
        ...patch,
      },
    }))
  }

  const readyProducts = useMemo(
    () =>
      state.slots
        .filter((slot) => slot.validationStatus === 'ready')
        .map((slot) => ({
          slotId: slot.slotId,
          versionId: slot.selectedVersionId,
          payload: getMergedSlotData(slot),
        })),
    [state.slots],
  )

  return {
    sandbox: state,
    updateConfig,
    selectSlotVersion,
    updateSlotField,
    setSlotExpanded,
    openValidationModalFromCurrent,
    closeValidationModal,
    markSlotMissingHighlights,
    setRunState,
    readyProducts,
  }
}
