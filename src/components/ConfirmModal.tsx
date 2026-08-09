interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm border border-border bg-bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-[13px] font-semibold uppercase text-text-primary">{title}</h2>
        <p className="mb-4 text-[12px] text-text-secondary">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={
              danger
                ? 'border px-3 py-1.5 text-[11px] font-medium uppercase hover:bg-bg-elevated'
                : 'border border-text-primary bg-text-primary px-3 py-1.5 text-[11px] font-medium uppercase text-black hover:bg-bg-elevated hover:text-text-primary'
            }
            style={danger ? { borderColor: '#ff5555', color: '#ff5555' } : undefined}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
