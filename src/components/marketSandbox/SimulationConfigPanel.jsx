export default function SimulationConfigPanel({ config, onConfigChange }) {
  return (
    <section className="workspace-panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>分析模型档位</span>
          <select
            value={config.modelTier}
            onChange={(e) => onConfigChange('modelTier', e.target.value)}
            className="app-select"
          >
            <option value="standard">标准</option>
            <option value="advanced">高级</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>模拟规模</span>
          <select
            value={config.simulationScale}
            onChange={(e) => onConfigChange('simulationScale', e.target.value)}
            className="app-select"
          >
            <option value="small">小</option>
            <option value="medium">中</option>
            <option value="large">大</option>
          </select>
        </label>
      </div>
    </section>
  )
}
