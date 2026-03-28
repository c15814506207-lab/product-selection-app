export default function SimulationInsightsPanel({
  insight,
  runId,
  onExtract,
  extracting,
  canExtract,
}) {
  return (
    <section style={{ marginTop: 16 }} className="app-result-card">
      <h3 style={{ margin: '0 0 8px' }}>模拟洞察（结构化）</h3>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748b' }}>
        runId：{runId || '—'} · 规则优先提取；自然语言解读可走 LLM 辅助层。
      </p>
      {insight ? (
        <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
          <div>
            <strong>摘要</strong>：{insight.summary}
          </div>
          <div>
            <strong>模式</strong>：{insight.sourceMode} · <strong>置信度</strong>：
            {(insight.confidence * 100).toFixed(0)}%
          </div>
          {insight.keyFindings?.length > 0 && (
            <div>
              <strong>关键发现</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {insight.keyFindings.map((f) => (
                  <li key={f.findingId}>{f.summary}</li>
                ))}
              </ul>
            </div>
          )}
          {insight.weaknesses?.length > 0 && (
            <div>
              <strong>短板</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {insight.weaknesses.map((w) => (
                  <li key={w.id}>
                    [{w.category}] {w.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: '#64748b', fontSize: 14 }}>尚未从本次模拟提取洞察。</div>
      )}
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          className="app-secondary-btn"
          disabled={!canExtract || extracting}
          onClick={onExtract}
        >
          {extracting ? '提取中…' : '从本次模拟提取洞察（规则）'}
        </button>
      </div>
    </section>
  )
}
