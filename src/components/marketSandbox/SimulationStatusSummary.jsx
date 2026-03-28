function modeLabel(mode) {
  if (mode === 'single') return '单品模拟'
  if (mode === 'compare2') return '双产品对比'
  if (mode === 'compare3') return '三产品竞争'
  return '无效'
}

export default function SimulationStatusSummary({ derived }) {
  const missingText = derived.missingSummary.length
    ? derived.missingSummary
        .map((it) => `槽位${it.slotId} 缺 ${it.missing.join('、')}`)
        .join('；')
    : '无'

  return (
    <section className="app-summary-strip">
      <div>已选择产品：{derived.selectedCount}</div>
      <div>可参与模拟：{derived.validCount}</div>
      <div>当前模式：{modeLabel(derived.currentMode)}</div>
      <div title={missingText}>缺失信息：{missingText}</div>
    </section>
  )
}
