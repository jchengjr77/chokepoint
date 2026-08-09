import { Handle, Position, type NodeProps } from 'reactflow'

export interface GraphNodeData {
  label: string
  dimmed: boolean
  connectMode: boolean
  isConnectSource: boolean
  searchMatch: boolean | null
}

const HANDLE_POSITIONS = [Position.Top, Position.Bottom, Position.Left, Position.Right]

export function PositionNode({ data, selected }: NodeProps<GraphNodeData>) {
  const opacity = data.dimmed ? 'var(--dimmed)' : data.searchMatch === false ? 0.3 : 1
  return (
    <div
      style={{ opacity }}
      className={`flex min-w-[110px] items-center justify-center border bg-bg-node px-3 py-2 text-center transition-colors hover:bg-bg-elevated ${
        selected ? 'border-2 border-border-focus' : 'border border-node-position'
      } ${data.isConnectSource ? 'ring-1 ring-node-submission' : ''}`}
    >
      {HANDLE_POSITIONS.map((pos) => (
        <Handle
          key={`target-${pos}`}
          type="target"
          position={pos}
          id={pos}
          className="!bg-border !border-0 !h-1 !w-1"
        />
      ))}
      <span className="select-none text-[12px] font-medium text-text-primary">{data.label}</span>
      {HANDLE_POSITIONS.map((pos) => (
        <Handle
          key={`source-${pos}`}
          type="source"
          position={pos}
          id={pos}
          className="!bg-border !border-0 !h-1 !w-1"
        />
      ))}
    </div>
  )
}
