import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  requestAnalyzeThreeProducts,
  requestSimulateMarket,
  requestOptimizeProduct,
} from '../api/edgeFunctionsClient'
import { requestFillProductFromImage } from '../api/fillFromImageClient'
import {
  insertProductsAndGetIds,
  saveAnalysisToExistingTables,
  saveOptimizationToDatabase,
} from '../services/productDatabase'
import { createEmptyProduct } from '../utils/productForm'
import { resolveProductImageFetchUrl } from '../utils/productImageUrl'

const ANALYZE_REQUIRED_FIELDS = [
  'name',
  'price',
  'material',
  'style',
  'target_audience',
  'selling_points',
  'image_url',
]

function isProductReadyForAnalyze(product) {
  return ANALYZE_REQUIRED_FIELDS.every((field) => {
    const v = product?.[field]
    if (v == null) return false
    const s = typeof v === 'string' ? v.trim() : String(v).trim()
    return !!s
  })
}

function buildAnalyzePayloadFromReadyProducts(readyProducts) {
  const safe = Array.isArray(readyProducts) ? readyProducts.filter(Boolean) : []
  if (!safe.length) return []
  const payload = []
  for (let i = 0; i < 3; i++) {
    const sourceIdx = Math.min(i, safe.length - 1)
    const src = safe[sourceIdx]
    payload.push({
      sourceIdx,
      product: {
        name: `${src.name}__analyze_${i + 1}`,
        price: Number(src.price),
        material: src.material,
        style: src.style,
        target_audience: src.target_audience,
        selling_points: src.selling_points,
        image_url: src.image_url,
      },
    })
  }
  return payload
}

function normalizeAnalyzeResult(aiResult, readyProducts, payloadMeta) {
  if (!aiResult || !Array.isArray(aiResult.products)) return aiResult
  const normalized = aiResult.products.map((item, idx) => {
    const sourceIdx = payloadMeta[idx]?.sourceIdx ?? 0
    const original = readyProducts[sourceIdx] || readyProducts[0] || {}
    return {
      ...item,
      name: original.name || item?.name || '',
    }
  })
  return {
    ...aiResult,
    products: normalized,
  }
}

function extractSuggestedPrice(priceRangeText) {
  if (!priceRangeText || typeof priceRangeText !== 'string') return ''
  const nums = priceRangeText.match(/\d+(\.\d+)?/g)
  if (!nums || nums.length === 0) return ''

  const values = nums.map(Number).filter((n) => !Number.isNaN(n))
  if (values.length === 0) return ''

  if (values.length === 1) return String(Math.round(values[0]))

  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return String(Math.round(avg))
}

