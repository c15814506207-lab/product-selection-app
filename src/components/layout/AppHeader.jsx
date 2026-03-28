import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import '../../styles/siteHeader.css'

export default function AppHeader({ onLoginClick, onRegisterClick }) {
  const { user, signOut } = useAuth()

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__brand">
          AI 选品分析
        </Link>

        <nav className="site-header__nav" aria-label="主导航">
          <NavLink to="/" end className="site-header__link">
            首页
          </NavLink>
          {user && (
            <NavLink to="/workspace" className="site-header__link">
              分析工作台
            </NavLink>
          )}
          <NavLink to="/billing" className="site-header__link">
            计费说明
          </NavLink>
        </nav>

        <div className="site-header__actions">
          {!user ? (
            <>
              <button type="button" className="site-header__btn site-header__btn--ghost" onClick={onLoginClick}>
                登录
              </button>
              <button type="button" className="site-header__btn site-header__btn--primary" onClick={onRegisterClick}>
                注册
              </button>
            </>
          ) : (
            <div className="site-header__account">
              <span className="site-header__balance" title="订阅与计费功能可后续接入">
                账户余额：—
              </span>
              <details className="site-header__menu">
                <summary className="site-header__summary">
                  <span className="site-header__email">{user.email}</span>
                </summary>
                <div className="site-header__dropdown">
                  <div className="site-header__dropdown-meta">已登录账户</div>
                  <button type="button" className="site-header__dropdown-item" onClick={() => void signOut()}>
                    退出登录
                  </button>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
