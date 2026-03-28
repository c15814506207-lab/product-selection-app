import ScoreBadge from '../ScoreBadge'
import TagList from '../TagList'
import { sectionHeaderStyle, sectionTagStyle } from '../../styles/appFormStyles'

export default function AnalysisProductCards({
  analysisResult,
  sandboxLoadingName,
  optimizingName,
  onRunSandbox,
  onOptimizeProduct,
  showActions = true,
}) {
  if (!analysisResult?.products) return null

  return (
    <section style={{ marginTop: 50 }}>
      <div style={sectionHeaderStyle}>
        <h2 style={{ margin: 0 }}>单产品分析结果</h2>
        <span style={sectionTagStyle}>AI 对比结果</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
        }}
      >
        {analysisResult.products.map((item, index) => {
          const isWinner = analysisResult?.comparison?.best_choice_name === item.name

          return (
            <div
              key={index}
              style={{
                border: isWinner ? '1px solid #111827' : '1px solid #e5e7eb',
                borderRadius: 22,
                padding: 22,
                background: isWinner ? '#fffdfa' : '#ffffff',
                boxShadow: isWinner
                  ? '0 14px 32px rgba(17,24,39,0.10)'
                  : '0 8px 20px rgba(15,23,42,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: isWinner ? '#111827' : '#f3f4f6',
                      color: isWinner ? '#fff' : '#374151',
                      fontSize: 12,
                      marginBottom: 12,
                    }}
                  >
                    {isWinner ? '推荐优先产品' : `候选产品 ${index + 1}`}
                  </div>

                  <h3 style={{ margin: 0, fontSize: 22 }}>{item.name}</h3>
                  <p style={{ marginTop: 10, marginBottom: 0, color: '#4b5563', lineHeight: 1.7 }}>
                    <strong>产品定位：</strong>
                    {item.positioning}
                  </p>
                </div>

                <ScoreBadge score={item.score} isWinner={isWinner} />
              </div>

              <TagList title="核心优点" items={item.strengths} tone="good" />
              <TagList title="核心缺点" items={item.weaknesses} tone="bad" />

              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 16,
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  lineHeight: 1.8,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>AI建议</div>
                <div>{item.suggestion}</div>
              </div>

              {showActions && (
                <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                  <button
                    type="button"
                    onClick={() => onRunSandbox(item)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 14,
                      border: 'none',
                      background: '#111827',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {sandboxLoadingName === item.name
                      ? '市场沙盘模拟中...'
                      : '启动市场沙盘'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOptimizeProduct(item)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 14,
                      border: '1px solid #111827',
                      background: '#fff',
                      color: '#111827',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {optimizingName === item.name ? '优化方案生成中...' : '生成优化方案'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
