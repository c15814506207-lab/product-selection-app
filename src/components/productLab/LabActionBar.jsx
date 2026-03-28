export default function LabActionBar({
  analyzing,
  onAnalyze,
  onOptimizeAll,
  onReanalyzeOptimized,
  onOneClick,
  hasOptimizedVersions,
  pipelineRunning,
}) {
  return (
    <div className="lab-action-bar">
      <button type="button" className="app-analyze-button" onClick={onAnalyze} disabled={analyzing || pipelineRunning}>
        {analyzing ? '分析中...' : '分析产品'}
      </button>
      <button
        type="button"
        className="app-secondary-btn"
        onClick={onOptimizeAll}
        disabled={pipelineRunning || analyzing}
      >
        对三产品生成优化方案
      </button>
      <button
        type="button"
        className="app-secondary-btn"
        onClick={onReanalyzeOptimized}
        disabled={!hasOptimizedVersions || pipelineRunning}
      >
        优化后再分析
      </button>
      <button
        type="button"
        className="app-primary-soft-btn"
        onClick={onOneClick}
        disabled={pipelineRunning}
      >
        {pipelineRunning ? '流程执行中...' : '一键完成实验室流程'}
      </button>
    </div>
  )
}
