import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from 'reactflow'
import { getTechniqueCountStrokeWidth } from '@chokepoint/shared'

export interface GraphEdgeData {
  /** Shown directly on the canvas only when there's exactly one technique. */
  soleLabel: string
  techniqueCount: number
  /** True if any grouped technique is marked bidirectional. */
  bidirectional: boolean
  isSubmissionEntry: boolean
  searchMatch: boolean | null
}

export function TransitionEdge({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerStart,
  markerEnd,
  data,
  selected,
}: EdgeProps<GraphEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  })
  const isSubmission = data?.isSubmissionEntry
  const color = isSubmission ? 'var(--edge-submission, #00cc66)' : 'var(--edge-default, #444444)'
  const opacity = data?.searchMatch === false ? 0.3 : 1
  const strokeWidth = selected ? Math.max(4, getTechniqueCountStrokeWidth(data?.techniqueCount ?? 1)) : getTechniqueCountStrokeWidth(data?.techniqueCount ?? 1)

  const displayLabel =
    (data?.techniqueCount ?? 1) > 1 ? `${data?.techniqueCount} techniques` : data?.soleLabel

  return (
    <>
      {/* Arrowheads come from React Flow's own marker system (markerStart/
          markerEnd set on the edge object in GraphCanvas), which de-dupes
          markers by prop signature into one shared <defs> at the SVG root.
          Hand-rolling a <defs>/<marker> per edge instance here used to hit
          a WebKit bug on mobile Safari/iOS Chrome where duplicate/reused
          marker ids across mount-unmount cycles resolve to the wrong (or
          no) element — arrowheads would render invisible while the edge
          stayed otherwise interactive. */}
      <BaseEdge
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth,
          opacity,
        }}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 10,
              color: 'var(--text-secondary)',
              background: 'var(--bg-primary)',
              padding: '0 4px',
              pointerEvents: 'none',
              fontFamily: 'var(--font-mono)',
              opacity,
            }}
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
