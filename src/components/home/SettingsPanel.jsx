import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function SettingsPanel({ onClose }) {
  const { user, updateUserProfile } = useAuth()
  const [name, setName] = useState(user?.user_metadata?.name || user?.email?.split('@')[0] || '')
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState(user?.email || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [activeSection, setActiveSection] = useState(null)

  useEffect(() => {
    setName(user?.user_metadata?.name || user?.email?.split('@')[0] || '')
    setPhone(user?.user_metadata?.phone || '')
    setNewEmail(user?.email || '')
  }, [user])

  function showMsg(type, text) {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  async function handleSaveName() {
    const v = String(name || '').trim()
    if (!v) {
      showMsg('error', '用户名不能为空')
      return
    }
    setLoading(true)
    try {
      await updateUserProfile({ data: { ...user?.user_metadata, name: v } })
      showMsg('success', '用户名已更新')
      setActiveSection(null)
    } catch (e) {
      showMsg('error', e.message || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleSavePhone() {
    setLoading(true)
    try {
      await updateUserProfile({ data: { ...user?.user_metadata, phone } })
      showMsg('success', '手机号已更新')
      setActiveSection(null)
    } catch (e) {
      showMsg('error', e.message || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleSavePassword() {
    if (newPassword !== confirmPassword) {
      showMsg('error', '两次输入的密码不一致')
      return
    }
    if (newPassword.length < 6) {
      showMsg('error', '密码至少 6 位')
      return
    }
    setLoading(true)
    try {
      await updateUserProfile({ password: newPassword })
      showMsg('success', '密码已更新')
      setNewPassword('')
      setConfirmPassword('')
      setActiveSection(null)
    } catch (e) {
      showMsg('error', e.message || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveEmail() {
    const v = String(newEmail || '').trim()
    if (!v || !v.includes('@')) {
      showMsg('error', '请输入有效邮箱')
      return
    }
    setLoading(true)
    try {
      await updateUserProfile({ email: v })
      showMsg('success', '邮箱已更新（如需验证请查收邮件）')
      setActiveSection(null)
    } catch (e) {
      showMsg('error', e.message || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__sections">
        <div className="settings-panel__section">
          <h4 className="settings-panel__label">用户名</h4>
          {activeSection === 'name' ? (
            <div className="settings-panel__edit">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入用户名"
                className="settings-panel__input"
              />
              <div className="settings-panel__actions">
                <button type="button" className="settings-panel__btn" onClick={() => setActiveSection(null)}>
                  取消
                </button>
                <button type="button" className="settings-panel__btn settings-panel__btn--primary" onClick={handleSaveName} disabled={loading}>
                  {loading ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-panel__row">
              <span className="settings-panel__value">{user?.user_metadata?.name || user?.email?.split('@')[0] || '—'}</span>
              <button type="button" className="settings-panel__link" onClick={() => setActiveSection('name')}>
                修改
              </button>
            </div>
          )}
        </div>

        <div className="settings-panel__section">
          <h4 className="settings-panel__label">邮箱</h4>
          {activeSection === 'email' ? (
            <div className="settings-panel__edit">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="请输入新邮箱"
                className="settings-panel__input"
              />
              <div className="settings-panel__actions">
                <button type="button" className="settings-panel__btn" onClick={() => setActiveSection(null)}>
                  取消
                </button>
                <button type="button" className="settings-panel__btn settings-panel__btn--primary" onClick={handleSaveEmail} disabled={loading}>
                  {loading ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-panel__row">
              <span className="settings-panel__value">{user?.email || '—'}</span>
              <button type="button" className="settings-panel__link" onClick={() => setActiveSection('email')}>
                修改
              </button>
            </div>
          )}
        </div>

        <div className="settings-panel__section">
          <h4 className="settings-panel__label">手机号</h4>
          {activeSection === 'phone' ? (
            <div className="settings-panel__edit">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="settings-panel__input"
              />
              <div className="settings-panel__actions">
                <button type="button" className="settings-panel__btn" onClick={() => setActiveSection(null)}>
                  取消
                </button>
                <button type="button" className="settings-panel__btn settings-panel__btn--primary" onClick={handleSavePhone} disabled={loading}>
                  {loading ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-panel__row">
              <span className="settings-panel__value">{user?.user_metadata?.phone || '—'}</span>
              <button type="button" className="settings-panel__link" onClick={() => setActiveSection('phone')}>
                修改
              </button>
            </div>
          )}
        </div>

        <div className="settings-panel__section">
          <h4 className="settings-panel__label">密码</h4>
          {activeSection === 'password' ? (
            <div className="settings-panel__edit">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码"
                className="settings-panel__input"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="确认新密码"
                className="settings-panel__input"
              />
              <div className="settings-panel__actions">
                <button type="button" className="settings-panel__btn" onClick={() => setActiveSection(null)}>
                  取消
                </button>
                <button type="button" className="settings-panel__btn settings-panel__btn--primary" onClick={handleSavePassword} disabled={loading}>
                  {loading ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-panel__row">
              <span className="settings-panel__value">••••••••</span>
              <button type="button" className="settings-panel__link" onClick={() => setActiveSection('password')}>
                修改
              </button>
            </div>
          )}
        </div>

        <div className="settings-panel__section">
          <h4 className="settings-panel__label">账号安全</h4>
          <p className="settings-panel__hint">建议定期更换密码，并绑定手机号以便找回。</p>
        </div>

        <div className="settings-panel__section">
          <h4 className="settings-panel__label">通知偏好</h4>
          <p className="settings-panel__hint">功能开发中</p>
        </div>
      </div>

      {message.text && (
        <div className={`settings-panel__toast settings-panel__toast--${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}
