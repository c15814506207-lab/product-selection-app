const STATUS_MAP = {
  idle: { text: '空闲', color: '#64748b', icon: '○' },
  running: { text: '运行中', color: '#2563eb', icon: '●' },
  success: { text: '已完成', color: '#16a34a', icon: '✓' },
  error: { text: '出错', color: '#dc2626', icon: '!' },
}

export default function WorkspaceStatusBadge({ status }) {
  const meta = STATUS_MAP[status] || STATUS_MAP.idle
  return (
    <span
      className="workspace-status-badge"
      style={{
        color: meta.color,
      }}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.text}</span>
    </span>
  )
}
