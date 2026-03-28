import { useRef } from 'react'
import SimulationConfigPanel from './SimulationConfigPanel'
import SimulationStatusSummary from './SimulationStatusSummary'
import SimulationActionBar from './SimulationActionBar'
import SimulationProductSlot from './SimulationProductSlot'
import SimulationResultPanel from './SimulationResultPanel'
import SimulationInsightsPanel from './SimulationInsightsPanel'
import OptimizationSuggestionPanel from './OptimizationSuggestionPanel'
import ValidationModal from '../modals/ValidationModal'

export default function MarketSandboxPanel({
  sandboxState,
  candidates,
  onConfigChange,
  onSelectSlotVersion,
  onUpdateSlotField,
  onStartSimulation,
  onGoFixMissing,
  onCloseValidation,
  simulationInsight,
  optimizationSuggestions,
  onExtractSimulationInsight,
  onBuildOptimizationSuggestions,
  onSendSuggestionsToLab,
  insightExtracting = false,
  suggestionGenerating = false,
}) {
  const fieldRefRegistry = useRef({})

  function registerFieldRef(slotId, fieldKey) {
    if (!fieldRefRegistry.current[slotId]) {
      fieldRefRegistry.current[slotId] = {}
    }
    return (el) => {
      fieldRefRegistry.current[slotId][fieldKey] = el
    }
  }

  function handleGoFix() {
    const target = sandboxState.validationModal.firstTarget
    const targetEl = target
      ? fieldRefRegistry.current[target.slotId]?.[target.fieldKey]
      : null
    onGoFixMissing(target, targetEl)
  }

  return (
    <div className="workspace-panel-stack">
      <section className="workspace-section">
        <header className="workspace-section__head">
          <h2 className="workspace-section__title">模拟配置与状态</h2>
          <p className="workspace-section__desc">选择档位与规模；下方摘要随槽位与必填项实时更新。</p>
        </header>
        <SimulationConfigPanel config={sandboxState.config} onConfigChange={onConfigChange} />
        <SimulationStatusSummary derived={sandboxState.derived} />
      </section>

      <section className="workspace-section">
        <header className="workspace-section__head">
          <h2 className="workspace-section__title">产品槽位（固定 3 格）</h2>
          <p className="workspace-section__desc">从已有版本选择并可为本次运行临时改写字段（不写回实验室母版本）。</p>
        </header>
        <div className="app-slot-grid">
          {sandboxState.slots.map((slot) => (
            <SimulationProductSlot
              key={slot.slotId}
              slot={slot}
              candidates={candidates}
              onSelectVersion={onSelectSlotVersion}
              onUpdateField={onUpdateSlotField}
              registerFieldRef={registerFieldRef}
            />
          ))}
        </div>

        <SimulationActionBar
          derived={sandboxState.derived}
          running={sandboxState.run.status === 'running'}
          onStart={onStartSimulation}
        />
      </section>

      <section className="workspace-section">
        <header className="workspace-section__head">
          <h2 className="workspace-section__title">运行结果与回流</h2>
          <p className="workspace-section__desc">查看本轮输出；需要时再提取洞察并生成可执行建议，送回实验室迭代。</p>
        </header>
        <SimulationResultPanel result={sandboxState.run.result} />

        <SimulationInsightsPanel
          insight={simulationInsight}
          runId={sandboxState.run.runId}
          onExtract={onExtractSimulationInsight}
          extracting={insightExtracting}
          canExtract={sandboxState.run.status === 'success' && !!sandboxState.run.result}
        />

        <OptimizationSuggestionPanel
          suggestions={optimizationSuggestions}
          onGenerate={onBuildOptimizationSuggestions}
          onSendToLab={onSendSuggestionsToLab}
          generating={suggestionGenerating}
          canGenerate={!!simulationInsight}
          canSend={!!optimizationSuggestions?.length}
        />
      </section>

      <ValidationModal
        open={sandboxState.validationModal.open}
        items={sandboxState.validationModal.items}
        onGoFix={handleGoFix}
        onCancel={onCloseValidation}
      />
    </div>
  )
}
