import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Position,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type NodeDragHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { PositionNode } from './PositionNode'
import { SubmissionNode } from './SubmissionNode'
import { TransitionEdge } from './edges'
import { useGraphStore } from '../../hooks/useGraphStore'
import { getLibraryEntry, library } from '../../lib/library'
import { computeAutoLayout } from '../../lib/layout'
import type { GraphEdge, GraphNode, Ruleset } from '../../types'
import { AddEdgeModal } from '../AddEdgeModal'

const nodeTypes = { position: PositionNode, submission: SubmissionNode }
const edgeTypes = { transition: TransitionEdge }

interface GraphCanvasProps {
  rulesetFilter: 'all' | 'gi' | 'nogi'
  searchQuery: string
  connectMode: boolean
  connectSourceId: string | null
  onNodeClick: (node: GraphNode) => void
  onEdgeClick: (edge: GraphEdge) => void
  onCanvasClick: () => void
  onConnectComplete: () => void
  resetViewToken: number
  autoLayoutToken: number
}

function nodeDimmed(node: GraphNode, filter: 'all' | 'gi' | 'nogi'): boolean {
  if (filter === 'all') return false
  const entry = getLibraryEntry(node.libraryId)
  if (!entry) return false
  return !entry.rulesets.includes(filter as Ruleset)
}

/**
 * Picks which side (top/bottom/left/right) an edge should connect from and
 * to, based on the relative position of the two nodes, so horizontally
 * arranged nodes connect left-right and vertically arranged nodes connect
 * top-bottom instead of always routing through a fixed handle.
 */
function pickHandlePair(
  source: GraphNode | undefined,
  target: GraphNode | undefined
): { sourceHandle: Position; targetHandle: Position } {
  if (!source || !target) {
    return { sourceHandle: Position.Bottom, targetHandle: Position.Top }
  }

  const dx = target.x - source.x
  const dy = target.y - source.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: Position.Right, targetHandle: Position.Left }
      : { sourceHandle: Position.Left, targetHandle: Position.Right }
  }

  return dy >= 0
    ? { sourceHandle: Position.Bottom, targetHandle: Position.Top }
    : { sourceHandle: Position.Top, targetHandle: Position.Bottom }
}

