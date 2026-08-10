import { useEffect, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useAuth } from './hooks/useAuth'
import { GraphStoreProvider, useGraphStore } from './hooks/useGraphStore'
import { useCustomLibrary } from './hooks/useCustomLibrary'
import { LoginScreen } from './components/LoginScreen'
import { Toolbar } from './components/Toolbar'
import { GraphCanvas } from './components/graph/GraphCanvas'
import { LibraryPickerModal } from './components/LibraryPickerModal'
import { DetailPanel } from './components/DetailPanel'
import { NLInputBar } from './components/NLInputBar'
import { NLPreviewModal } from './components/NLPreviewModal'
import { ImportExportModal } from './components/ImportExportModal'
import { OnboardingOverlay, hasSeenOnboarding, markOnboardingSeen } from './components/OnboardingOverlay'
import { Legend } from './components/Legend'
import { CalendarModal } from './components/CalendarModal'
import { CalendarButton } from './components/CalendarButton'
import { OverflowMenu } from './components/OverflowMenu'
import { computeAutoLayoutForNewNodes } from './lib/layout'
import type { GraphEdge, GraphNode, NLParseResult } from './types'

function OfflineBanner() {
  return (
    <div className="flex h-8 shrink-0 items-center justify-center bg-bg-elevated text-[11px] uppercase text-text-secondary">
      You are offline — changes are disabled until connection is restored.
    </div>
  )
}

