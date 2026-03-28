import MetricCard from '../MetricCard'
import {
  sectionHeaderStyle,
  sectionTagStyle,
  smallBlockStyle,
  smallBlockTitleStyle,
} from '../../styles/appFormStyles'

export default function SandboxResultSection({ sandboxResult }) {
  if (!sandboxResult) return null

  return (
    <section style={{ marginTop: 40 }}>
      <div style={sectionHeaderStyle}>
        <h2 style={{ margin: 0 }}>市场沙盘结果：{sandboxResult.productName}</h2>
        <span style={sectionTagStyle}>多角色模拟</span>
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 18,
        }}
      >
        {sandboxResult.agents?.map((agent, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 18,
              padding: 20,
              background: '#fff',
              boxShadow: '0 8px 20px rgba(15,23,42,0.04)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>{agent.persona}</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <MetricCard label="购买意愿" value={agent.buy_intent} />
              <MetricCard label="收藏意愿" value={agent.save_intent} />
              <MetricCard label="分享意愿" value={agent.share_intent} />
            </div>

            <div style={smallBlockStyle}>
              <div style={smallBlockTitleStyle}>愿意买的原因</div>
              <div>{agent.reason_to_buy}</div>
            </div>

            <div style={{ ...smallBlockStyle, marginTop: 12 }}>
              <div style={smallBlockTitleStyle}>不愿意买的原因</div>
              <div>{agent.reason_not_to_buy}</div>
            </div>

            <div style={{ ...smallBlockStyle, marginTop: 12 }}>
              <div style={smallBlockTitleStyle}>关键触发点</div>
              <div>{agent.key_trigger}</div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 26,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
        }}
      >
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 20,
            padding: 22,
            background: '#fff',
            boxShadow: '0 8px 20px rgba(15,23,42,0.04)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>群体总结</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <MetricCard label="市场适配度" value={sandboxResult.summary?.estimated_market_fit} />
            <MetricCard label="转化潜力" value={sandboxResult.summary?.conversion_potential} />
            <MetricCard label="传播潜力" value={sandboxResult.summary?.content_virality} />
            <MetricCard label="信任风险" value={sandboxResult.summary?.trust_risk} />
          </div>

          <div style={{ ...smallBlockStyle, marginTop: 16 }}>
            <div style={smallBlockTitleStyle}>最大阻碍</div>
            <div>{sandboxResult.summary?.main_barrier}</div>
          </div>

          <div style={{ ...smallBlockStyle, marginTop: 12 }}>
            <div style={smallBlockTitleStyle}>最大优势</div>
            <div>{sandboxResult.summary?.main_strength}</div>
          </div>
        </div>

        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 20,
            padding: 22,
            background: '#fff',
            boxShadow: '0 8px 20px rgba(15,23,42,0.04)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>优化建议</h3>

          <div style={smallBlockStyle}>
            <div style={smallBlockTitleStyle}>建议改动</div>
            <div>
              {Array.isArray(sandboxResult.optimization?.top_changes)
                ? sandboxResult.optimization.top_changes.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 8 }}>
                      {idx + 1}. {item}
                    </div>
                  ))
                : '-'}
            </div>
          </div>

          <div style={{ ...smallBlockStyle, marginTop: 12 }}>
            <div style={smallBlockTitleStyle}>推荐价格区间</div>
            <div>{sandboxResult.optimization?.recommended_price_range}</div>
          </div>

          <div style={{ ...smallBlockStyle, marginTop: 12 }}>
            <div style={smallBlockTitleStyle}>推荐定位</div>
            <div>{sandboxResult.optimization?.recommended_positioning}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
