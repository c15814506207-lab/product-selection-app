import { supabase } from '../lib/supabase'

/**
 * 调用 Supabase Edge Functions（verify_jwt 开启时须传登录用户的 access_token）。
 * 先 getUser 校验，再取 session；若无 token 则 refreshSession，减少因 access_token 过期导致的 HTTP 401。
 */
export async function getSupabaseFunctionAuthHeaders() {
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!anon) {
    throw new Error('缺少 VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  await supabase.auth.getUser()

  let {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    const { data, error: refErr } = await supabase.auth.refreshSession()
    if (refErr || !data?.session?.access_token) {
      throw new Error('请先登录后再使用此功能')
    }
    session = data.session
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: anon,
  }
}
