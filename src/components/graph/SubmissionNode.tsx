import { Handle, Position, type NodeProps } from 'reactflow'
import type { GraphNodeData } from './PositionNode'

export function SubmissionNode({ data, selected }: NodeProps<GraphNodeData>) {
  const opacity = data.dimmed ? 'var(--dimmed)' : data.searchMatch === false ? 0.3 : 1
  return (
    <div
      style={{ opacity, borderColor: 'var(--node-submission)' }}
      className={`relative flex min-w-[110px] items-center justify-center border bg-transparent px-3 py-2 text-center transition-colors hover:bg-bg-elevated ${
        selected ? 'border-2' : 'border'
      } ${data.isConnectSource ? 'ring-1 ring-node-submission' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-node-submission !border-0 !h-1 !w-1" />
      <span
        aria-hidden
        className="absolute -right-1 -top-1 h-2 w-2"
        style={{ background: 'var(--node-submission)' }}
      />
      <span className="select-none text-[12px] font-medium text-text-primary">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-node-submission !border-0 !h-1 !w-1" />
    </div>
  )
}
