import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

interface OverflowMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface OverflowMenuProps {
  items?: OverflowMenuItem[]
  /** Arbitrary content rendered above the action items (e.g. a theme
   * dropdown or toggle switch that isn't a simple label+onClick action). */
  children?: ReactNode
  ariaLabel?: string
}

/**
 * Kebab menu for secondary toolbar/utility actions. Portals the panel to
 * document.body with position computed from the trigger's bounding rect,
 * same pattern as Dropdown — React Flow's internal elements have their
 * own z-index that a plain absolutely-positioned child loses to
 * otherwise. Accepts both simple action items (label + onClick) and
 * arbitrary children for richer controls that need to live in the same
 * collapsed panel.
 */
// Rough panel height estimate used to decide whether it fits below the
// trigger — exact height isn't known until it renders, but the trigger
// is always near a screen edge in this app (top toolbar or a bottom
// floating cluster), so "does the panel's typical size fit in the
// remaining space" is enough to pick the right side to open on.
const ESTIMATED_PANEL_HEIGHT = 200

export function OverflowMenu({ items = [], children, ariaLabel = 'More options' }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{
    top?: number
    bottom?: number
    left?: number
    right?: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return

      const fitsBelow = rect.bottom + ESTIMATED_PANEL_HEIGHT <= window.innerHeight
      const fitsRight = rect.left + 160 <= window.innerWidth

      setPanelPos({
        ...(fitsBelow ? { top: rect.bottom + 2 } : { bottom: window.innerHeight - rect.top + 2 }),
        ...(fitsRight ? { left: rect.left } : { right: window.innerWidth - rect.right }),
      })
    }
    updatePosition()

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      const insideRoot = rootRef.current?.contains(target)
      const insidePanel = panelRef.current?.contains(target)
      if (!insideRoot && !insidePanel) setOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex shrink-0 items-center border border-border p-1.5 text-text-primary hover:bg-bg-elevated"
      >
        <MoreVertical size={14} aria-hidden="true" />
      </button>

      {open &&
        panelPos &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            className="fixed z-[9999] min-w-[160px] border border-border bg-bg-surface py-1"
            style={{ top: panelPos.top, bottom: panelPos.bottom, left: panelPos.left, right: panelPos.right }}
          >
            {children && (
              <div className="flex flex-col gap-2 px-3 py-2" onClick={(e) => e.stopPropagation()}>
                {children}
              </div>
            )}
            {children && items.length > 0 && <div className="my-1 h-px bg-border" />}
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
                className="flex w-full items-center whitespace-nowrap px-3 py-1.5 text-left text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
                style={item.danger ? { color: '#ff5555' } : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
