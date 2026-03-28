import { WALLET_DEBIT_URL } from '../config/edgeFunctions'
import { readJsonBody } from './edgeFunctionsClient'
import { getSupabaseFunctionAuthHeaders } from './authHeaders'

/**
 * 原子扣积分（需部署 wallet-debit + debit_points_atomic）。
 */
export async function requestWalletDebit({
  amountPoints,
  businessType,
  businessId,
  idempotencyKey,
  description,
  meta,
}) {
  const headers = await getSupabaseFunctionAuthHeaders()
  const res = await fetch(WALLET_DEBIT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount_points: amountPoints,
      business_type: businessType || 'api_usage',
      business_id: businessId || null,
      idempotency_key: idempotencyKey || null,
      description: description || null,
      meta: meta && typeof meta === 'object' ? meta : {},
    }),
  })
  const { data } = await readJsonBody(res, (t) => `wallet-debit 返回不是合法 JSON：\n${t || '空响应'}`)
  if (res.status === 402) {
    const err = new Error(data?.error || '积分不足')
    err.code = 'INSUFFICIENT_POINTS'
    err.balancePoints = data?.balance_points
    throw err
  }
  if (!res.ok || !data?.success) {
    const err = new Error(data?.error || data?.detail || `扣费失败（HTTP ${res.status}）`)
    err.detail = data?.detail
    throw err
  }
  return data.result ?? {}
}

// 加积分仅能通过 wallet-refund + WALLET_CREDIT_SECRET（x-internal-credit-secret），禁止在浏览器调用。
