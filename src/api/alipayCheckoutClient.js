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
  // SDK 默认 POST：返回表单 HTML。比 document.write 更稳：解析出 form 并由我们主动提交。
  if (typeof payload === 'string' && /<form/i.test(payload)) {
    const parsed = new DOMParser().parseFromString(payload, 'text/html')
    const form = parsed.querySelector('form')
    if (!form) throw new Error('支付宝跳转表单解析失败')

    const liveForm = document.importNode(form, true)
    liveForm.style.display = 'none'
    document.body.appendChild(liveForm)
    liveForm.submit()
    return
  }
  window.location.assign(payload)
}
