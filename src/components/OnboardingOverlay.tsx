const STORAGE_KEY = 'chokepoint-onboarding-dismissed'

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function markOnboardingSeen(): void {
  localStorage.setItem(STORAGE_KEY, '1')
}

interface OnboardingOverlayProps {
  onDismiss: () => void
}

export function OnboardingOverlay({ onDismiss }: OnboardingOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className="pointer-events-auto max-w-sm border border-border bg-bg-surface p-5">
        <h2 className="mb-3 text-[13px] font-semibold uppercase text-text-primary">Welcome to Chokepoint</h2>
        <ol className="mb-4 flex flex-col gap-2 text-[12px] text-text-secondary">
          <li>1. Add positions you know from the library.</li>
          <li>2. Connect them with transitions you've learned.</li>
          <li>3. Submissions go on the edges — they're your goals.</li>
        </ol>
        <button
          onClick={onDismiss}
          className="w-full border border-text-primary bg-text-primary px-3 py-2 text-[11px] font-medium uppercase text-black hover:bg-bg-elevated hover:text-text-primary"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
