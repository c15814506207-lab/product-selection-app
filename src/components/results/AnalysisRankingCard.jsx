import { sectionHeaderStyle, sectionTagStyle } from '../../styles/appFormStyles'

export default function AnalysisRankingCard({ ranking }) {
  if (!ranking) return null

  return (
    <section style={{ marginTop: 30 }}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 24,
          padding: 28,
          background: '#fff',
          boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
        }}
      >
        <div style={sectionHeaderStyle}>
          <h2 style={{ margin: 0 }}>最终推荐排序</h2>
          <span style={sectionTagStyle}>排序结果</span>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          {ranking.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 18px',
                borderRadius: 16,
                background: index === 0 ? '#fff7e6' : '#f9fafb',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: index === 0 ? '#111827' : '#e5e7eb',
                    color: index === 0 ? '#fff' : '#111827',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontWeight: 700,
                  }}
                >
                  {item.rank}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {index === 0 ? '当前推荐优先开发' : '候选排序'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  fontWeight: 600,
                }}
              >
                评分 {item.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
