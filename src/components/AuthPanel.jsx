import AuthForms from './AuthForms'
import '../styles/authPanel.css'

/** 全屏登录页（可选）；主站默认使用顶栏 + AuthModal。 */
export default function AuthPanel() {
  return (
    <div className="auth-panel">
      <div className="auth-panel__card">
        <AuthForms />
      </div>
    </div>
  )
}
