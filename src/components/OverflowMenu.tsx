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
export function OverflowMenu({ items = [], children, ariaLabel = 'More options' }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setPanelPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right })
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
            style={{ top: panelPos.top, right: panelPos.right }}
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
