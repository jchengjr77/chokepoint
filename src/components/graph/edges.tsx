import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from 'reactflow'

export interface GraphEdgeData {
  label: string
  bidirectional: boolean
  isSubmissionEntry: boolean
}

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M0,0 L8,4 L0,8 Z" fill={color} />
    </marker>
  )
}

export function TransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps<GraphEdgeData>) {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  const isSubmission = data?.isSubmissionEntry
  const color = isSubmission ? 'var(--edge-submission)' : 'var(--edge-default)'
  const startMarkerId = `arrow-start-${id}`
  const endMarkerId = `arrow-end-${id}`

  return (
    <>
      <defs>
        <ArrowMarker id={endMarkerId} color={color} />
        {data?.bidirectional && <ArrowMarker id={startMarkerId} color={color} />}
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${endMarkerId})`}
        markerStart={data?.bidirectional ? `url(#${startMarkerId})` : undefined}
        style={{
          stroke: color,
          strokeWidth: selected ? 2 : 1,
          strokeDasharray: isSubmission ? '4 3' : undefined,
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
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
