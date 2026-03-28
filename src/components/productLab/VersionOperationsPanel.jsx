export default function VersionOperationsPanel({ versions, onAddToSandbox, onSetCurrent }) {
  return (
    <div className="workspace-panel" style={{ marginTop: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>版本列表</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>原始 / 优化 / 模拟驱动</span>
      </div>
      <div
        style={{
          display: 'grid',
          gap: 10,
        }}
      >
        {versions.length === 0 && (
          <div style={{ color: '#64748b' }}>暂无版本，完成优化后会在这里出现。</div>
        )}
        {versions.map((v) => (
          <div
            key={v.versionId}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{v.versionName || v.snapshotData?.name || '未命名产品'}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {v.versionType}
                {v.generationType ? ` · ${v.generationType}` : ''}
                {v.lineageId ? ` · ${v.lineageId}` : ''}
                {' · '}
                {new Date(v.createdAt).toLocaleString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="app-ghost-btn"
                onClick={() => onSetCurrent?.(v)}
              >
                查看详情
              </button>
              <button
                type="button"
                className="app-ghost-btn"
                onClick={() => onAddToSandbox(v)}
              >
                加入市场模拟
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