export function GraphCanvas({
  rulesetFilter,
  searchQuery,
  connectMode,
  connectSourceId,
  onNodeClick,
  onEdgeClick,
  onCanvasClick,
  onConnectComplete,
  resetViewToken,
  autoLayoutToken,
}: GraphCanvasProps) {
  const { nodes, edges, updateNodePosition, addEdge } = useGraphStore()
  const { fitView, setViewport, getNode } = useReactFlow()
  const [pendingEdge, setPendingEdge] = useState<{ source: GraphNode; target: GraphNode } | null>(null)
  const [dragPositions, setDragPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const prevResetToken = useRef(resetViewToken)
  const prevLayoutToken = useRef(autoLayoutToken)

  useEffect(() => {
    if (resetViewToken !== prevResetToken.current) {
      prevResetToken.current = resetViewToken
      window.requestAnimationFrame(() => {
        if (nodes.length === 0) {
          setViewport({ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 }, { duration: 200 })
        } else {
          fitView({ padding: 0.2, duration: 200 })
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetViewToken, fitView, setViewport])

  useEffect(() => {
    if (autoLayoutToken !== prevLayoutToken.current) {
      prevLayoutToken.current = autoLayoutToken
      const positions = computeAutoLayout(nodes, edges)
      for (const [id, pos] of positions.entries()) {
        const rfNode = getNode(id)
        const width = rfNode?.width ?? 110
        const height = rfNode?.height ?? 36
        void updateNodePosition(id, pos.x - width / 2, pos.y - height / 2)
      }
      window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLayoutToken])

  useEffect(() => {
    if (nodes.length > 0) {
      window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 0 }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const searchMatchSet = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.trim().toLowerCase()
    return new Set(nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id))
  }, [nodes, searchQuery])

  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        const dragPos = dragPositions.get(n.id)
        return {
          id: n.id,
          type: n.type,
          position: { x: dragPos?.x ?? n.x, y: dragPos?.y ?? n.y },
          data: {
            label: n.label,
            dimmed: nodeDimmed(n, rulesetFilter),
            connectMode,
            isConnectSource: connectSourceId === n.id,
            searchMatch: searchMatchSet ? searchMatchSet.has(n.id) : null,
            proficiency: n.proficiency,
          },
          draggable: !nodeDimmed(n, rulesetFilter),
        }
      }),
    [nodes, rulesetFilter, connectMode, connectSourceId, searchMatchSet, dragPositions]
  )

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => {
        const sourceNode = nodes.find((n) => n.id === e.sourceId)
        const targetNode = nodes.find((n) => n.id === e.targetId)
        const isSubmissionEntry = targetNode?.type === 'submission'
        const { sourceHandle, targetHandle } = pickHandlePair(sourceNode, targetNode)
        const searchMatch = searchMatchSet
          ? searchMatchSet.has(e.sourceId) || searchMatchSet.has(e.targetId)
          : null
        return {
          id: e.id,
          source: e.sourceId,
          target: e.targetId,
          sourceHandle,
          targetHandle,
          type: 'transition',
          data: {
            label: e.label,
            bidirectional: e.bidirectional,
            isSubmissionEntry,
            searchMatch,
            proficiency: e.proficiency,
          },
        }
      }),
    [edges, nodes, searchMatchSet]
  )

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_evt, rfNode) => {
      const node = nodes.find((n) => n.id === rfNode.id)
      if (!node) return

      if (connectMode && connectSourceId && connectSourceId !== node.id) {
        setPendingEdge({
          source: nodes.find((n) => n.id === connectSourceId)!,
          target: node,
        })
        return
      }

      onNodeClick(node)
    },
    [nodes, connectMode, connectSourceId, onNodeClick]
  )

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_evt, rfEdge) => {
      const edge = edges.find((e) => e.id === rfEdge.id)
      if (edge) onEdgeClick(edge)
    },
    [edges, onEdgeClick]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((n) => n.id === connection.source)
      const target = nodes.find((n) => n.id === connection.target)
      if (!source || !target || source.id === target.id) return
      setPendingEdge({ source, target })
    },
    [nodes]
  )

  const handleNodeDrag: NodeDragHandler = useCallback((_evt, rfNode) => {
    setDragPositions((prev) => {
      const next = new Map(prev)
      next.set(rfNode.id, { x: rfNode.position.x, y: rfNode.position.y })
      return next
    })
  }, [])

  const handleNodeDragStop: NodeDragHandler = useCallback(
    (_evt, rfNode) => {
      void updateNodePosition(rfNode.id, rfNode.position.x, rfNode.position.y)
      setDragPositions((prev) => {
        if (!prev.has(rfNode.id)) return prev
        const next = new Map(prev)
        next.delete(rfNode.id)
        return next
      })
    },
    [updateNodePosition]
  )

  const suggestedLabel = useMemo(() => {
    if (!pendingEdge) return undefined
    const match = library.knownTransitions.find(
      (t) => t.sourceId === pendingEdge.source.libraryId && t.targetId === pendingEdge.target.libraryId
    )
    return match?.label
  }, [pendingEdge])

  return (
    <div className="relative h-full w-full bg-bg-primary">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onPaneClick={onCanvasClick}
        onInit={() => setViewport({ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 })}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="var(--border-focus)" />
      </ReactFlow>

      {pendingEdge && (
        <AddEdgeModal
          source={pendingEdge.source}
          target={pendingEdge.target}
          suggestedLabel={suggestedLabel}
          onCancel={() => {
            setPendingEdge(null)
            onConnectComplete()
          }}
          onConfirm={(label, bidirectional) => {
            void addEdge({
              sourceId: pendingEdge.source.id,
              targetId: pendingEdge.target.id,
              label,
              bidirectional,
            })
            setPendingEdge(null)
            onConnectComplete()
          }}
        />
      )}
    </div>
  )
}
