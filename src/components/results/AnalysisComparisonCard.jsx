import { sectionHeaderStyle, sectionTagStyle } from '../../styles/appFormStyles'

export default function AnalysisComparisonCard({ comparison }) {
  if (!comparison) return null

  return (
    <section style={{ marginTop: 30 }}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 24,
          padding: 28,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 10px 24px rgba(15,23,42,0.05)',
        }}
      >
        <div style={sectionHeaderStyle}>
          <h2 style={{ margin: 0 }}>综合对比分析</h2>
          <span style={sectionTagStyle}>决策摘要</span>
        </div>

        <div
          style={{
            marginTop: 18,
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: 20,
          }}
        >
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: '#fff',
              border: '1px solid #e5e7eb',
              lineHeight: 1.85,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>综合总结</div>
            <div>{comparison.summary}</div>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: '#111827',
              color: '#fff',
              lineHeight: 1.8,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>最终推荐</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
              {comparison.best_choice_name}
            </div>
            <div>{comparison.best_choice_reason}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
