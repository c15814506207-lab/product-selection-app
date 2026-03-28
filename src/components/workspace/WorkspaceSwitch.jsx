import WorkspaceStatusBadge from './WorkspaceStatusBadge'

function TabButton({ active, title, status, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`workspace-switch__tab${active ? ' workspace-switch__tab--active' : ''}`}
    >
      <span className="workspace-switch__tab-title">{title}</span>
      <WorkspaceStatusBadge status={status} />
    </button>
  )
}

export default function WorkspaceSwitch({ activeWorkspace, topTaskState, onSwitch }) {
  return (
    <div className="workspace-switch">
      <div className="workspace-switch__tabs">
        <TabButton
          active={activeWorkspace === 'productLab'}
          title="产品实验室"
          status={topTaskState.productLabTaskStatus}
          onClick={() => onSwitch('productLab')}
        />
        <TabButton
          active={activeWorkspace === 'marketSandbox'}
          title="市场模拟"
          status={topTaskState.marketSandboxTaskStatus}
          onClick={() => onSwitch('marketSandbox')}
        />
      </div>
      <div className="workspace-switch__hint">
        {activeWorkspace === 'productLab' ? '录入与分析 · 优化与版本' : '槽位配置 · 对照与结果'}
      </div>
    </div>
  )
}
