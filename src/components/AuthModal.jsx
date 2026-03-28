import { useEffect } from 'react'
import AuthForms from './AuthForms'
import '../styles/authModal.css'

export default function AuthModal({ open, initialTab, onClose, onAuthenticated }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <button type="button" className="auth-modal__backdrop" aria-label="关闭" onClick={onClose} />
      <div className="auth-modal__dialog">
        <button type="button" className="auth-modal__close" aria-label="关闭" onClick={onClose}>
          ×
        </button>
        <div className="auth-panel__card auth-panel__card--modal">
          <span id="auth-modal-title" className="visually-hidden">
            登录或注册
          </span>
          <AuthForms key={`${open}-${initialTab}`} initialAuthTab={initialTab} onAuthenticated={onAuthenticated} />
        </div>
      </div>
    </div>
  )
}
