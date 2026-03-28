import { useEffect, useState } from 'react'
import { inputStyle } from '../styles/appFormStyles'
import { resolveProductImageDisplayUrl } from '../utils/productImageUrl'

export default function ProductInputCard({
  product,
  index,
  onFieldChange,
  onImageSelect,
  onAiFillFromImage,
  aiFillLoading,
}) {
  const [imageDisplayUrl, setImageDisplayUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    const v = product.image_url
    if (!v) {
      setImageDisplayUrl('')
      return
    }
    if (v.startsWith('http://') || v.startsWith('https://')) {
      setImageDisplayUrl(v)
      return
    }
    void resolveProductImageDisplayUrl(v).then((url) => {
      if (!cancelled) setImageDisplayUrl(url || '')
    })
    return () => {
      cancelled = true
    }
  }, [product.image_url])

  return (
    <div
      className="product-input-card"
      style={{
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 20 }}>产品 {index + 1}</h3>
        <span
          style={{
            fontSize: 12,
            padding: '6px 10px',
            borderRadius: 999,
            background: '#f3f4f6',
            color: '#374151',
          }}
        >
          录入区
        </span>
      </div>
      <div
        style={{
          marginBottom: 16,
          border: '1px dashed #d1d5db',
          borderRadius: 16,
          minHeight: 180,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f9fafb',
          overflow: 'hidden',
        }}
      >
        {product.uploading_image ? (
          <div style={{ color: '#6b7280' }}>图片上传中...</div>
        ) : imageDisplayUrl ? (
          <img
            src={imageDisplayUrl}
            alt={`产品${index + 1}`}
            style={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{ color: '#9ca3af', fontSize: 14 }}>上传后显示产品图片</div>
        )}
      </div>

      <input
        placeholder="产品名称"
        value={product.name}
        onChange={(e) => onFieldChange('name', e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="价格"
        value={product.price}
        onChange={(e) => onFieldChange('price', e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="材质"
        value={product.material}
        onChange={(e) => onFieldChange('material', e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="风格"
        value={product.style}
        onChange={(e) => onFieldChange('style', e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="目标人群"
        value={product.target_audience}
        onChange={(e) => onFieldChange('target_audience', e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="卖点"
        value={product.selling_points}
        onChange={(e) => onFieldChange('selling_points', e.target.value)}
        style={inputStyle}
      />

      <input
        type="file"
        onChange={(e) => onImageSelect(e.target.files?.[0])}
        style={{
          marginTop: 8,
          display: 'block',
          width: '100%',
        }}
      />

      {product.image_url && !product.uploading_image && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontSize: 13,
              color: '#16a34a',
              marginBottom: onAiFillFromImage ? 8 : 0,
            }}
          >
            图片已上传成功
          </div>
          {onAiFillFromImage ? (
            <button
              type="button"
              onClick={onAiFillFromImage}
              disabled={aiFillLoading}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #4338ca',
                background: aiFillLoading ? '#eef2ff' : '#fff',
                color: '#3730a3',
                fontWeight: 600,
                cursor: aiFillLoading ? 'wait' : 'pointer',
                fontSize: 14,
              }}
            >
              {aiFillLoading ? '识图中…' : 'AI 识图填表'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
