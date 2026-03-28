import {
  ANALYZE_URL,
  GENERATE_REPORT_URL,
  OPTIMIZE_IMAGE_URL,
  OPTIMIZE_URL,
  SANDBOX_URL,
} from '../config/edgeFunctions'
import { getSupabaseFunctionAuthHeaders } from './authHeaders'
import { trackApiUsage } from '../utils/apiUsageLedger'

export async function readJsonBody(res, buildParseError) {
  const rawText = await res.text()
  let data = {}
  try {
    data = rawText ? JSON.parse(rawText) : {}
  } catch {
    throw new Error(buildParseError(rawText))
  }
  return { data, rawText }
}

export async function requestAnalyzeThreeProducts(products) {
  const headers = await getSupabaseFunctionAuthHeaders()
  const res = await fetch(ANALYZE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ products }),
  })
  const { data, rawText } = await readJsonBody(res, (t) => `三产品分析返回不是合法 JSON：\n${t || '空响应'}`)
  trackApiUsage({
    step: 'analyze-product',
    endpoint: ANALYZE_URL,
    responsePayload: data,
    httpStatus: res.status,
  })
  if (!data?.success) {
    throw new Error(
      `${data?.error || '分析失败'}${data?.detail ? `\n\n${data.detail}` : ''}`
    )
  }
  return data.result ?? null
}

export async function requestSimulateMarket(product) {
  const headers = await getSupabaseFunctionAuthHeaders()
  const res = await fetch(SANDBOX_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ product }),
  })
  const { data, rawText } = await readJsonBody(res, (t) => `市场沙盘返回不是合法 JSON：\n${t || '空响应'}`)
  trackApiUsage({
    step: 'simulate-market',
    endpoint: SANDBOX_URL,
    responsePayload: data,
    httpStatus: res.status,
  })
  if (!data?.success) {
    throw new Error(
      `市场沙盘失败\n\n状态码：${res.status}\n\n原始返回：\n${rawText || '空响应'}`
    )
  }
  if (!data?.result) {
    throw new Error(
      `市场沙盘成功标记存在，但 result 为空\n\n原始返回：\n${rawText || '空响应'}`
    )
  }
  return data.result
}

export async function requestOptimizeProduct(product) {
  const headers = await getSupabaseFunctionAuthHeaders()
  const res = await fetch(OPTIMIZE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ product }),
  })
  const { data, rawText } = await readJsonBody(res, (t) => `优化方案返回不是合法 JSON：\n${t || '空响应'}`)
  trackApiUsage({
    step: 'optimize-product',
    endpoint: OPTIMIZE_URL,
    responsePayload: data,
    httpStatus: res.status,
  })
  if (!data?.success) {
    throw new Error(
      `${data?.error || '生成优化方案失败'}${data?.detail ? `\n\n${data.detail}` : ''}`
    )
  }
  return data.result ?? null
}

export async function requestGenerateWorkshopReport(payload) {
  const headers = await getSupabaseFunctionAuthHeaders()
  const res = await fetch(GENERATE_REPORT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  })
  const { data, rawText } = await readJsonBody(res, (t) => `生成报告返回不是合法 JSON：\n${t || '空响应'}`)
  trackApiUsage({
    step: 'generate-workshop-report',
    endpoint: GENERATE_REPORT_URL,
    responsePayload: data,
    httpStatus: res.status,
  })
  if (!data?.success) {
    throw new Error(`${data?.error || '生成报告失败'}${data?.detail ? `\n\n${data.detail}` : ''}`)
  }
  if (!data?.result) {
    throw new Error(`生成报告成功标记存在，但 result 为空\n\n原始返回：\n${rawText || '空响应'}`)
  }
  return data.result
}

export async function requestOptimizeProductImage(payload) {
  const headers = await getSupabaseFunctionAuthHeaders()
  const res = await fetch(OPTIMIZE_IMAGE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  })
  const { data, rawText } = await readJsonBody(
    res,
    (t) => `产品图优化返回不是合法 JSON：\n${t || '空响应'}`,
  )
  trackApiUsage({
    step: 'optimize-product-image',
    endpoint: OPTIMIZE_IMAGE_URL,
    responsePayload: data,
    httpStatus: res.status,
  })
  if (!data?.success) {
    throw new Error(`${data?.error || '产品图优化失败'}${data?.detail ? `\n\n${data.detail}` : ''}`)
  }
  if (!data?.result) {
    throw new Error(`产品图优化成功标记存在，但 result 为空\n\n原始返回：\n${rawText || '空响应'}`)
  }
  return data.result
}
