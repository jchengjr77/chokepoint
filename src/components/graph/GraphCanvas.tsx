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
  onEdgePairClick: (pair: { sourceId: string; targetId: string }) => void
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
  onEdgePairClick,
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

      const dimensions = new Map<string, { width: number; height: number }>()
      for (const n of nodes) {
        const rfNode = getNode(n.id)
        dimensions.set(n.id, { width: rfNode?.width ?? 130, height: rfNode?.height ?? 40 })
      }

      const positions = computeAutoLayout(nodes, edges, dimensions)
      for (const [id, pos] of positions.entries()) {
        const { width, height } = dimensions.get(id)!
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

  // Multiple logged techniques between the same two nodes render as a
  // single visual edge (thickness reflects how many), rather than several
  // separately-clickable overlapping arrows. Group by the unordered node
  // pair; the group is treated as bidirectional if any technique is
  // explicitly marked bidirectional, or if techniques exist going in both
  // directions between the pair (real separate rows, not just the flag).
  const edgeGroups = useMemo(() => {
    const groups = new Map<
      string,
      { sourceId: string; targetId: string; techniques: GraphEdge[]; bidirectional: boolean }
    >()
    for (const e of edges) {
      const pairKey = [e.sourceId, e.targetId].sort().join('|')
      let group = groups.get(pairKey)
      if (!group) {
        group = { sourceId: e.sourceId, targetId: e.targetId, techniques: [], bidirectional: false }
        groups.set(pairKey, group)
      }
      group.techniques.push(e)
      if (e.bidirectional) group.bidirectional = true
      if (e.sourceId === group.targetId && e.targetId === group.sourceId) group.bidirectional = true
    }
    return [...groups.values()]
  }, [edges])

  const rfEdges: Edge[] = useMemo(
    () =>
      edgeGroups.map((group) => {
        const sourceNode = nodes.find((n) => n.id === group.sourceId)
        const targetNode = nodes.find((n) => n.id === group.targetId)
        const isSubmissionEntry = targetNode?.type === 'submission'
        const { sourceHandle, targetHandle } = pickHandlePair(sourceNode, targetNode)
        const searchMatch = searchMatchSet
          ? searchMatchSet.has(group.sourceId) || searchMatchSet.has(group.targetId)
          : null
        // Stable id for the merged edge so React Flow doesn't remount it
        // every time technique membership changes order.
        const groupId = [group.sourceId, group.targetId].sort().join('|')
        return {
          id: groupId,
          source: group.sourceId,
          target: group.targetId,
          sourceHandle,
          targetHandle,
          type: 'transition',
          data: {
            soleLabel: group.techniques.length === 1 ? group.techniques[0].label : '',
            techniqueCount: group.techniques.length,
            bidirectional: group.bidirectional,
            isSubmissionEntry,
            searchMatch,
          },
        }
      }),
    [edgeGroups, nodes, searchMatchSet]
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
      const group = edgeGroups.find((g) => [g.sourceId, g.targetId].sort().join('|') === rfEdge.id)
      if (group) onEdgePairClick({ sourceId: group.sourceId, targetId: group.targetId })
    },
    [edgeGroups, onEdgePairClick]
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
