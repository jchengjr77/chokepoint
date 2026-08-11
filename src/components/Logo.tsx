// Five squares in BJJ belt order — the app's logo mark.
const BELT_COLORS = ['#ffffff', '#1a5fb4', '#5e2d8a', '#5c3a21', '#111111']

interface LogoProps {
  size?: number
}

export function Logo({ size = 10 }: LogoProps) {
  return (
    <div className="flex shrink-0 items-center gap-1" role="img" aria-label="Chokepoint logo">
      {BELT_COLORS.map((color, i) => (
        <span
          key={i}
          aria-hidden
          className="chokepoint-sharp shrink-0 border border-border"
          style={{ width: size, height: size, background: color }}
        />
      ))}
    </div>
  )
}
