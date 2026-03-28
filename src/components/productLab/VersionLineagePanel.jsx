export default function VersionLineagePanel({ chains }) {
  if (!chains?.length) return null
  return (
    <section className="workspace-section">
      <header className="workspace-section__head">
        <h2 className="workspace-section__title">版本迭代轨迹（简要）</h2>
        <p className="workspace-section__desc">按血缘分支查看从原始录入到优化、模拟驱动的演进顺序。</p>
      </header>
      <div style={{ display: 'grid', gap: 12 }}>
        {chains.map(({ lineageId, versions }) => (
          <div key={lineageId} className="app-result-card">
            <div style={{ fontWeight: 700, marginBottom: 8 }}>分支 {lineageId}</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, display: 'grid', gap: 6 }}>
              {versions.map((v) => (
                <li key={v.versionId}>
                  <span style={{ fontWeight: 600 }}>{v.versionName}</span>
                  <span style={{ color: '#64748b', marginLeft: 8 }}>
                    {v.versionType}
                    {v.generationType ? ` · ${v.generationType}` : ''}
                    {v.parentVersionId ? ` ← ${v.parentVersionId}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}
