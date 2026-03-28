/**
 * Frosted glass background with dark purple mouse-follow glow.
 * Radius = width of "欢迎使用" (4 chars) ≈ 4em.
 * Effect: point light from inside shining onto frosted glass.
 */
const PURPLE_GLOW_RADIUS = '4em'

export default function FrostedGlowOverlay({ mouseX, mouseY }) {
  return (
    <div
      className="frosted-glow-overlay"
      aria-hidden
      style={{
        '--mouse-x': `${mouseX}px`,
        '--mouse-y': `${mouseY}px`,
        '--glow-r': PURPLE_GLOW_RADIUS,
      }}
    />
  )
}
