import { supabase } from '../lib/supabase'

/**
 * 当前用户在 products 表中的记录（用于首页「产品展览馆」）。
 */
export async function fetchUserProductsForGallery(userId) {
  if (!userId) return []

  const buildBase = () =>
    supabase
      .from('products')
      .select(
        'id, name, price, material, style, target_audience, selling_points, image_url, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)

  // 兼容：数据库尚未加 deleted_at/purge_at 字段时，不应阻塞页面
  let data
  let error
  ;({ data, error } = await buildBase().is('deleted_at', null))
  if (error && String(error.message || '').includes('deleted_at')) {
    ;({ data, error } = await buildBase())
  }

  if (error) {
    throw new Error(`读取产品展览馆失败：${error.message}`)
  }

  return data || []
}
