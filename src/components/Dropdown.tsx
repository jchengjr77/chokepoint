import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface DropdownOption<T extends string> {
  value: T
  label: string
}

interface DropdownProps<T extends string> {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export function Dropdown<T extends string>({ value, options, onChange, ariaLabel, className }: DropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLUListElement>(null)
  const selected = options.find((o) => o.value === value)

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
    <div ref={rootRef} className={`relative shrink-0 ${className ?? ''}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 border border-border bg-transparent px-2 py-1 text-[11px] font-medium uppercase text-text-primary outline-none hover:bg-bg-elevated"
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <span aria-hidden className="ml-auto text-text-tertiary">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open &&
        panelPos &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            aria-label={ariaLabel}
            className="fixed z-[9999] min-w-[128px] max-w-[220px] border border-border bg-bg-surface py-1"
            style={{ top: panelPos.top, right: panelPos.right }}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center whitespace-nowrap px-3 py-1.5 text-left text-[11px] uppercase hover:bg-bg-elevated ${
                      isSelected ? 'border-l-2 border-l-node-submission text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {isSelected && <span className="mr-1 text-node-submission">&gt;</span>}
                    {option.label}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body
        )}
    </div>
  )
}
