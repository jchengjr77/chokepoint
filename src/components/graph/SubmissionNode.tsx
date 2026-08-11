import { Handle, Position, type NodeProps } from 'reactflow'
import { getProficiencyStrokeWidth } from '../../lib/proficiency'
import type { GraphNodeData } from './PositionNode'

const HANDLE_POSITIONS = [Position.Top, Position.Bottom, Position.Left, Position.Right]

export function SubmissionNode({ data, selected }: NodeProps<GraphNodeData>) {
  const opacity = data.dimmed ? 'var(--dimmed)' : data.searchMatch === false ? 0.3 : 1
  const borderWidth = selected ? 2 : getProficiencyStrokeWidth(data.proficiency)
  return (
    <div
      style={{ opacity, borderColor: 'var(--node-submission)', borderWidth, borderStyle: 'solid' }}
      className={`relative flex min-w-[110px] items-center justify-center bg-bg-node px-3 py-2 text-center transition-colors hover:bg-bg-elevated ${
        data.isConnectSource ? 'ring-1 ring-node-submission' : ''
      }`}
    >
      {HANDLE_POSITIONS.map((pos) => (
        <Handle
          key={`target-${pos}`}
          type="target"
          position={pos}
          id={pos}
          className="!bg-node-submission !border-0 !h-1 !w-1"
        />
      ))}
      <span className="select-none text-[12px] font-medium text-text-primary">{data.label}</span>
      {HANDLE_POSITIONS.map((pos) => (
        <Handle
          key={`source-${pos}`}
          type="source"
          position={pos}
          id={pos}
          className="!bg-node-submission !border-0 !h-1 !w-1"
        />
      ))}
    </div>
  )
}
