import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { AnalysisReportPage, OptimizationReportPage } from '../components/report/WorkshopReportLayouts.jsx'

async function waitForImages(container) {
  const imgs = [...container.querySelectorAll('img')]
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth) return resolve()
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
        }),
    ),
  )
  await new Promise((r) => setTimeout(r, 80))
}

async function captureElToDataUrl(el) {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#0e0e0f',
    logging: false,
  })
  return canvas.toDataURL('image/png')
}

export async function captureWorkshopReportImages({
  analysisResult,
  inputProducts,
  productThumbUrls,
  optimizationPages,
  onProgress,
}) {
  const host = document.createElement('div')
  host.setAttribute('data-workshop-capture-host', 'true')
  // 不要对离屏节点使用 visibility:hidden，否则 html2canvas 常会得到全黑或空白图。
  // 仅移出视口即可，仍参与渲染与绘制。
  host.style.cssText =
    'position:fixed;left:-20000px;top:0;pointer-events:none;z-index:0;overflow:visible'
  document.body.appendChild(host)
  const root = createRoot(host)

  const total = 1 + (optimizationPages?.length || 0)
  const out = []

  try {
    root.render(
      // Tailwind 配置了 important: '.stitch-workspace-root'，离屏节点必须包在该类内，否则颜色/背景类全部不生效 → 截图为黑。
      <div className="stitch-workspace-root">
        <div className="min-h-screen bg-surface font-body text-on-surface">
          <AnalysisReportPage
            analysisResult={analysisResult}
            inputProducts={inputProducts}
            productThumbUrls={productThumbUrls}
          />
        </div>
      </div>,
    )
    await waitForImages(host)
    const pageEl = host.querySelector('[data-workshop-report-page="analysis"]')
    if (!pageEl) throw new Error('分析报告渲染失败')
    const url = await captureElToDataUrl(pageEl)
    out.push({ kind: 'analysis', title: '分析报告', dataUrl: url })
    onProgress?.(1, total)

    const opts = optimizationPages || []
    for (let i = 0; i < opts.length; i++) {
      const p = opts[i]
      root.render(
        <div className="stitch-workspace-root">
          <div className="min-h-screen bg-surface font-body text-on-surface">
            <OptimizationReportPage
              productOrdinalLabel={p.productOrdinalLabel}
              optimizationResult={p.optimizationResult}
              originalPrice={p.originalPrice}
              productName={p.productName}
              thumbUrl={p.thumbUrl}
            />
          </div>
        </div>,
      )
      await waitForImages(host)
      const optEl = host.querySelector('[data-workshop-report-page="optimization"]')
      if (!optEl) throw new Error('优化报告渲染失败')
      const optUrl = await captureElToDataUrl(optEl)
      out.push({
        kind: 'optimization',
        title: p.title || `优化方案 · ${p.productOrdinalLabel || ''}`,
        dataUrl: optUrl,
        productIndex: p.productIndex,
      })
      onProgress?.(1 + i + 1, total)
    }

    return out
  } finally {
    root.unmount()
    document.body.removeChild(host)
  }
}
