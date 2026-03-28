import { useCallback, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import AuthModal from '../components/AuthModal'

export default function RootLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [authModal, setAuthModal] = useState({ open: false, tab: 'signin' })
  const postAuthRedirectRef = useRef(null)

  const openAuthModal = useCallback((tab = 'signin', opts = {}) => {
    postAuthRedirectRef.current = opts.redirectTo ?? null
    setAuthModal({
      open: true,
      tab: tab === 'signup' ? 'signup' : 'signin',
    })
  }, [])

  const closeAuthModal = useCallback(() => {
    postAuthRedirectRef.current = null
    setAuthModal((m) => ({ ...m, open: false }))
  }, [])

  const handleAuthenticated = useCallback(() => {
    const dest = postAuthRedirectRef.current
    postAuthRedirectRef.current = null
    setAuthModal((m) => ({ ...m, open: false }))
    if (dest) navigate(dest)
  }, [navigate])

  return (
    <>
      {location.pathname !== '/' && !location.pathname.startsWith('/workspace') && (
        <AppHeader
          onLoginClick={() => openAuthModal('signin')}
          onRegisterClick={() => openAuthModal('signup')}
        />
      )}
      <Outlet context={{ openAuthModal }} />
      <AuthModal
        open={authModal.open}
        initialTab={authModal.tab}
        onClose={closeAuthModal}
        onAuthenticated={handleAuthenticated}
      />
    </>
  )
}
