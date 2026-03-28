import MetricCard from '../MetricCard'

function scoreFromPotential(potential) {
  const s = String(potential || '')
  const num = Number((s.match(/\d+(\.\d+)?/) || [])[0])
  if (!Number.isNaN(num)) return num
  if (s.includes('高')) return 85
  if (s.includes('中')) return 65
  if (s.includes('低')) return 45
  return 50
}

function SingleView({ result }) {
  const r = result?.single?.result
  if (!r) return null
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <MetricCard label="市场接受度" value={r.summary?.estimated_market_fit || '-'} />
        <MetricCard label="用户兴趣度" value={r.summary?.content_virality || '-'} />
        <MetricCard label="转化潜力" value={r.summary?.conversion_potential || '-'} />
        <MetricCard label="风险点" value={r.summary?.trust_risk || '-'} />
      </div>
    </div>
  )
}

function CompareView({ result }) {
  const rows = result?.compare?.rows || []
  if (rows.length === 0) return null
  const sorted = [...rows].sort((a, b) => scoreFromPotential(b.result?.summary?.conversion_potential) - scoreFromPotential(a.result?.summary?.conversion_potential))
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontWeight: 700 }}>胜出者：{sorted[0]?.name || '-'}</div>
      <div style={{ color: '#475569' }}>
        胜出原因：转化潜力与市场适配度更高
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {sorted.map((row, idx) => (
          <div key={row.slotId} className="app-result-row">
            {idx + 1}. {row.name} - 转化潜力：{row.result?.summary?.conversion_potential || '-'}
          </div>
        ))}
      </div>
      {sorted[1] && <div style={{ color: '#64748b' }}>落后方短板：{sorted[1].result?.summary?.main_barrier || '待补充'}</div>}
    </div>
  )
}

function CompetitionView({ result }) {
  const rows = result?.competition?.rows || []
  if (rows.length === 0) return null
  const sorted = [...rows].sort((a, b) => scoreFromPotential(b.result?.summary?.conversion_potential) - scoreFromPotential(a.result?.summary?.conversion_potential))
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontWeight: 700 }}>排名</div>
      {sorted.map((row, idx) => (
        <div key={row.slotId} className="app-result-row">
          {idx + 1}. {row.name}
        </div>
      ))}
      <div>胜出原因：{sorted[0]?.result?.summary?.main_strength || '综合指标领先'}</div>
      <div>第二名优化建议：{sorted[1]?.result?.optimization?.recommended_positioning || '优化定位与卖点结构'}</div>
      <div>第三名淘汰原因：{sorted[2]?.result?.summary?.main_barrier || '转化潜力不足'}</div>
    </div>
  )
}

export default function SimulationResultPanel({ result }) {
  if (!result) return null
  return (
    <section style={{ marginTop: 0 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800 }}>本轮输出摘要</h3>
      <div className="app-result-card">
        {result.mode === 'single' && <SingleView result={result} />}
        {result.mode === 'compare2' && <CompareView result={result} />}
        {result.mode === 'compare3' && <CompetitionView result={result} />}
      </div>
    </section>
  )
}
