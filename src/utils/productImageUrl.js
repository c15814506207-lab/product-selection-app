import { supabase } from '../lib/supabase'

const BUCKET = 'products'

/** 是否为已存储的 Storage 对象路径（非完整 http URL） */
export function isProductImageStoragePath(value) {
  if (!value || typeof value !== 'string') return false
  if (value.startsWith('http://') || value.startsWith('https://')) return false
  return value.includes('/')
}

/**
 * 供 <img> 使用：公开 URL 原样返回；否则对私有桶生成短期签名 URL。
 */
export async function resolveProductImageDisplayUrl(value, expiresSec = 3600) {
  if (!value) return ''
  if (!isProductImageStoragePath(value)) return value
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(value, expiresSec)
  if (error || !data?.signedUrl) return ''
  return data.signedUrl
}

/**
 * 供 Edge / 外部 HTTP GET 使用（识图、分析等需要可下载的图片地址）。
 */
export async function resolveProductImageFetchUrl(value, expiresSec = 60 * 60 * 24) {
  if (!value) return ''
  if (!isProductImageStoragePath(value)) return value
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(value, expiresSec)
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || '无法生成图片访问链接，请重新上传')
  }
  return data.signedUrl
}
