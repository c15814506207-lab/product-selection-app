export default function OptimizationSuggestionPanel({
  suggestions,
  onGenerate,
  onSendToLab,
  generating,
  canGenerate,
  canSend,
}) {
  return (
    <section style={{ marginTop: 16 }} className="app-result-card">
      <h3 style={{ margin: '0 0 8px' }}>优化建议（可回流实验室）</h3>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b' }}>
        每条建议均含 snapshotPatch，便于在父版本上做局部改动生成新版本。
      </p>
      {suggestions?.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, display: 'grid', gap: 10 }}>
          {suggestions.map((s) => (
            <li key={s.suggestionId}>
              <div style={{ fontWeight: 600 }}>{s.title}</div>
              <div style={{ color: '#475569' }}>{s.description}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                类型：{s.suggestionType} · 目标版本：{s.targetVersionId}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ color: '#64748b', fontSize: 14 }}>暂无建议，请先生成结构化洞察。</div>
      )}
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          className="app-secondary-btn"
          disabled={!canGenerate || generating}
          onClick={onGenerate}
        >
          {generating ? '生成中…' : '从洞察生成优化建议'}
        </button>
        <button
          type="button"
          className="app-primary-soft-btn"
          disabled={!canSend}
          onClick={onSendToLab}
        >
          将建议送回产品实验室
        </button>
      </div>
    </section>
  )
}
