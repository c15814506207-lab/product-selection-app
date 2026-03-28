import ProductInputCard from '../ProductInputCard'
import AnalysisProductCards from '../results/AnalysisProductCards'
import AnalysisComparisonCard from '../results/AnalysisComparisonCard'
import AnalysisRankingCard from '../results/AnalysisRankingCard'
import OptimizationResultSection from '../results/OptimizationResultSection'
import LabActionBar from './LabActionBar'
import VersionOperationsPanel from './VersionOperationsPanel'
import SimulationSuggestionsPanel from './SimulationSuggestionsPanel'
import VersionLineagePanel from './VersionLineagePanel'

export default function ProductLabPanel({
  bridge,
  reanalysisResult,
  labVersions,
  pipelineRunning,
  onAnalyze,
  onOptimizeAll,
  onReanalyzeOptimized,
  onOneClickPipeline,
  onAddVersionToSandbox,
  onSetCurrentVersion,
  sandboxSuggestions,
  onApplySandboxSuggestion,
  lastSimulationRunId,
  versionLineageChains,
}) {
  return (
    <div className="workspace-panel-stack">
      <section className="workspace-section">
        <header className="workspace-section__head">
          <h2 className="workspace-section__title">产品录入</h2>
          <p className="workspace-section__desc">填写或识别三款候选产品的图文与基础信息，作为后续分析与优化的输入。</p>
        </header>
        <div className="app-product-grid">
          {bridge.products.map((product, index) => (
            <ProductInputCard
              key={index}
              product={product}
              index={index}
              onFieldChange={(field, value) => bridge.updateProduct(index, field, value)}
              onImageSelect={(file) => bridge.handleImageSelect(index, file)}
              onAiFillFromImage={() => bridge.handleAiFillFromImage(index)}
              aiFillLoading={bridge.isAiFillLoading?.(index)}
            />
          ))}
        </div>

        <LabActionBar
          analyzing={bridge.analyzing}
          onAnalyze={onAnalyze}
          onOptimizeAll={onOptimizeAll}
          onReanalyzeOptimized={onReanalyzeOptimized}
          onOneClick={onOneClickPipeline}
          hasOptimizedVersions={labVersions.some((v) => v.versionType === 'optimized')}
          pipelineRunning={pipelineRunning}
        />
      </section>

      <section className="workspace-section">
        <header className="workspace-section__head">
          <h2 className="workspace-section__title">分析与排名</h2>
          <p className="workspace-section__desc">查看三产品对比、排序及单点优化入口。</p>
        </header>
        <AnalysisProductCards
          analysisResult={bridge.analysisResult}
          sandboxLoadingName=""
          optimizingName={bridge.optimizingName}
          onRunSandbox={() => {}}
          onOptimizeProduct={bridge.handleOptimizeProduct}
        />
        <AnalysisComparisonCard comparison={bridge.analysisResult?.comparison ?? null} />
        <AnalysisRankingCard ranking={bridge.analysisResult?.comparison?.ranking ?? null} />
      </section>

      <section className="workspace-section">
        <header className="workspace-section__head">
          <h2 className="workspace-section__title">优化结果</h2>
        </header>
        <OptimizationResultSection optimizationResult={bridge.optimizationResult} />
      </section>

      {reanalysisResult && (
        <section className="workspace-section">
          <header className="workspace-section__head">
            <h2 className="workspace-section__title">优化后再分析</h2>
          </header>
          <AnalysisComparisonCard comparison={reanalysisResult?.comparison ?? null} />
          <AnalysisRankingCard ranking={reanalysisResult?.comparison?.ranking ?? null} />
        </section>
      )}

      <SimulationSuggestionsPanel
        suggestions={sandboxSuggestions}
        onApplySuggestion={onApplySandboxSuggestion}
        lastRunId={lastSimulationRunId}
      />

      <VersionLineagePanel chains={versionLineageChains} />

      <section className="workspace-section">
        <header className="workspace-section__head">
          <h2 className="workspace-section__title">版本与沙盒联动</h2>
          <p className="workspace-section__desc">将某一版本加入市场模拟槽位，或在此查看血缘与模拟回流建议。</p>
        </header>
        <VersionOperationsPanel
          versions={labVersions}
          onAddToSandbox={onAddVersionToSandbox}
          onSetCurrent={onSetCurrentVersion}
        />
      </section>
    </div>
  )
}
