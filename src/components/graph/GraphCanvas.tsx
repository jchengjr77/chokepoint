import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
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
  const { fitView, setViewport } = useReactFlow()
  const [pendingEdge, setPendingEdge] = useState<{ source: GraphNode; target: GraphNode } | null>(null)
  const prevResetToken = useRef(resetViewToken)
  const prevLayoutToken = useRef(autoLayoutToken)
  const [layoutPositions, setLayoutPositions] = useState<Map<string, { x: number; y: number }> | null>(null)

  useEffect(() => {
    if (resetViewToken !== prevResetToken.current) {
      prevResetToken.current = resetViewToken
      window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }))
    }
  }, [resetViewToken, fitView])

  useEffect(() => {
    if (autoLayoutToken !== prevLayoutToken.current) {
      prevLayoutToken.current = autoLayoutToken
      const positions = computeAutoLayout(nodes, edges)
      setLayoutPositions(positions)
      for (const [id, pos] of positions.entries()) {
        void updateNodePosition(id, pos.x, pos.y)
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
        const pos = layoutPositions?.get(n.id)
        return {
          id: n.id,
          type: n.type,
          position: { x: pos?.x ?? n.x, y: pos?.y ?? n.y },
          data: {
            label: n.label,
            dimmed: nodeDimmed(n, rulesetFilter),
            connectMode,
            isConnectSource: connectSourceId === n.id,
            searchMatch: searchMatchSet ? searchMatchSet.has(n.id) : null,
          },
          draggable: !nodeDimmed(n, rulesetFilter),
        }
      }),
    [nodes, rulesetFilter, connectMode, connectSourceId, searchMatchSet, layoutPositions]
  )

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => {
        const targetNode = nodes.find((n) => n.id === e.targetId)
        const isSubmissionEntry = targetNode?.type === 'submission'
        return {
          id: e.id,
          source: e.sourceId,
          target: e.targetId,
          type: 'transition',
          data: {
            label: e.label,
            bidirectional: e.bidirectional,
            isSubmissionEntry,
          },
        }
      }),
    [edges, nodes]
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

  const handleNodeDragStop: NodeDragHandler = useCallback(
    (_evt, rfNode) => {
      void updateNodePosition(rfNode.id, rfNode.position.x, rfNode.position.y)
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
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={onCanvasClick}
        onInit={() => setViewport({ x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 })}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#222222" />
        <MiniMap
          className="hidden sm:block"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            width: 120,
            height: 80,
          }}
          maskColor="rgba(0,0,0,0.6)"
          nodeColor={(n) => (n.type === 'submission' ? '#00cc66' : '#ffffff')}
          nodeBorderRadius={0}
        />
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
