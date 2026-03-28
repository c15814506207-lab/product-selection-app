import { useState, useCallback, useRef, Children, cloneElement } from 'react'

/** Radius of text edge glow ≈ width of "欢迎使用" (4 chars) */
const TEXT_GLOW_RADIUS = '4em'

export default function MouseGlowWrap({ children, className = '' }) {
  const [local, setLocal] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const wrapRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setLocal({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])

  const glowChildren = Children.map(children, (child) => {
    if (!child || typeof child !== 'object') return child
    if (typeof child.type === 'symbol') return child
    const cn = ((child?.props?.className ?? '') + ' mouse-glow-wrap__glow-text').trim()
    return cloneElement(child, { key: child.key, className: cn })
  })

  return (
    <div
      ref={wrapRef}
      className={`mouse-glow-wrap ${className}`.trim()}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="mouse-glow-wrap__base">{children}</div>
      {hovered && (
        <div
          className="mouse-glow-wrap__glow-layer"
          style={{
            '--mx': `${local.x}px`,
            '--my': `${local.y}px`,
            '--r': TEXT_GLOW_RADIUS,
          }}
          aria-hidden
        >
          {glowChildren}
        </div>
      )}
    </div>
  )
}
