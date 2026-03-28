import { forwardRef, useMemo } from 'react'

function statusMeta(status) {
  if (status === 'ready') return { text: '已就绪', color: '#16a34a' }
  if (status === 'incomplete') return { text: '待完善', color: '#d97706' }
  return { text: '未选择', color: '#64748b' }
}

const EDIT_FIELDS = [
  ['price', '售价'],
  ['material', '材质'],
  ['style', '风格/类型'],
  ['selling_points', '核心卖点'],
  ['target_audience', '目标人群'],
  ['usage_scenario', '使用场景'],
]

const SimulationProductSlot = forwardRef(function SimulationProductSlot(
  {
    slot,
    candidates,
    onSelectVersion,
    onUpdateField,
    registerFieldRef,
  },
  _,
) {
  const meta = statusMeta(slot.validationStatus)

  const selectedValue = useMemo(() => slot.selectedVersionId || '', [slot.selectedVersionId])

  return (
    <div className="app-slot-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>产品槽位 {slot.slotId}</h3>
        <span style={{ fontSize: 12, color: meta.color, fontWeight: 700 }}>{meta.text}</span>
      </div>

      <label style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>选择产品/版本</span>
        <select
          className="app-select"
          value={selectedValue}
          onChange={(e) => onSelectVersion(slot.slotId, e.target.value)}
        >
          <option value="">请选择</option>
          {candidates.map((item) => (
            <option key={item.versionId} value={item.versionId}>
              {item.versionName || item.snapshotData?.name || '未命名'}（{item.source}）
            </option>
          ))}
        </select>
      </label>

      {slot.selectedVersionId && (
        <div style={{ display: 'grid', gap: 10 }}>
          {EDIT_FIELDS.map(([fieldKey, label]) => {
            const hasError = slot.ui.highlightFields.includes(fieldKey) || slot.missingRequiredFields.includes(fieldKey)
            return (
              <label key={fieldKey} style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, color: hasError ? '#dc2626' : '#64748b' }}>{label}</span>
                <input
                  ref={registerFieldRef(slot.slotId, fieldKey)}
                  value={slot.editableSimulationFields[fieldKey] || ''}
                  onChange={(e) => onUpdateField(slot.slotId, fieldKey, e.target.value)}
                  className="app-text-input"
                  style={hasError ? { borderColor: '#dc2626', boxShadow: '0 0 0 1px #fecaca inset' } : undefined}
                />
              </label>
            )
          })}
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>产品主图 URL（只读）</span>
            <input
              ref={registerFieldRef(slot.slotId, 'image_url')}
              value={slot.displayInfo.image_url || ''}
              className="app-text-input"
              readOnly
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>产品名称（只读）</span>
            <input
              ref={registerFieldRef(slot.slotId, 'name')}
              value={slot.displayInfo.name || ''}
              className="app-text-input"
              readOnly
            />
          </label>
        </div>
      )}
    </div>
  )
})

export default SimulationProductSlot
