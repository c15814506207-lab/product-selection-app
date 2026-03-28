import { CREATE_ALIPAY_PAGE_PAY_URL } from '../config/edgeFunctions'
import { getSupabaseFunctionAuthHeaders } from './authHeaders'

/**
 * 跳转支付宝「电脑网站支付」（需已部署 create-alipay-page-pay 并配置支付宝密钥与回调 URL）。
 * @param {'p100' | 'p500' | 'p1000'} pack
 */
export async function requestAlipayPagePay(pack) {
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
    const msg = data?.error || data?.detail || `创建支付失败（HTTP ${res.status}）`
    throw new Error(msg)
  }
  window.location.assign(data.url)
}
