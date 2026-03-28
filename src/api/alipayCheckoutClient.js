import { CREATE_ALIPAY_PAGE_PAY_URL } from '../config/edgeFunctions'
import { getSupabaseFunctionAuthHeaders } from './authHeaders'
import { supabase } from '../lib/supabase'

/**
 * 跳转支付宝「电脑网站支付」（需已部署 create-alipay-page-pay 并配置支付宝密钥与回调 URL）。
 * @param {'p100' | 'p500' | 'p1000'} pack
 */
export async function requestAlipayPagePay(pack) {
  await supabase.auth.refreshSession()
  const headers = await getSupabaseFunctionAuthHeaders()
  const res = await fetch(CREATE_ALIPAY_PAGE_PAY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ pack }),
  })
  let data = {}
  try {
    data = await res.json()
  } catch {
    /* ignore */
  }
  if (!res.ok || !data?.success || !data?.url) {
    const serverMsg = data?.error || data?.detail || data?.message || data?.msg
    const hint =
      res.status === 401
        ? '（请退出后重新登录；并确认 Netlify 的 VITE_SUPABASE_URL 与 VITE_SUPABASE_PUBLISHABLE_KEY 来自同一 Supabase 项目，且与部署 Edge Functions 的项目一致）'
        : ''
    const msg = (serverMsg || `创建支付失败（HTTP ${res.status}）`) + hint
    throw new Error(msg)
  }
  const payload = data.url
  // SDK 默认 POST：返回自动提交表单的 HTML；GET 时才是网关 URL（见 create-alipay-page-pay）
  if (typeof payload === 'string' && /<form/i.test(payload)) {
    document.open()
    document.write(payload)
    document.close()
  } else {
    window.location.assign(payload)
  }
}
