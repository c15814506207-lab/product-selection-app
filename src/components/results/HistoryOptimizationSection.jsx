import {
  sectionHeaderStyle,
  smallBlockStyle,
  smallBlockTitleStyle,
  historyEmptyStyle,
} from '../../styles/appFormStyles'

export default function HistoryOptimizationSection({
  optimizationHistoryLoading,
  optimizationHistory,
  expandedOptimizationId,
  formatDate,
  onRefresh,
  onRefill,
  onToggleExpand,
}) {
  return (
    <section style={{ marginTop: 50 }}>
      <div style={sectionHeaderStyle}>
        <h2 style={{ margin: 0 }}>历史优化记录</h2>
        <button
          type="button"
          onClick={onRefresh}
          style={{
            padding: '10px 16px',
            borderRadius: 12,
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {optimizationHistoryLoading ? '刷新中...' : '刷新记录'}
        </button>
      </div>
      {optimizationHistoryLoading ? (
        <div style={historyEmptyStyle}>正在加载优化记录...</div>
      ) : optimizationHistory.length === 0 ? (
        <div style={historyEmptyStyle}>暂时还没有历史优化记录</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {optimizationHistory.map((record) => {
            const expanded = expandedOptimizationId === record.id

            return (
              <div
                key={record.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 20,
                  background: '#fff',
                  padding: 20,
                  boxShadow: '0 8px 24px rgba(15,23,42,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 20,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                      优化时间：{formatDate(record.created_at)}
                    </div>

                    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
                      产品：{record.product_name || '未命名产品'}
                    </div>

                    <div style={{ color: '#374151', lineHeight: 1.8, marginBottom: 12 }}>
                      {record.final_verdict || '暂无结论'}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      <span
                        style={{
                          padding: '6px 10px',
                          borderRadius: 999,
                          background: '#f3f4f6',
                          color: '#374151',
                          fontSize: 13,
                        }}
                      >
                        建议价格区间：{record.recommended_price_range || '-'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => onRefill(record)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: 'none',
                        background: '#111827',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      回填到当前表单
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleExpand(record.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {expanded ? '收起详情' : '查看详情'}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                    <div style={smallBlockStyle}>
                      <div style={smallBlockTitleStyle}>优化后的产品定位</div>
                      <div>{record.optimized_positioning || '-'}</div>
                    </div>

                    <div style={smallBlockStyle}>
                      <div style={smallBlockTitleStyle}>优化后的目标人群</div>
                      <div>{record.optimized_target_audience || '-'}</div>
                    </div>

                    <div style={smallBlockStyle}>
                      <div style={smallBlockTitleStyle}>原始产品输入</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        名称：{record.original_product_input?.name || '-'}
                        {'\n'}
                        价格：{record.original_product_input?.price ?? '-'}
                        {'\n'}
                        材质：{record.original_product_input?.material || '-'}
                        {'\n'}
                        风格：{record.original_product_input?.style || '-'}
                        {'\n'}
                        目标人群：{record.original_product_input?.target_audience || '-'}
                        {'\n'}
                        卖点：{record.original_product_input?.selling_points || '-'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
