import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from 'reactflow'

export interface GraphEdgeData {
  label: string
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
      markerUnits="userSpaceOnUse"
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
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  })
  const isSubmission = data?.isSubmissionEntry
  const color = isSubmission ? 'var(--edge-submission)' : 'var(--edge-default)'
  const opacity = data?.searchMatch === false ? 0.3 : 1
  const startMarkerId = `arrow-start-${id}`
  const endMarkerId = `arrow-end-${id}`

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
          strokeWidth: selected ? 2 : 1,
          opacity,
        }}
      />
      {data?.label && (
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
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
