export default function ScoreBadge({ score, isWinner }) {
  return (
    <div
      style={{
        minWidth: 96,
        height: 96,
        borderRadius: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: isWinner ? '#111827' : '#f3f4f6',
        color: isWinner ? '#fff' : '#111827',
        border: isWinner ? 'none' : '1px solid #e5e7eb',
        boxShadow: isWinner ? '0 10px 30px rgba(17,24,39,0.18)' : 'none',
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>综合评分</div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{score ?? '-'}</div>
      <div style={{ fontSize: 12, opacity: 0.8 }}>/ 10</div>
    </div>
  )
}
