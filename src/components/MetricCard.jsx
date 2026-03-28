export default function MetricCard({ label, value }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{value ?? '-'}</div>
    </div>
  )
}