function MainApp() {
  const {
    nodes,
    edges,
    loading,
    online,
    rulesetFilter,
    setRulesetFilter,
    theme,
    themeMode,
    setTheme,
    setThemeMode,
    addNode,
    addEdge,
    updateNodePosition,
    incrementNodeProficiency,
    incrementEdgeProficiency,
  } = useGraphStore()

  const { entries: customLibraryEntries, createEntry: createCustomLibraryEntry } = useCustomLibrary()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-mode', themeMode)
  }, [theme, themeMode])

  const [showLibraryPicker, setShowLibraryPicker] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [selectedEdgePair, setSelectedEdgePair] = useState<{ sourceId: string; targetId: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [resetViewToken, setResetViewToken] = useState(0)
  const [autoLayoutToken, setAutoLayoutToken] = useState(0)
  const [connectMode, setConnectMode] = useState(false)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [nlResult, setNlResult] = useState<NLParseResult | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding())

  const dismissOnboarding = () => {
    markOnboardingSeen()
    setShowOnboarding(false)
  }

  const handleNodeClick = (node: GraphNode) => {
    setSelectedEdgePair(null)
    setSelectedNode(node)
  }

  const handleEdgePairClick = (pair: { sourceId: string; targetId: string }) => {
    setSelectedNode(null)
    setSelectedEdgePair(pair)
  }

  const handleEdgeClick = (edge: GraphEdge) => {
    handleEdgePairClick({ sourceId: edge.sourceId, targetId: edge.targetId })
  }

  // Runs the same force-directed layout as the Auto-Layout button, but
  // pinned so only the newly-added nodes move — an existing user's manual
  // arrangement is never disturbed by adding more nodes to the graph.
  const layoutNewNodes = async (
    baseNodes: GraphNode[],
    createdNodes: GraphNode[],
    graphEdges: Array<{ sourceId: string; targetId: string }>
  ) => {
    if (createdNodes.length === 0) return
    const allNodes = [...baseNodes, ...createdNodes]
    const newNodeIds = new Set(createdNodes.map((n) => n.id))
    const positions = computeAutoLayoutForNewNodes(allNodes, graphEdges, newNodeIds)
    for (const [id, pos] of positions.entries()) {
      await updateNodePosition(id, pos.x, pos.y)
    }
  }

  const handleAddNodes = async (entries: Array<{ entry: { id: string; label: string }; type: 'position' | 'submission' }>) => {
    const createdNodes: GraphNode[] = []
    for (const { entry, type } of entries) {
      const created = await addNode({ libraryId: entry.id, type, label: entry.label, x: 0, y: 0 })
      if (created) createdNodes.push(created)
    }
    await layoutNewNodes(nodes, createdNodes, edges)
    setShowLibraryPicker(false)
  }

  const handleApplyNlResult = async (accepted: NLParseResult) => {
    const idByLibraryId = new Map<string, string>()
    for (const existing of nodes) idByLibraryId.set(existing.libraryId, existing.id)

    const createdNodes: GraphNode[] = []

    for (const n of accepted.nodes) {
      const existingId = idByLibraryId.get(n.libraryId)
      if (existingId) {
        // Already on the graph — training it again bumps its proficiency.
        await incrementNodeProficiency(existingId, accepted.trainedAt)
        continue
      }
      const created = await addNode({
        libraryId: n.libraryId,
        type: n.type,
        label: n.label,
        x: 0,
        y: 0,
        trainedAt: accepted.trainedAt,
      })
      if (created) {
        idByLibraryId.set(n.libraryId, created.id)
        createdNodes.push(created)
      }
    }

    const createdEdges: Array<{ sourceId: string; targetId: string }> = []

    for (const e of accepted.edges) {
      const sourceId = idByLibraryId.get(e.sourceLibraryId)
      const targetId = idByLibraryId.get(e.targetLibraryId)
      if (!sourceId || !targetId) continue

      const existingEdge = edges.find(
        (edge) =>
          (edge.sourceId === sourceId && edge.targetId === targetId) ||
          (edge.bidirectional && edge.sourceId === targetId && edge.targetId === sourceId)
      )
      if (existingEdge) {
        await incrementEdgeProficiency(existingEdge.id, accepted.trainedAt)
        continue
      }

      await addEdge({ sourceId, targetId, label: e.label, bidirectional: e.bidirectional, trainedAt: accepted.trainedAt })
      createdEdges.push({ sourceId, targetId })
    }

    await layoutNewNodes(nodes, createdNodes, [...edges, ...createdEdges])

    setNlResult(null)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-text-secondary">Loading graph...</div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {!online && <OfflineBanner />}

      <Toolbar
        rulesetFilter={rulesetFilter}
        onRulesetFilterChange={(f) => void setRulesetFilter(f)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onOpenImportExport={() => setShowImportExport(true)}
        theme={theme}
        themeMode={themeMode}
        onThemeChange={(t) => void setTheme(t)}
        onThemeModeChange={(m) => void setThemeMode(m)}
      />

      <div className="chokepoint-canvas-wrapper relative flex flex-1 overflow-hidden">
        <div className="chokepoint-canvas-wrapper relative flex-1">
          <Legend />
          <GraphCanvas
            rulesetFilter={rulesetFilter}
            searchQuery={searchQuery}
            connectMode={connectMode}
            connectSourceId={connectSourceId}
            onNodeClick={(node) => {
              if (connectMode && !connectSourceId) {
                setConnectSourceId(node.id)
                return
              }
              handleNodeClick(node)
            }}
            onEdgePairClick={handleEdgePairClick}
            onCanvasClick={() => {
              setSelectedNode(null)
              setSelectedEdgePair(null)
            }}
            onConnectComplete={() => {
              setConnectMode(false)
              setConnectSourceId(null)
            }}
            resetViewToken={resetViewToken}
            autoLayoutToken={autoLayoutToken}
          />

          {showOnboarding && nodes.length === 0 && <OnboardingOverlay onDismiss={dismissOnboarding} />}

          <div
            className={`absolute bottom-4 left-4 flex items-center gap-2 ${
              selectedNode || selectedEdgePair ? 'max-sm:hidden' : ''
            }`}
          >
            {/* Desktop: all four utility actions stay as individual buttons */}
            <button
              onClick={() => {
                setConnectMode((v) => !v)
                setConnectSourceId(null)
              }}
              className={`hidden border bg-bg-surface px-3 py-1.5 text-[11px] font-medium uppercase hover:bg-bg-elevated sm:block ${
                connectMode ? 'border-node-submission text-node-submission' : 'border-border text-text-primary'
              }`}
            >
              {connectMode ? (connectSourceId ? 'Select Target...' : 'Select Source...') : 'Add Transition'}
            </button>

            <button
              onClick={() => setShowLibraryPicker(true)}
              className="hidden border border-border bg-bg-surface px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated sm:block"
            >
              Add Position
            </button>

            <button
              onClick={() => setResetViewToken((t) => t + 1)}
              className="hidden border border-border bg-bg-surface px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated sm:block"
            >
              Reset View
            </button>

            <button
              onClick={() => setAutoLayoutToken((t) => t + 1)}
              className="hidden border border-node-submission bg-bg-surface px-3 py-1.5 text-[11px] font-medium uppercase text-node-submission hover:bg-bg-elevated sm:block"
            >
              Auto-Layout
            </button>

            {/* Mobile: Auto-Layout stays visible outside the menu — most useful action.
                While connect mode is active, keep that button visible too so the
                user can see the "select source/target" state and cancel it.
                Everything else collapses into one menu (issue #7). */}
            <button
              onClick={() => setAutoLayoutToken((t) => t + 1)}
              className="border border-node-submission bg-bg-surface px-3 py-1.5 text-[11px] font-medium uppercase text-node-submission hover:bg-bg-elevated sm:hidden"
            >
              Auto-Layout
            </button>

            {connectMode ? (
              <button
                onClick={() => {
                  setConnectMode(false)
                  setConnectSourceId(null)
                }}
                className="border border-node-submission bg-bg-surface px-3 py-1.5 text-[11px] font-medium uppercase text-node-submission hover:bg-bg-elevated sm:hidden"
              >
                {connectSourceId ? 'Select Target...' : 'Select Source...'}
              </button>
            ) : (
              <div className="sm:hidden">
                <OverflowMenu
                  ariaLabel="Graph utilities"
                  items={[
                    { label: 'Add Transition', onClick: () => setConnectMode(true) },
                    { label: 'Add Position', onClick: () => setShowLibraryPicker(true) },
                    { label: 'Reset View', onClick: () => setResetViewToken((t) => t + 1) },
                  ]}
                />
              </div>
            )}
          </div>

          <div
            className={`absolute bottom-4 right-4 flex items-center gap-2 ${
              selectedNode || selectedEdgePair ? 'max-sm:hidden' : ''
            }`}
          >
            <CalendarButton onClick={() => setShowCalendar(true)} />
          </div>
        </div>

        <DetailPanel
          node={selectedNode}
          edgePair={selectedEdgePair}
          allNodes={nodes}
          onClose={() => {
            setSelectedNode(null)
            setSelectedEdgePair(null)
          }}
          onSelectNode={(id) => {
            const n = nodes.find((node) => node.id === id)
            if (n) handleNodeClick(n)
          }}
        />
      </div>

      <NLInputBar
        existingLibraryIds={nodes.map((n) => n.libraryId)}
        customEntries={customLibraryEntries}
        onResult={setNlResult}
      />

      {showLibraryPicker && (
        <LibraryPickerModal
          rulesetFilter={rulesetFilter}
          existingLibraryIds={new Set(nodes.map((n) => n.libraryId))}
          customEntries={customLibraryEntries}
          onCreateCustomEntry={createCustomLibraryEntry}
          onConfirm={(entries) => void handleAddNodes(entries)}
          onCancel={() => setShowLibraryPicker(false)}
        />
      )}

      {showImportExport && <ImportExportModal onClose={() => setShowImportExport(false)} />}

      {showCalendar && (
        <CalendarModal
          nodes={nodes}
          edges={edges}
          onClose={() => setShowCalendar(false)}
          onSelectNode={(id) => {
            const n = nodes.find((node) => node.id === id)
            if (n) {
              handleNodeClick(n)
              setShowCalendar(false)
            }
          }}
          onSelectEdge={(id) => {
            const e = edges.find((edge) => edge.id === id)
            if (e) {
              handleEdgeClick(e)
              setShowCalendar(false)
            }
          }}
        />
      )}

      {nlResult && (
        <NLPreviewModal
          result={nlResult}
          existingNodes={nodes}
          existingEdges={edges}
          onCreateCustomEntry={createCustomLibraryEntry}
          onConfirm={(accepted) => void handleApplyNlResult(accepted)}
          onCancel={() => setNlResult(null)}
        />
      )}
    </div>
  )
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex h-full items-center justify-center text-[12px] text-text-secondary">Loading...</div>
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <GraphStoreProvider>
      <ReactFlowProvider>
        <MainApp />
      </ReactFlowProvider>
    </GraphStoreProvider>
  )
}

export default App
