import { formatDate } from './utils/formatDate'

function ReportSection({ title, children }) {
    return (
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 20,
          padding: 22,
          marginBottom: 20,
          background: '#fff',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 14 }}>{title}</h2>
        {children}
      </div>
    )
  }
  
export default function ReportView({
  analysisResult,
  sandboxResult,
  optimizationResult,
  onClose,
  onPrint,
}) {
    return (
      <div
        className="report-view-print-root"
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '28px 20px 60px',
          background: '#ffffff',
          color: '#0f172a',
          minHeight: '100vh',
        }}
      >
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '12px 18px',
              borderRadius: 14,
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            关闭报告视图
          </button>
  
          <button
            onClick={onPrint}
            style={{
              padding: '12px 18px',
              borderRadius: 14,
              border: 'none',
              background: '#111827',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            打印 / 另存为 PDF
          </button>
        </div>
  
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 24,
            padding: 28,
            marginBottom: 24,
            background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
            color: '#fff',
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
            AI Product Decision Report
          </div>
          <h1 style={{ margin: 0, fontSize: 32 }}>选品与优化分析报告</h1>
          <div style={{ marginTop: 12, opacity: 0.9 }}>
            生成时间：{formatDate(new Date().toISOString())}
          </div>
        </div>
  
        {analysisResult && (
          <ReportSection title="一、三产品分析结果">
            <div style={{ display: 'grid', gap: 14 }}>
              {(analysisResult.products || []).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    padding: 16,
                    background: '#fafafa',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                    {item?.name ?? '-'}（评分：{item?.score ?? '-'}）
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>定位：</strong>
                    {item?.positioning ?? '-'}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>优点：</strong>
                    {Array.isArray(item?.strengths) ? item.strengths.join('；') : '-'}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>缺点：</strong>
                    {Array.isArray(item?.weaknesses) ? item.weaknesses.join('；') : '-'}
                  </div>
                  <div>
                    <strong>建议：</strong>
                    {item?.suggestion ?? '-'}
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>
        )}
  
        {analysisResult?.comparison && (
          <ReportSection title="二、最终推荐">
            <div style={{ marginBottom: 10 }}>
              <strong>推荐产品：</strong>
              {analysisResult.comparison.best_choice_name ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>推荐原因：</strong>
              {analysisResult.comparison.best_choice_reason ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>综合总结：</strong>
              {analysisResult.comparison.summary ?? '-'}
            </div>

            {Array.isArray(analysisResult.comparison.ranking) &&
              analysisResult.comparison.ranking.length > 0 && (
                <div>
                  <strong>排序结果：</strong>
                  <div style={{ marginTop: 8 }}>
                    {analysisResult.comparison.ranking.map((item, idx) => (
                      <div key={idx} style={{ marginBottom: 6 }}>
                        {item?.rank != null ? `${item.rank}. ` : ''}
                        {item?.name ?? '-'}
                        {item?.score != null ? `（评分：${item.score}）` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </ReportSection>
        )}
  
        {sandboxResult && (
          <ReportSection title="三、市场沙盘摘要">
            <div style={{ marginBottom: 10 }}>
              <strong>分析产品：</strong>
              {sandboxResult.productName ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>市场适配度：</strong>
              {sandboxResult.summary?.estimated_market_fit ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>转化潜力：</strong>
              {sandboxResult.summary?.conversion_potential ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>传播潜力：</strong>
              {sandboxResult.summary?.content_virality ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>信任风险：</strong>
              {sandboxResult.summary?.trust_risk ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>最大优势：</strong>
              {sandboxResult.summary?.main_strength ?? '-'}
            </div>
            <div>
              <strong>最大阻碍：</strong>
              {sandboxResult.summary?.main_barrier ?? '-'}
            </div>
          </ReportSection>
        )}
  
        {optimizationResult && (
          <ReportSection title="四、优化方案摘要">
            <div style={{ marginBottom: 10 }}>
              <strong>产品：</strong>
              {optimizationResult.productName ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>优化定位：</strong>
              {optimizationResult.optimized_positioning ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>优化目标人群：</strong>
              {optimizationResult.optimized_target_audience ?? '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>建议价格区间：</strong>
              {optimizationResult.recommended_price_range ?? '-'}
            </div>
            <div>
              <strong>卖点要点：</strong>
              {Array.isArray(optimizationResult.optimized_selling_points)
                ? optimizationResult.optimized_selling_points.join('；')
                : '-'}
            </div>
            <div style={{ marginTop: 10 }}>
              <strong>最终结论：</strong>
              {optimizationResult.final_verdict ?? '-'}
            </div>
          </ReportSection>
        )}
      </div>
    )
  }