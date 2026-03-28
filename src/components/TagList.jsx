export default function TagList({ title, items, tone = 'normal' }) {
  const bg = tone === 'good' ? '#ecfdf5' : tone === 'bad' ? '#fef2f2' : '#f9fafb'
  const color = tone === 'good' ? '#065f46' : tone === 'bad' ? '#991b1b' : '#374151'
  const border = tone === 'good' ? '#a7f3d0' : tone === 'bad' ? '#fecaca' : '#e5e7eb'
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(items || []).map((item, idx) => (
          <span
            key={idx}
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              fontSize: 13,
              background: bg,
              color,
              border: `1px solid ${border}`,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
