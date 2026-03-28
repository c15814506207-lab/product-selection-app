import {
  sectionHeaderStyle,
  historyEmptyStyle,
} from '../../styles/appFormStyles'

export default function HistoryAnalysisSection({
  historyLoading,
  historyRecords,
  expandedHistoryId,
  formatDate,
  onRefresh,
  onRefill,
  onToggleExpand,
}) {
  return (
    <section style={{ marginTop: 50 }}>
      <div style={sectionHeaderStyle}>
        <h2 style={{ margin: 0 }}>历史分析记录</h2>
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
          {historyLoading ? '刷新中...' : '刷新记录'}
        </button>
      </div>
      {historyLoading ? (
        <div style={historyEmptyStyle}>正在加载历史记录...</div>
      ) : historyRecords.length === 0 ? (
        <div style={historyEmptyStyle}>暂时还没有历史分析记录</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {historyRecords.map((record) => {
            const expanded = expandedHistoryId === record.id

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
                      分析时间：{formatDate(record.created_at)}
                    </div>

                    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
                      胜出产品：{record.winner?.name || '未识别'}
                    </div>

                    <div style={{ color: '#374151', lineHeight: 1.8, marginBottom: 12 }}>
                      {record.summary || '暂无总结'}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {record.products.map((p) => (
                        <span
                          key={p.id}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 999,
                            background:
                              record.winner?.id === p.id ? '#111827' : '#f3f4f6',
                            color: record.winner?.id === p.id ? '#fff' : '#374151',
                            fontSize: 13,
                          }}
                        >
                          {p.name}
                        </span>
                      ))}
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
                      回填到当前分析区
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
                  <div
                    style={{
                      marginTop: 18,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 14,
                    }}
                  >
                    {record.products.map((p) => {
                      const isWinner = record.winner?.id === p.id
                      return (
                        <div
                          key={p.id}
                          style={{
                            border: isWinner
                              ? '1px solid #111827'
                              : '1px solid #e5e7eb',
                            borderRadius: 18,
                            padding: 16,
                            background: isWinner ? '#fffdfa' : '#fafafa',
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-block',
                              padding: '5px 10px',
                              borderRadius: 999,
                              background: isWinner ? '#111827' : '#e5e7eb',
                              color: isWinner ? '#fff' : '#374151',
                              fontSize: 12,
                              marginBottom: 10,
                            }}
                          >
                            {isWinner ? '当次胜出产品' : '参与产品'}
                          </div>

                          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                            {p.name}
                          </div>

                          <div style={{ fontSize: 15, marginBottom: 8 }}>
                            <strong>评分：</strong>
                            {p.analysis?.ai_score ?? '-'}
                          </div>

                          <div style={{ marginBottom: 10, lineHeight: 1.8 }}>
                            <strong>优点：</strong>
                            {p.analysis?.strengths || '-'}
                          </div>

                          <div style={{ marginBottom: 10, lineHeight: 1.8 }}>
                            <strong>缺点：</strong>
                            {p.analysis?.weaknesses || '-'}
                          </div>

                          <div style={{ lineHeight: 1.8 }}>
                            <strong>建议：</strong>
                            {p.analysis?.recommendation || '-'}
                          </div>
                        </div>
                      )
                    })}
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