export function useProductSelection(
  setErrorText,
  refreshComparisonHistory,
  refreshOptimizationHistory,
  userId,
) {
  const BEST_OF_N = 1
  const [products, setProducts] = useState([
    createEmptyProduct(),
    createEmptyProduct(),
    createEmptyProduct(),
  ])
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [sandboxResult, setSandboxResult] = useState(null)
  const [sandboxLoadingName, setSandboxLoadingName] = useState('')
  const [optimizationResult, setOptimizationResult] = useState(null)
  const [optimizingName, setOptimizingName] = useState('')
  const [aiFillLoadingByIndex, setAiFillLoadingByIndex] = useState({})
  const analyzableProductIndexes = products
    .map((p, idx) => (isProductReadyForAnalyze(p) ? idx : -1))
    .filter((idx) => idx >= 0)

  function isAiFillLoading(index) {
    return Boolean(aiFillLoadingByIndex?.[index])
  }

  function updateProduct(index, field, value) {
    setProducts((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function refillProductsFromHistory(record) {
    const nextProducts = [0, 1, 2].map((idx) => {
      const p = record.products[idx]
      if (!p) return createEmptyProduct()
      return {
        name: p.name || '',
        price: p.price ?? '',
        cost: p.cost ?? '',
        type: p.type ?? '',
        material: p.material || '',
        style: p.style || '',
        variants: p.variants ?? '',
        craft: p.craft ?? '',
        notes: p.notes ?? '',
        target_audience: p.target_audience || '',
        selling_points: p.selling_points || '',
        image_url: p.image_url || '',
        uploading_image: false,
      }
    })

    setProducts(nextProducts)
    setAnalysisResult(null)
    setSandboxResult(null)
    setOptimizationResult(null)
    setErrorText('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function refillFromOptimizationHistory(record) {
    const input = record.original_product_input || {}
    const nextProduct = {
      name: input.name || '',
      price: input.price ?? '',
      cost: input.cost ?? '',
      type: input.type ?? '',
      material: input.material || '',
      style: input.style || '',
      variants: input.variants ?? '',
      craft: input.craft ?? '',
      notes: input.notes ?? '',
      target_audience: input.target_audience || '',
      selling_points: input.selling_points || '',
      image_url: input.image_url || '',
      uploading_image: false,
    }

    setProducts([nextProduct, createEmptyProduct(), createEmptyProduct()])
    setOptimizationResult({
      productName: record.product_name,
      ...record.optimization_result,
    })
    setAnalysisResult(null)
    setSandboxResult(null)
    setErrorText('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function applyOptimizationToForm() {
    if (!optimizationResult?.productName) return
    const optimizedPrice = extractSuggestedPrice(
      optimizationResult.recommended_price_range,
    )

    const optimizedSellingPoints = Array.isArray(
      optimizationResult.optimized_selling_points,
    )
      ? optimizationResult.optimized_selling_points.join('；')
      : ''

    setProducts((prev) =>
      prev.map((p) => {
        if (p.name !== optimizationResult.productName) return p

        return {
          ...p,
          price: optimizedPrice || p.price,
          style: optimizationResult.optimized_positioning || p.style,
          target_audience:
            optimizationResult.optimized_target_audience || p.target_audience,
          selling_points: optimizedSellingPoints || p.selling_points,
        }
      }),
    )

    setErrorText('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleImageSelect(index, file) {
    if (!file) return
    setErrorText('')

    setProducts((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        uploading_image: true,
      }
      return next
    })

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      const uid = userData?.user?.id
      if (userErr || !uid) {
        throw new Error('请先登录后再上传图片')
      }

      const fileExt = file.name.split('.').pop()
      const objectPath = `${uid}/${Date.now()}_${index}_${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(objectPath, file)

      if (uploadError) {
        throw new Error(`产品 ${index + 1} 图片上传失败：${uploadError.message}`)
      }

      setProducts((prev) => {
        const next = [...prev]
        next[index] = {
          ...next[index],
          image_url: objectPath,
          uploading_image: false,
        }
        return next
      })
    } catch (err) {
      setProducts((prev) => {
        const next = [...prev]
        next[index] = {
          ...next[index],
          uploading_image: false,
        }
        return next
      })
      setErrorText(err.message || '图片上传失败')
    }
  }

  function mergeVisionPartial(raw) {
    if (!raw || typeof raw !== 'object') return {}
    const out = {}
    const textKeys = ['name', 'material', 'style', 'target_audience']
    for (const k of textKeys) {
      const v = raw[k]
      if (v == null) continue
      const s = typeof v === 'string' ? v.trim() : String(v).trim()
      if (s) out[k] = s
    }
    if (raw.price != null && raw.price !== '') {
      const num =
        typeof raw.price === 'number'
          ? raw.price
          : Number(String(raw.price).replace(/[^\d.]/g, ''))
      if (!Number.isNaN(num)) out.price = String(num)
    }
    let sp = raw.selling_points
    if (Array.isArray(sp)) {
      sp = sp.map((x) => (x == null ? '' : String(x).trim())).filter(Boolean).join('；')
    }
    if (typeof sp === 'string' && sp.trim()) out.selling_points = sp.trim()
    return out
  }

  async function handleAiFillFromImage(index) {
    const url = products[index]?.image_url
    if (!url) {
      setErrorText('请先上传图片后再使用 AI 识图填表')
      return
    }
    setErrorText('')
    setAiFillLoadingByIndex((prev) => ({ ...prev, [index]: true }))
    try {
      const fetchableUrl = await resolveProductImageFetchUrl(url)
      const raw = await requestFillProductFromImage(fetchableUrl)
      const partial = mergeVisionPartial(raw)
      if (Object.keys(partial).length === 0) {
        setErrorText('识图未返回可填入的字段，请检查 Edge Function 或稍后重试')
        return
      }
      setProducts((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], ...partial }
        return next
      })
    } catch (err) {
      setErrorText(err.message || '识图填表失败')
    } finally {
      setAiFillLoadingByIndex((prev) => ({ ...prev, [index]: false }))
    }
  }

  async function handleAnalyzeThreeProducts(onProgress) {
    setErrorText('')
    setAnalysisResult(null)
    setSandboxResult(null)
    setOptimizationResult(null)
    if (!analyzableProductIndexes.length) {
      setErrorText('请至少完整填写 1 个产品信息，并确保图片上传成功')
      return
    }

    try {
      if (!userId) {
        setErrorText('请先登录后再进行分析')
        return
      }

      setAnalyzing(true)
      onProgress?.({ done: 10, total: 100, label: '准备图片...' })

      const readyProducts = analyzableProductIndexes.map((idx) => products[idx])
      const payloadMeta = buildAnalyzePayloadFromReadyProducts(readyProducts)
      const uploadedProducts = await Promise.all(
        payloadMeta.map(async (entry) => ({
          ...entry.product,
          image_url: await resolveProductImageFetchUrl(entry.product.image_url),
        })),
      )

      onProgress?.({ done: 40, total: 100, label: 'AI 产品分析中...' })
      const aiRawResult = await requestAnalyzeThreeProducts(uploadedProducts)
      const aiResult = normalizeAnalyzeResult(aiRawResult, readyProducts, payloadMeta)
      setAnalysisResult(aiResult || null)

      onProgress?.({ done: 70, total: 100, label: '保存到实验室...' })
      const insertedProducts = await insertProductsAndGetIds(
        readyProducts.map((p) => ({
          name: p.name,
          price: Number(p.price),
          material: p.material,
          style: p.style,
          target_audience: p.target_audience,
          selling_points: p.selling_points,
          image_url: p.image_url,
        })),
        userId,
      )
      await saveAnalysisToExistingTables(insertedProducts, aiResult, userId)
      await refreshComparisonHistory()
      onProgress?.({ done: 100, total: 100, label: '完成' })
    } catch (err) {
      setErrorText(err.message || '处理失败')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleRunSandbox(productAnalysis) {
    setSandboxLoadingName(productAnalysis.name)
    setSandboxResult(null)
    setErrorText('')
    try {
      const matched = products.find((p) => p.name === productAnalysis.name)

      const productData = matched
        ? {
            name: matched.name,
            price: Number(matched.price),
            material: matched.material,
            style: matched.style,
            target_audience: matched.target_audience,
            selling_points: matched.selling_points,
          }
        : {
            name: productAnalysis.name,
            price: '',
            material: '',
            style: '',
            target_audience: '',
            selling_points: '',
          }

      const sandboxPayload = await requestSimulateMarket(productData)

      setSandboxResult({
        productName: productAnalysis.name,
        ...sandboxPayload,
      })
      setErrorText('')
    } catch (err) {
      setErrorText(err.message || '市场沙盘执行失败')
    } finally {
      setSandboxLoadingName('')
    }
  }

  async function handleOptimizeProduct(productAnalysis, productIndex = null, onProgress) {
    setOptimizingName(productAnalysis.name)
    setOptimizationResult(null)
    setErrorText('')
    try {
      const matched =
        typeof productIndex === 'number' ? products[productIndex] : products.find((p) => p.name === productAnalysis.name)

      const productData = matched
        ? {
            name: matched.name,
            price: Number(matched.price),
            material: matched.material,
            style: matched.style,
            target_audience: matched.target_audience,
            selling_points: matched.selling_points,
            image_url: matched.image_url
              ? await resolveProductImageFetchUrl(matched.image_url)
              : '',
          }
        : {
            name: productAnalysis.name,
            price: '',
            material: '',
            style: '',
            target_audience: '',
            selling_points: '',
            image_url: '',
          }

      const extractFirstNumber = (raw) => {
        if (raw == null) return ''
        if (typeof raw === 'number' && !Number.isNaN(raw)) return String(raw)
        const s = String(raw)
        const m = s.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
        return m ? m[1] : ''
      }

      const buildCandidateProduct = (base, payload) => {
        const sellingPoints = Array.isArray(payload?.optimized_selling_points)
          ? payload.optimized_selling_points.join('；')
          : base.selling_points
        const priceNum = extractFirstNumber(payload?.recommended_price_range) || String(base.price || '')
        return {
          ...base,
          price: Number(priceNum) || 0,
          style: payload?.optimized_positioning || base.style,
          target_audience: payload?.optimized_target_audience || base.target_audience,
          selling_points: sellingPoints,
        }
      }

      const evaluateCandidate = async (candidateProduct) => {
        // 复用三产品分析接口做“同一标准”打分；避免同名导致后端映射混乱，做 3 个不同 name 的拷贝
        const baseName = candidateProduct.name || 'candidate'
        const productsForScoring = [
          { ...candidateProduct, name: `${baseName}__A` },
          { ...candidateProduct, name: `${baseName}__B` },
          { ...candidateProduct, name: `${baseName}__C` },
        ]
        const result = await requestAnalyzeThreeProducts(productsForScoring)
        const score10 = result?.products?.[0]?.score
        const n = Number(score10)
        if (Number.isNaN(n)) return 0
        return Math.max(0, Math.min(100, Math.round(n * 10)))
      }

      let bestPayload = null
      let bestScore = -Infinity
      for (let i = 0; i < BEST_OF_N; i++) {
        onProgress?.({
          phase: 'optimize',
          candidateIndex: i,
          candidateCount: BEST_OF_N,
        })
        // eslint-disable-next-line no-await-in-loop
        const payload = await requestOptimizeProduct(productData)
        // eslint-disable-next-line no-await-in-loop
        const candidate = buildCandidateProduct(productData, payload)
        onProgress?.({
          phase: 'score',
          candidateIndex: i,
          candidateCount: BEST_OF_N,
        })
        // eslint-disable-next-line no-await-in-loop
        const score100 = await evaluateCandidate(candidate)
        if (score100 > bestScore) {
          bestScore = score100
          bestPayload = payload
        }
      }

      const optimizePayload = bestPayload

      setOptimizationResult({
        productName: productAnalysis.name,
        productIndex: typeof productIndex === 'number' ? productIndex : null,
        ...optimizePayload,
      })

      if (!userId) {
        throw new Error('未登录，无法保存优化记录')
      }
      await saveOptimizationToDatabase(
        {
          ...productData,
          image_url: matched?.image_url || '',
        },
        optimizePayload,
        productAnalysis.name,
        userId,
      )
      await refreshOptimizationHistory()
      setErrorText('')
    } catch (err) {
      setErrorText(err.message || '生成优化方案失败')
    } finally {
      setOptimizingName('')
    }
  }

  return {
    products,
    analyzing,
    analysisResult,
    sandboxResult,
    sandboxLoadingName,
    optimizationResult,
    optimizingName,
    updateProduct,
    handleImageSelect,
    handleAnalyzeThreeProducts,
    handleRunSandbox,
    handleOptimizeProduct,
    bestOfN: BEST_OF_N,
    applyOptimizationToForm,
    refillProductsFromHistory,
    refillFromOptimizationHistory,
    handleAiFillFromImage,
    aiFillLoadingByIndex,
    isAiFillLoading,
    analyzableProductIndexes,
  }
}
