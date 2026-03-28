export default function SimulationSuggestionsPanel({
  suggestions,
  onApplySuggestion,
  lastRunId,
}) {
  if (!suggestions?.length) {
    return (
      <section className="workspace-section">
        <header className="workspace-section__head">
          <h2 className="workspace-section__title">来自市场模拟的建议</h2>
        </header>
        <div className="app-result-card" style={{ color: '#64748b', fontSize: 14 }}>
          暂无可执行的模拟驱动建议。在市场模拟完成并「提取洞察 → 生成建议 → 送回实验室」后，将在此出现。
          {lastRunId && <div style={{ marginTop: 8 }}>最近模拟 run：{lastRunId}</div>}
        </div>
      </section>
    )
  }

  return (
    <section className="workspace-section">
      <header className="workspace-section__head">
        <h2 className="workspace-section__title">来自市场模拟的建议</h2>
        <p className="workspace-section__desc">每条建议已带字段级补丁，可在父版本快照上生成新版本。</p>
      </header>
      <div style={{ display: 'grid', gap: 10 }}>
        {suggestions.map((s) => (
          <div key={s.suggestionId} className="app-result-card">
            <div style={{ fontWeight: 700 }}>{s.title}</div>
            <div style={{ color: '#475569', marginTop: 6 }}>{s.description}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
              {s.suggestionType} · 父版本 {s.targetVersionId}
            </div>
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="app-primary-soft-btn"
                onClick={() => onApplySuggestion(s)}
              >
                基于建议生成新版本（局部改动）
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
