import { useEffect, useRef, useState } from 'react'
import { Share2, Download } from 'lucide-react'
import { nodeToPngFile } from '../lib/exportImage'
import type { SessionShareData } from '@chokepoint/shared'

interface ShareCardModalProps {
  data: SessionShareData
  onClose: () => void
}

// Hardcoded to the app's default dark palette (Albino and Preto) regardless
// of the viewer's selected theme — the shared image goes external, so it
// shouldn't vary with an in-app preference nobody else can see.
const CARD_BG = '#111111'
const CARD_ELEVATED = '#1a1a1a'
const CARD_BORDER = '#333333'
const CARD_TEXT_PRIMARY = '#ffffff'
const CARD_TEXT_SECONDARY = '#999999'
const CARD_TEXT_TERTIARY = '#555555'
const CARD_ACCENT = '#00cc66'
const CARD_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace"

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1350

const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

function formatCardDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function ShareCardModal({ data, onClose }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const previewWrapperRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)

  // A session with many transitions would otherwise overflow the fixed
  // card height and get silently clipped in the exported PNG — scale
  // block size/spacing down as the chain grows instead of dropping
  // content.
  const itemCount = data.transitions.length + data.standaloneChain.length
  const density = itemCount <= 3 ? 1 : itemCount <= 5 ? 0.75 : itemCount <= 8 ? 0.55 : 0.4
  const blockFontSize = 30 * density
  const blockPadding = `${24 * density}px ${28 * density}px`
  const blockGap = 28 * density
  const arrowFontSize = Math.max(14, 18 * density)

  useEffect(() => {
    const wrapper = previewWrapperRef.current
    if (!wrapper) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / CARD_WIDTH)
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  const handleShare = async () => {
    if (!cardRef.current || busy) return
    setBusy(true)
    setError(null)
    try {
      const file = await nodeToPngFile(cardRef.current, 'chokepoint-session.png')
      const shareData = { files: [file], title: 'Chokepoint' }
      if (navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData)
        } catch (err) {
          // User dismissed the native share sheet — not an error.
          if (err instanceof Error && err.name === 'AbortError') return
          throw err
        }
        return
      }
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to generate image — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-sm flex-col border border-border bg-bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold uppercase text-text-primary">Share Your Session</h2>
          <button onClick={onClose} className="text-[16px] text-text-secondary hover:text-text-primary">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div
            ref={previewWrapperRef}
            className="mx-auto"
            style={{ width: '100%', aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}`, overflow: 'hidden' }}
          >
            <div
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                ref={cardRef}
                style={{
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  background: CARD_BG,
                  fontFamily: CARD_FONT,
                  color: CARD_TEXT_PRIMARY,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 64,
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2, color: CARD_ACCENT, textTransform: 'uppercase' }}>
                  Chokepoint
                </div>
                <div style={{ marginTop: 8, fontSize: 22, color: CARD_TEXT_SECONDARY }}>{formatCardDate(data.trainedAt)}</div>

                <div style={{ marginTop: 56, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: blockGap }}>
                  {data.transitions.map((t, i) => (
                    <div key={`t${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 * density }}>
                      <div
                        style={{
                          border: `2px solid ${CARD_BORDER}`,
                          background: CARD_ELEVATED,
                          padding: blockPadding,
                          fontSize: blockFontSize,
                          fontWeight: 600,
                        }}
                      >
                        {t.fromLabel}
                      </div>
                      <div style={{ paddingLeft: 28 * density, fontSize: arrowFontSize, color: CARD_TEXT_TERTIARY, textTransform: 'uppercase' }}>
                        &darr; {t.label}
                      </div>
                      <div
                        style={{
                          border: `2px solid ${CARD_ACCENT}`,
                          background: CARD_ELEVATED,
                          padding: blockPadding,
                          fontSize: blockFontSize,
                          fontWeight: 600,
                          color: CARD_ACCENT,
                        }}
                      >
                        {t.toLabel}
                      </div>
                    </div>
                  ))}
                  {data.standaloneChain.map((item, i) => (
                    <div
                      key={`s${i}`}
                      style={{
                        border: `2px solid ${item.type === 'submission' ? CARD_ACCENT : CARD_BORDER}`,
                        background: CARD_ELEVATED,
                        padding: blockPadding,
                        fontSize: blockFontSize,
                        fontWeight: 600,
                        color: item.type === 'submission' ? CARD_ACCENT : CARD_TEXT_PRIMARY,
                      }}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 56, display: 'flex', gap: 24 }}>
                  <div style={{ flex: 1, border: `2px solid ${CARD_BORDER}`, padding: '20px 24px' }}>
                    <div style={{ fontSize: 16, textTransform: 'uppercase', color: CARD_TEXT_SECONDARY, letterSpacing: 1 }}>
                      Streak
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>
                      {data.streakDays} day{data.streakDays === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style={{ flex: 1, border: `2px solid ${CARD_BORDER}`, padding: '20px 24px' }}>
                    <div style={{ fontSize: 16, textTransform: 'uppercase', color: CARD_TEXT_SECONDARY, letterSpacing: 1 }}>
                      Recent Pace
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>
                      {data.recentSessionsPerWeek.toFixed(1)}/wk
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-[11px]" style={{ color: '#ff5555' }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
          >
            Close
          </button>
          <button
            onClick={() => void handleShare()}
            disabled={busy}
            className="flex items-center gap-1.5 border border-node-submission bg-node-submission px-3 py-1.5 text-[11px] font-bold uppercase text-black hover:bg-bg-elevated hover:text-node-submission disabled:opacity-50"
          >
            {canNativeShare ? <Share2 size={13} strokeWidth={2.5} /> : <Download size={13} strokeWidth={2.5} />}
            {busy ? 'Preparing...' : canNativeShare ? 'Share' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
