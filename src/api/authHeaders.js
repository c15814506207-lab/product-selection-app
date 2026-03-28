import { supabase } from '../lib/supabase'

/**
 * 调用 Supabase Edge Functions（verify_jwt 开启时须传登录用户的 access_token）。
 */
export async function getSupabaseFunctionAuthHeaders() {
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session?.access_token) {
    throw new Error('请先登录后再使用此功能')
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: anon,
  }
}
