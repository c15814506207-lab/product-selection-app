import { Routes, Route } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import RootLayout from './layouts/RootLayout'
import HomePage from './pages/HomePage'
import FeatureWorkspacePage from './pages/FeatureWorkspacePage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import BillingPage from './pages/BillingPage'
import './styles/appShell.css'

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="app-auth-loading">
        <p>载入中…</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="workspace" element={<FeatureWorkspacePage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="billing" element={<BillingPage />} />
      </Route>
    </Routes>
  )
}
