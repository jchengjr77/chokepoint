import { useEffect, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useAuth } from '@chokepoint/shared'
import { GraphStoreProvider, useGraphStore } from '@chokepoint/shared'
import { useCustomLibrary } from '@chokepoint/shared'
import { useTrainingLog } from '@chokepoint/shared'
import { LoginScreen } from './components/LoginScreen'
import { Toolbar } from './components/Toolbar'
import { GraphCanvas } from './components/graph/GraphCanvas'
import { LibraryPickerModal } from './components/LibraryPickerModal'
import { DetailPanel } from './components/DetailPanel'
import { NLInputBar } from './components/NLInputBar'
import { NLPreviewModal } from './components/NLPreviewModal'
import { ImportExportModal } from './components/ImportExportModal'
import { TutorialModal, hasSeenTutorial, markTutorialSeen } from './components/TutorialModal'
import { Legend } from './components/Legend'
import { CalendarModal } from './components/CalendarModal'
import { CalendarButton } from './components/CalendarButton'
import { TrainingStatsButton } from './components/TrainingStatsButton'
import { TrainingSummaryModal } from './components/TrainingSummaryModal'
import { OverflowMenu } from './components/OverflowMenu'
import { ShareCardModal } from './components/ShareCardModal'
import { computeAutoLayoutForNewNodes } from '@chokepoint/shared'
import { applyNlResult } from '@chokepoint/shared'
import { buildSessionShareData, type SessionShareData } from '@chokepoint/shared'
import type { GraphEdge, GraphNode, NLParseResult } from '@chokepoint/shared'

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
  // Kept loaded at all times (not lazily inside a modal) so streak/pace
  // data is ready synchronously the moment an NL-parsed session is
  // confirmed, for the post-log share card.
  const { entries: trainingLogEntries, refresh: refreshTrainingLog } = useTrainingLog(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-mode', themeMode)
  }, [theme, themeMode])

  const [showLibraryPicker, setShowLibraryPicker] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTrainingSummary, setShowTrainingSummary] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [selectedEdgePair, setSelectedEdgePair] = useState<{ sourceId: string; targetId: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [resetViewToken, setResetViewToken] = useState(0)
  const [autoLayoutToken, setAutoLayoutToken] = useState(0)
  const [connectMode, setConnectMode] = useState(false)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [nlResult, setNlResult] = useState<NLParseResult | null>(null)
  const [nlClearToken, setNlClearToken] = useState(0)
  const [shareCardData, setShareCardData] = useState<SessionShareData | null>(null)
  const [showTutorial, setShowTutorial] = useState(!hasSeenTutorial())

  const closeTutorial = () => {
    markTutorialSeen()
    setShowTutorial(false)
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
    await applyNlResult(accepted, {
      nodes,
      edges,
      addNode,
      addEdge,
      incrementNodeProficiency,
      incrementEdgeProficiency,
      onNodesCreated: (createdNodes, createdEdges) => layoutNewNodes(nodes, createdNodes, [...edges, ...createdEdges]),
    })

    setNlResult(null)
    setNlClearToken((t) => t + 1)

    if (accepted.nodes.length > 0 || accepted.edges.length > 0) {
      setShareCardData(buildSessionShareData(accepted, trainingLogEntries))
    }
    void refreshTrainingLog()
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
        onOpenTutorial={() => setShowTutorial(true)}
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
            className={`absolute bottom-4 right-4 flex flex-col items-end gap-2 ${
              selectedNode || selectedEdgePair ? 'max-sm:hidden' : ''
            }`}
          >
            <TrainingStatsButton onClick={() => setShowTrainingSummary(true)} />
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
        clearToken={nlClearToken}
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

      {showTrainingSummary && (
        <TrainingSummaryModal nodes={nodes} edges={edges} onClose={() => setShowTrainingSummary(false)} />
      )}

      {showTutorial && <TutorialModal onClose={closeTutorial} />}

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

      {shareCardData && <ShareCardModal data={shareCardData} onClose={() => setShareCardData(null)} />}
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
