import { readJsonBody } from './edgeFunctionsClient'
import { getSupabaseFunctionAuthHeaders } from './authHeaders'
import { FILL_FROM_IMAGE_URL } from '../config/edgeFunctions'
import { trackApiUsage } from '../utils/apiUsageLedger'

/**
 * 调用 Edge Function「识图填表」。
 * 约定请求：POST { "image_url": string }
 * 约定响应：{ "success": true, "result": { "name"?, "price"?, "material"?, "style"?, "target_audience"?, "selling_points"? } }
 * selling_points 可为 string 或 string[]
 */
export async function requestFillProductFromImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('识图填表需要有效的产品图片地址')
  }

  const headers = await getSupabaseFunctionAuthHeaders()

  const res = await fetch(FILL_FROM_IMAGE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image_url: imageUrl }),
  })

  const { data, rawText } = await readJsonBody(res, (t) => `识图填表返回不是合法 JSON：\n${t || '空响应'}`)
  trackApiUsage({
    step: 'fill-product-from-image',
    endpoint: FILL_FROM_IMAGE_URL,
    responsePayload: data,
    httpStatus: res.status,
  })

  if (!data?.success) {
    throw new Error(
      `${data?.error || '识图填表失败'}${data?.detail ? `\n\n${data.detail}` : ''}`
    )
  }

  return data.result && typeof data.result === 'object' ? data.result : {}
}
