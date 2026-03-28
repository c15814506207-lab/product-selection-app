import { supabase } from '../lib/supabase'

export async function insertProductsAndGetIds(productsInput, userId) {
  if (!userId) {
    throw new Error('未登录，无法保存产品')
  }

  const rows = productsInput.map((p) => ({
    name: p.name,
    price: Number(p.price),
    material: p.material,
    style: p.style,
    target_audience: p.target_audience,
    selling_points: p.selling_points,
    image_url: p.image_url,
    description: null,
    user_id: userId,
  }))
  const { data, error } = await supabase.from('products').insert(rows).select('id, name')

  if (error) {
    throw new Error(`写入 products 失败：${error.message}`)
  }

  if (!data || data.length !== rows.length) {
    throw new Error('products 写入成功，但返回记录数量不完整')
  }

  return data
}

export async function saveAnalysisToExistingTables(insertedProducts, analysis, userId) {
  if (!userId) {
    throw new Error('未登录，无法保存分析')
  }

  const productIdMap = {}
  insertedProducts.forEach((p) => {
    productIdMap[p.name] = p.id
  })
  const seenProductIds = new Set()
  const analysisRows = (analysis.products || [])
    .map((item) => ({
      product_id: productIdMap[item.name] ?? null,
      ai_score: item.score ?? null,
      recommendation: item.suggestion ?? '',
      strengths: Array.isArray(item.strengths) ? item.strengths.join('；') : '',
      weaknesses: Array.isArray(item.weaknesses) ? item.weaknesses.join('；') : '',
    }))
    .filter((row) => row.product_id)
    .filter((row) => {
      if (seenProductIds.has(row.product_id)) return false
      seenProductIds.add(row.product_id)
      return true
    })

  if (!analysisRows.length) {
    throw new Error('保存 product_analysis 失败：分析结果没有可入库的产品')
  }

  const { error: analysisInsertError } = await supabase.from('product_analysis').insert(analysisRows)

  if (analysisInsertError) {
    throw new Error(`保存到 product_analysis 失败：${analysisInsertError.message}`)
  }

  const ranking = analysis?.comparison?.ranking || []
  const winnerName = analysis?.comparison?.best_choice_name || ranking[0]?.name || null

  const comparisonRow = {
    first_product_id: insertedProducts[0]?.id ?? null,
    second_product_id: insertedProducts[1]?.id ?? null,
    third_product_id: insertedProducts[2]?.id ?? null,
    winner_product_id: winnerName ? productIdMap[winnerName] ?? null : null,
    summary: analysis?.comparison?.summary || null,
    user_id: userId,
  }

  const { error: comparisonInsertError } = await supabase
    .from('comparison_results')
    .insert([comparisonRow])

  if (comparisonInsertError) {
    throw new Error(`保存到 comparison_results 失败：${comparisonInsertError.message}`)
  }
}

export async function saveOptimizationToDatabase(productData, result, productName, userId) {
  if (!userId) {
    throw new Error('未登录，无法保存优化记录')
  }

  const { error } = await supabase.from('product_optimizations').insert([
    {
      product_name: productName,
      original_product_input: productData,
      optimization_result: result,
      optimized_positioning: result?.optimized_positioning || null,
      optimized_target_audience: result?.optimized_target_audience || null,
      recommended_price_range: result?.recommended_price_range || null,
      final_verdict: result?.final_verdict || null,
      user_id: userId,
    },
  ])
  if (error) {
    throw new Error(`保存优化方案失败：${error.message}`)
  }
}

export async function fetchMergedComparisonHistory(userId) {
  if (!userId) {
    return []
  }

  const { data: comparisons, error: comparisonError } = await supabase
    .from('comparison_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (comparisonError) {
    throw new Error(`读取 comparison_results 失败：${comparisonError.message}`)
  }

  if (!comparisons || comparisons.length === 0) {
    return []
  }

  const productIds = []
  comparisons.forEach((item) => {
    if (item.first_product_id) productIds.push(item.first_product_id)
    if (item.second_product_id) productIds.push(item.second_product_id)
    if (item.third_product_id) productIds.push(item.third_product_id)
    if (item.winner_product_id) productIds.push(item.winner_product_id)
  })

  const uniqueProductIds = [...new Set(productIds)]

  const { data: productRows, error: productError } = await supabase
    .from('products')
    .select('*')
    .in('id', uniqueProductIds)

  if (productError) {
    throw new Error(`读取 products 失败：${productError.message}`)
  }

  const { data: analysisRows, error: analysisError } = await supabase
    .from('product_analysis')
    .select('*')
    .in('product_id', uniqueProductIds)

  if (analysisError) {
    throw new Error(`读取 product_analysis 失败：${analysisError.message}`)
  }

  const productMap = {}
  ;(productRows || []).forEach((p) => {
    productMap[p.id] = p
  })

  const analysisMap = {}
  ;(analysisRows || []).forEach((a) => {
    analysisMap[a.product_id] = a
  })

  return comparisons.map((item) => {
    const first = productMap[item.first_product_id] || null
    const second = productMap[item.second_product_id] || null
    const third = productMap[item.third_product_id] || null
    const winner = productMap[item.winner_product_id] || null

    const detailProducts = [first, second, third]
      .filter(Boolean)
      .map((p) => ({
        ...p,
        analysis: analysisMap[p.id] || null,
      }))

    return {
      id: item.id,
      created_at: item.created_at,
      summary: item.summary,
      winner,
      products: detailProducts,
    }
  })
}

