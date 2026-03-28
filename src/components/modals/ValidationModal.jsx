const FIELD_LABELS = {
  name: '产品名称',
  image_url: '产品主图',
  price: '售价',
  material: '材质',
  style: '风格/类型',
  selling_points: '核心卖点',
  target_audience: '目标人群',
  usage_scenario: '使用场景',
}

export function toFieldLabel(fieldKey) {
  return FIELD_LABELS[fieldKey] || fieldKey
}

export default function ValidationModal({ open, items, onGoFix, onCancel }) {
  if (!open) return null

  return (
    <div className="app-modal-overlay">
      <button type="button" className="app-modal-backdrop" aria-label="关闭" onClick={onCancel} />
      <div className="app-modal-card">
        <h3 style={{ marginTop: 0 }}>信息不完整，暂不能开始模拟</h3>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {items.map((item) => (
            <div key={item.slotId} style={{ lineHeight: 1.7 }}>
              <strong>产品槽位 {item.slotId}：</strong>
              缺少 {item.missing.map(toFieldLabel).join('、')}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" className="app-ghost-btn" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="app-analyze-button" onClick={onGoFix}>
            前往完善信息
          </button>
        </div>
      </div>
    </div>
  )
}
