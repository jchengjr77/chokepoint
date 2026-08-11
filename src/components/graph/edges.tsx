import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from 'reactflow'
import { getTechniqueCountStrokeWidth } from '../../lib/proficiency'

export interface GraphEdgeData {
  /** Shown directly on the canvas only when there's exactly one technique. */
  soleLabel: string
  techniqueCount: number
  /** True if any grouped technique is marked bidirectional. */
  bidirectional: boolean
  isSubmissionEntry: boolean
  searchMatch: boolean | null
}

function ArrowMarker({
  id,
  color,
  reverse,
  opacity,
}: {
  id: string
  color: string
  reverse?: boolean
  opacity: number
}) {
  return (
    <marker
      id={id}
      markerWidth="8"
      markerHeight="8"
      refX="7"
      refY="4"
      orient={reverse ? 'auto-start-reverse' : 'auto'}
      markerUnits="strokeWidth"
    >
      <path d="M0,0 L8,4 L0,8 Z" fill={color} fillOpacity={opacity} />
    </marker>
  )
}

export function TransitionEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
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
  const startMarkerId = `arrow-start-${id}`
  const endMarkerId = `arrow-end-${id}`

  const displayLabel =
    (data?.techniqueCount ?? 1) > 1 ? `${data?.techniqueCount} techniques` : data?.soleLabel

  return (
    <>
      <defs>
        <ArrowMarker id={endMarkerId} color={color} opacity={opacity} />
        {data?.bidirectional && <ArrowMarker id={startMarkerId} color={color} reverse opacity={opacity} />}
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${endMarkerId})`}
        markerStart={data?.bidirectional ? `url(#${startMarkerId})` : undefined}
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
