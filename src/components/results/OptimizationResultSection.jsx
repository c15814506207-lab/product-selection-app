import {
  sectionHeaderStyle,
  sectionTagStyle,
  smallBlockStyle,
  smallBlockTitleStyle,
} from '../../styles/appFormStyles'

export default function OptimizationResultSection({ optimizationResult, productOrdinalLabel }) {
  if (!optimizationResult) return null

  return (
    <section style={{ marginTop: 40 }}>
      <div style={sectionHeaderStyle}>
        <h2 style={{ margin: 0 }}>产品优化方案：{optimizationResult.productName}</h2>
        <span style={sectionTagStyle}>AI 优化建议</span>
      </div>

      <div
        style={{
          position: 'relative',
          border: '1px solid #e5e7eb',
          borderRadius: 24,
          padding: 24,
          paddingTop: productOrdinalLabel ? 44 : 24,
          background: '#fff',
          boxShadow: '0 10px 24px rgba(15,23,42,0.04)',
          display: 'grid',
          gap: 18,
        }}
      >
        {productOrdinalLabel ? (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              fontSize: 12,
              fontWeight: 800,
              color: '#64748b',
            }}
          >
            {productOrdinalLabel}
          </div>
        ) : null}
        <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
          优化结果将作为新版本保存，不覆盖原始输入
        </div>

        <div style={smallBlockStyle}>
          <div style={smallBlockTitleStyle}>优化后的产品定位</div>
          <div>{optimizationResult.optimized_positioning}</div>
        </div>

        <div style={smallBlockStyle}>
          <div style={smallBlockTitleStyle}>优化后的目标人群</div>
          <div>{optimizationResult.optimized_target_audience}</div>
        </div>

        <div style={smallBlockStyle}>
          <div style={smallBlockTitleStyle}>建议价格区间</div>
          <div>{optimizationResult.recommended_price_range}</div>
        </div>

        <div style={smallBlockStyle}>
          <div style={smallBlockTitleStyle}>优化后的核心卖点</div>
          <div>
            {Array.isArray(optimizationResult.optimized_selling_points)
              ? optimizationResult.optimized_selling_points.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: 8 }}>
                    {idx + 1}. {item}
                  </div>
                ))
              : '-'}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 16,
          }}
        >
          <div style={smallBlockStyle}>
            <div style={smallBlockTitleStyle}>小红书方向</div>
            <div>{optimizationResult.content_strategy?.xhs_angle}</div>
          </div>

          <div style={smallBlockStyle}>
            <div style={smallBlockTitleStyle}>抖音方向</div>
            <div>{optimizationResult.content_strategy?.douyin_angle}</div>
          </div>

          <div style={smallBlockStyle}>
            <div style={smallBlockTitleStyle}>视觉重点</div>
            <div>{optimizationResult.content_strategy?.visual_focus}</div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          <div style={smallBlockStyle}>
            <div style={smallBlockTitleStyle}>主要风险</div>
            <div>
              {Array.isArray(optimizationResult.risk_control?.main_risks)
                ? optimizationResult.risk_control.main_risks.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 8 }}>
                      {idx + 1}. {item}
                    </div>
                  ))
                : '-'}
            </div>
          </div>

          <div style={smallBlockStyle}>
            <div style={smallBlockTitleStyle}>解决方案</div>
            <div>
              {Array.isArray(optimizationResult.risk_control?.solutions)
                ? optimizationResult.risk_control.solutions.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 8 }}>
                      {idx + 1}. {item}
                    </div>
                  ))
                : '-'}
            </div>
          </div>
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
          <div style={{ fontWeight: 700, marginBottom: 8 }}>最终结论</div>
          <div>{optimizationResult.final_verdict}</div>
        </div>
      </div>
    </section>
  )
}
