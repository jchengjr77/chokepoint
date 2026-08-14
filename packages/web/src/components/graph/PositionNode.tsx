import { Handle, Position, type NodeProps } from 'reactflow'
import { getProficiencyStrokeWidth } from '@chokepoint/shared'

export interface GraphNodeData {
  label: string
  dimmed: boolean
  connectMode: boolean
  isConnectSource: boolean
  searchMatch: boolean | null
  proficiency: number
}

const HANDLE_POSITIONS = [Position.Top, Position.Bottom, Position.Left, Position.Right]

export function PositionNode({ data, selected }: NodeProps<GraphNodeData>) {
  const opacity = data.dimmed ? 'var(--dimmed)' : data.searchMatch === false ? 0.3 : 1
  const borderWidth = selected ? 2 : getProficiencyStrokeWidth(data.proficiency)
  return (
    <div
      style={{ opacity, borderWidth, borderStyle: 'solid' }}
      className={`flex min-w-[110px] items-center justify-center bg-bg-node px-3 py-2 text-center transition-colors hover:bg-bg-elevated ${
        selected ? 'border-border-focus' : 'border-node-position'
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
