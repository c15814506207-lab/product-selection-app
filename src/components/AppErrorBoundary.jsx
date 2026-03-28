import { Component } from 'react'

/** 捕获子树渲染错误，避免整页只剩黑底无提示（body 背景为深色时尤其明显） */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }

  static getDerivedStateFromError(err) {
    return { err }
  }

  render() {
    if (this.state.err) {
      const msg = this.state.err?.message || String(this.state.err)
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: 24,
            background: '#0f172a',
            color: '#fecaca',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.1rem', margin: '0 0 12px' }}>页面加载出错</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{msg}</pre>
          <p style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
            可尝试换用 Chrome / Edge，或清除本站缓存后刷新。若持续出现，请把上述文字发给开发者。
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