/**
 * 当前用户在 products 表中、且在 product_analysis 中有记录的产品 id 集合。
 */
export async function fetchAnalyzedProductIdsForUser(userId) {
  if (!userId) return new Set()

  const { data: productRows, error: pErr } = await supabase
    .from('products')
    .select('id')
    .eq('user_id', userId)

  if (pErr) {
    throw new Error(`读取 products 失败：${pErr.message}`)
  }

  const ids = (productRows || []).map((r) => r.id).filter(Boolean)
  if (!ids.length) return new Set()

  const { data: analysisRows, error: aErr } = await supabase
    .from('product_analysis')
    .select('product_id')
    .in('product_id', ids)

  if (aErr) {
    throw new Error(`读取 product_analysis 失败：${aErr.message}`)
  }

  const out = new Set()
  ;(analysisRows || []).forEach((r) => {
    if (r?.product_id != null) out.add(String(r.product_id))
  })
  return out
}

/**
 * 产品目录 / 详情弹窗：拉取单个产品的完整信息（基本信息 + 分析 + 同名优化记录）。
 */
export async function fetchProductCatalogDetail(userId, productId) {
  if (!userId || productId == null) return null
  const sid = String(productId)

  const { data: product, error: pErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', sid)
    .eq('user_id', userId)
    .maybeSingle()

  if (pErr || !product) return null

  const { data: analysisRows, error: aErr } = await supabase
    .from('product_analysis')
    .select('*')
    .eq('product_id', sid)
    .order('created_at', { ascending: false })
    .limit(1)

  if (aErr) {
    throw new Error(`读取 product_analysis 失败：${aErr.message}`)
  }
  const analysis = Array.isArray(analysisRows) && analysisRows.length ? analysisRows[0] : null

  let optQ = supabase
    .from('product_optimizations')
    .select('*')
    .eq('user_id', userId)
    .eq('product_name', product.name)
    .order('created_at', { ascending: false })
  let optimizations
  let optErr
  ;({ data: optimizations, error: optErr } = await optQ.is('deleted_at', null))
  if (optErr && String(optErr.message || '').includes('deleted_at')) {
    ;({ data: optimizations, error: optErr } = await supabase
      .from('product_optimizations')
      .select('*')
      .eq('user_id', userId)
      .eq('product_name', product.name)
      .order('created_at', { ascending: false }))
  }
  if (optErr) {
    throw new Error(`读取优化记录失败：${optErr.message}`)
  }

  return {
    product,
    analysis: analysis || null,
    optimizations: optimizations || [],
  }
}

export async function fetchOptimizationHistoryRows(userId) {
  if (!userId) {
    return []
  }

  // 兼容：数据库尚未加 deleted_at/purge_at 字段时，不应阻塞页面
  const q = supabase
    .from('product_optimizations')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  let data
  let error
  ;({ data, error } = await q)
  if (error && String(error.message || '').includes('deleted_at')) {
    ;({ data, error } = await supabase
      .from('product_optimizations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }))
  }

  if (error) {
    throw new Error(`读取优化记录失败：${error.message}`)
  }

  return data || []
}

function addDaysIso(dateLike, days) {
  const d = dateLike instanceof Date ? new Date(dateLike.getTime()) : new Date(dateLike)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export async function schedulePurgeProducts(userId, productIds, retentionDays = 14) {
  if (!userId) throw new Error('未登录，无法删除产品')
  const ids = (productIds || []).map((x) => String(x)).filter(Boolean)
  if (!ids.length) return
  const now = new Date()
  const deleted_at = now.toISOString()
  const purge_at = addDaysIso(now, retentionDays)
  const { error } = await supabase
    .from('products')
    .update({ deleted_at, purge_at })
    .eq('user_id', userId)
    .in('id', ids)
  if (error) throw new Error(`标记产品删除失败：${error.message}`)
}

export async function schedulePurgeOptimizations(userId, optimizationIds, retentionDays = 14) {
  if (!userId) throw new Error('未登录，无法删除优化记录')
  const ids = (optimizationIds || []).map((x) => String(x)).filter(Boolean)
  if (!ids.length) return
  const now = new Date()
  const deleted_at = now.toISOString()
  const purge_at = addDaysIso(now, retentionDays)
  const { error } = await supabase
    .from('product_optimizations')
    .update({ deleted_at, purge_at })
    .eq('user_id', userId)
    .in('id', ids)
  if (error) throw new Error(`标记优化记录删除失败：${error.message}`)
}
