function getButtonText(derived) {
  if (derived.validCount === 1) return '开始单品模拟'
  if (derived.validCount === 2) return '开始双产品对比模拟'
  if (derived.validCount === 3) return '开始三产品竞争模拟'
  return '开始模拟'
}

export default function SimulationActionBar({ derived, running, onStart }) {
  const disabled = running || derived.selectedCount === 0
  return (
    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        className="app-analyze-button"
        onClick={onStart}
        disabled={disabled}
      >
        {running ? '模拟执行中...' : getButtonText(derived)}
      </button>
      {derived.selectedCount === 0 && (
        <span style={{ fontSize: 13, color: '#64748b' }}>请先选择至少一个产品</span>
      )}
      {derived.selectedCount > derived.validCount && derived.selectedCount > 0 && (
        <span style={{ fontSize: 13, color: '#b45309' }}>
          存在待完善信息，点击后将提示缺失字段
        </span>
      )}
    </div>
  )
}
