import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      async signInWithEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return data
      },
      async signUpWithEmail(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        return data
      },
      async verifySignUpOtp(email, token) {
        const trimmed = String(token || '').trim()
        if (!trimmed) {
          throw new Error('请输入验证码')
        }
        const trySignup = await supabase.auth.verifyOtp({
          email,
          token: trimmed,
          type: 'signup',
        })
        if (!trySignup.error) return trySignup.data
        const tryEmail = await supabase.auth.verifyOtp({
          email,
          token: trimmed,
          type: 'email',
        })
        if (!tryEmail.error) return tryEmail.data
        throw trySignup.error || tryEmail.error
      },
      async resendSignupEmail(email) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        })
        if (error) throw error
      },
      async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
      async updateUserProfile(updates) {
        const { data, error } = await supabase.auth.updateUser(updates)
        if (error) throw error
        if (data?.user) setSession((s) => (s ? { ...s, user: data.user } : null))
        return data
      },
      async refreshSession() {
        const { data } = await supabase.auth.getSession()
        setSession(data?.session ?? null)
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
