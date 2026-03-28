import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import '../styles/authPanel.css'

/**
 * 登录/注册表单（卡片内内容）。外层由 AuthPanel 或 AuthModal 提供布局。
 */
export default function AuthForms({ initialAuthTab = 'signin', onAuthenticated }) {
  const { signInWithEmail, signUpWithEmail, verifySignUpOtp, resendSignupEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [otp, setOtp] = useState('')
  const [mode, setMode] = useState(initialAuthTab === 'signup' ? 'signup' : 'signin')
  const [signupPhase, setSignupPhase] = useState('credentials')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMode(initialAuthTab === 'signup' ? 'signup' : 'signin')
    setSignupPhase('credentials')
    setPasswordConfirm('')
    setOtp('')
    setMessage('')
  }, [initialAuthTab])

  function resetSignupFlow() {
    setSignupPhase('credentials')
    setPasswordConfirm('')
    setOtp('')
  }

  function switchMode(next) {
    setMode(next)
    setMessage('')
    resetSignupFlow()
    if (next === 'signin') {
      setPasswordConfirm('')
    }
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setMessage('')
    setBusy(true)
    try {
      await signInWithEmail(email, password)
      onAuthenticated?.()
    } catch (err) {
      setMessage(err.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleSignUpRequestCode(e) {
    e.preventDefault()
    setMessage('')

    if (password !== passwordConfirm) {
      setMessage('两次输入的密码不一致，请重新输入')
      return
    }
    if (password.length < 6) {
      setMessage('密码至少 6 位')
      return
    }

    setBusy(true)
    try {
      const data = await signUpWithEmail(email, password)
      if (data?.session) {
        setMessage(
          '注册成功，已自动登录。若您希望必须输入邮箱验证码，请在 Supabase → Authentication → Email 中开启「Confirm email」。',
        )
        resetSignupFlow()
        onAuthenticated?.()
        return
      }
      if (data?.user) {
        setSignupPhase('otp')
        setOtp('')
        setMessage(
          '验证码已发送至您的邮箱，请填写邮件中的 6 位数字后点击「完成注册」。若邮件里只有链接、没有数字，请到 Supabase → Authentication → Email Templates →「Confirm signup」模板中加入 {{ .Token }}。',
        )
        return
      }
      setMessage('注册请求已提交，请按邮箱提示操作。')
    } catch (err) {
      setMessage(err.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setMessage('')
    const code = otp.replace(/\s/g, '')
    if (!/^\d{6}$/.test(code)) {
      setMessage('请输入邮件中的 6 位数字验证码')
      return
    }
    setBusy(true)
    try {
      await verifySignUpOtp(email, code)
      setMessage('验证成功，正在登录…')
      resetSignupFlow()
      onAuthenticated?.()
    } catch (err) {
      setMessage(err.message || '验证码无效或已过期，请重试或重新发送')
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    setMessage('')
    setBusy(true)
    try {
      await resendSignupEmail(email)
      setMessage('验证码已重新发送，请查收邮箱。')
    } catch (err) {
      setMessage(err.message || '发送失败，请稍后再试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="auth-panel__title">三产品 AI 选品分析系统</h1>
      <p className="auth-panel__hint">请登录或注册，您的分析记录仅本人可见。</p>
      {mode === 'signup' && signupPhase === 'credentials' && (
        <p className="auth-panel__subhint">
          注册需<strong>两次密码一致</strong>，提交后将向邮箱发送<strong>6 位验证码</strong>，输入验证码后完成注册。
        </p>
      )}

      <div className="auth-panel__tabs">
        <button
          type="button"
          className={mode === 'signin' ? 'auth-panel__tab auth-panel__tab--active' : 'auth-panel__tab'}
          onClick={() => switchMode('signin')}
        >
          登录
        </button>
        <button
          type="button"
          className={mode === 'signup' ? 'auth-panel__tab auth-panel__tab--active' : 'auth-panel__tab'}
          onClick={() => switchMode('signup')}
        >
          注册
        </button>
      </div>

      {mode === 'signin' && (
        <form className="auth-panel__form" onSubmit={handleSignIn}>
          <label className="auth-panel__label">
            邮箱
            <input
              className="auth-panel__input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-panel__label">
            密码
            <input
              className="auth-panel__input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <button type="submit" className="auth-panel__submit" disabled={busy}>
            {busy ? '请稍候…' : '登录'}
          </button>
        </form>
      )}

      {mode === 'signup' && signupPhase === 'credentials' && (
        <form className="auth-panel__form" onSubmit={handleSignUpRequestCode}>
          <label className="auth-panel__label">
            邮箱
            <input
              className="auth-panel__input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-panel__label">
            密码
            <input
              className="auth-panel__input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label className="auth-panel__label">
            确认密码
            <input
              className="auth-panel__input"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <button type="submit" className="auth-panel__submit" disabled={busy}>
            {busy ? '请稍候…' : '发送验证码到邮箱'}
          </button>
        </form>
      )}

      {mode === 'signup' && signupPhase === 'otp' && (
        <form className="auth-panel__form" onSubmit={handleVerifyOtp}>
          <p className="auth-panel__otp-email">
            验证码已发送至：<strong>{email}</strong>
          </p>
          <label className="auth-panel__label">
            邮箱验证码（6 位数字）
            <input
              className="auth-panel__input auth-panel__input--otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </label>
          <button type="submit" className="auth-panel__submit" disabled={busy}>
            {busy ? '请稍候…' : '完成注册'}
          </button>
          <div className="auth-panel__row">
            <button
              type="button"
              className="auth-panel__linkish"
              disabled={busy}
              onClick={() => void handleResend()}
            >
              重新发送验证码
            </button>
            <button
              type="button"
              className="auth-panel__linkish"
              disabled={busy}
              onClick={() => {
                resetSignupFlow()
                setMessage('')
              }}
            >
              返回修改邮箱或密码
            </button>
          </div>
        </form>
      )}

      {message && <p className="auth-panel__message">{message}</p>}
    </>
  )
}
