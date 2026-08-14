import { toBlob } from 'html-to-image'

/**
 * Snapshots a DOM node to a PNG File at 2x pixel density — crisp enough
 * for retina displays and social platforms that re-compress uploads.
 */
export async function nodeToPngFile(node: HTMLElement, filename: string): Promise<File> {
  const blob = await toBlob(node, { pixelRatio: 2 })
  if (!blob) throw new Error('Failed to render image')
  return new File([blob], filename, { type: 'image/png' })
}
