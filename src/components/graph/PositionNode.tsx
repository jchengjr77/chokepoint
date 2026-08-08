import { Handle, Position, type NodeProps } from 'reactflow'

export interface GraphNodeData {
  label: string
  dimmed: boolean
  connectMode: boolean
  isConnectSource: boolean
  searchMatch: boolean | null
}

export function PositionNode({ data, selected }: NodeProps<GraphNodeData>) {
  const opacity = data.dimmed ? 'var(--dimmed)' : data.searchMatch === false ? 0.3 : 1
  return (
    <div
      style={{ opacity }}
      className={`flex min-w-[110px] items-center justify-center border bg-transparent px-3 py-2 text-center transition-colors hover:bg-bg-elevated ${
        selected ? 'border-2 border-border-focus' : 'border border-node-position'
      } ${data.isConnectSource ? 'ring-1 ring-node-submission' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-border !border-0 !h-1 !w-1" />
      <span className="select-none text-[12px] font-medium text-text-primary">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-border !border-0 !h-1 !w-1" />
    </div>
  )
}
