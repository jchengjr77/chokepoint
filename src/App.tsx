import { useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useAuth } from './hooks/useAuth'
import { GraphStoreProvider, useGraphStore } from './hooks/useGraphStore'
import { LoginScreen } from './components/LoginScreen'
import { Toolbar } from './components/Toolbar'
import { GraphCanvas } from './components/graph/GraphCanvas'
import { LibraryPickerModal } from './components/LibraryPickerModal'
import { DetailPanel } from './components/DetailPanel'
import { NLInputBar } from './components/NLInputBar'
import { NLPreviewModal } from './components/NLPreviewModal'
import { ImportExportModal } from './components/ImportExportModal'
import { OnboardingOverlay, hasSeenOnboarding, markOnboardingSeen } from './components/OnboardingOverlay'
import { placeNearContext } from './lib/layout'
import type { GraphEdge, GraphNode, NLParseResult } from './types'

function OfflineBanner() {
  return (
    <div className="flex h-8 shrink-0 items-center justify-center bg-bg-elevated text-[11px] uppercase text-text-secondary">
      You are offline — changes are disabled until connection is restored.
    </div>
  )
}

function MainApp() {
  const { nodes, loading, online, rulesetFilter, setRulesetFilter, addNode, addEdge } = useGraphStore()

  const [showLibraryPicker, setShowLibraryPicker] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null)
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
    setSelectedEdge(null)
    setSelectedNode(node)
  }

  const handleEdgeClick = (edge: GraphEdge) => {
    setSelectedNode(null)
    setSelectedEdge(edge)
  }

  const handleAddNodes = async (entries: Array<{ entry: { id: string; label: string }; type: 'position' | 'submission' }>) => {
    for (const { entry, type } of entries) {
      const contextNodes = nodes.map((n) => ({ x: n.x, y: n.y }))
      const { x, y } = placeNearContext(contextNodes, { x: 0, y: 0 })
      await addNode({ libraryId: entry.id, type, label: entry.label, x, y })
    }
    setShowLibraryPicker(false)
  }

  const handleApplyNlResult = async (accepted: NLParseResult) => {
    const idByLibraryId = new Map<string, string>()
    for (const existing of nodes) idByLibraryId.set(existing.libraryId, existing.id)

    for (const n of accepted.nodes) {
      if (idByLibraryId.has(n.libraryId)) continue
      const contextNodes = nodes.map((existing) => ({ x: existing.x, y: existing.y }))
      const { x, y } = placeNearContext(contextNodes, { x: 0, y: 0 })
      const created = await addNode({ libraryId: n.libraryId, type: n.type, label: n.label, x, y })
      if (created) idByLibraryId.set(n.libraryId, created.id)
    }

    for (const e of accepted.edges) {
      const sourceId = idByLibraryId.get(e.sourceLibraryId)
      const targetId = idByLibraryId.get(e.targetLibraryId)
      if (!sourceId || !targetId) continue
      await addEdge({ sourceId, targetId, label: e.label, bidirectional: e.bidirectional })
    }

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
        onAddNode={() => setShowLibraryPicker(true)}
        onResetView={() => setResetViewToken((t) => t + 1)}
        onAutoLayout={() => setAutoLayoutToken((t) => t + 1)}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1">
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
            onEdgeClick={handleEdgeClick}
            onCanvasClick={() => {
              setSelectedNode(null)
              setSelectedEdge(null)
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
            className={`absolute bottom-4 left-4 flex gap-2 ${
              selectedNode || selectedEdge ? 'max-sm:hidden' : ''
            }`}
          >
            <button
              onClick={() => {
                setConnectMode((v) => !v)
                setConnectSourceId(null)
              }}
              className={`border px-3 py-1.5 text-[11px] font-medium uppercase hover:bg-bg-elevated ${
                connectMode ? 'border-node-submission text-node-submission' : 'border-border text-text-primary'
              }`}
            >
              {connectMode ? (connectSourceId ? 'Select Target...' : 'Select Source...') : 'Connect'}
            </button>
            <button
              onClick={() => setShowImportExport(true)}
              className="border border-border px-3 py-1.5 text-[11px] font-medium uppercase text-text-primary hover:bg-bg-elevated"
            >
              Import / Export
            </button>
          </div>
        </div>

        <DetailPanel
          node={selectedNode}
          edge={selectedEdge}
          allNodes={nodes}
          onClose={() => {
            setSelectedNode(null)
            setSelectedEdge(null)
          }}
          onSelectNode={(id) => {
            const n = nodes.find((node) => node.id === id)
            if (n) handleNodeClick(n)
          }}
        />
      </div>

      <NLInputBar existingLibraryIds={nodes.map((n) => n.libraryId)} onResult={setNlResult} />

      {showLibraryPicker && (
        <LibraryPickerModal
          rulesetFilter={rulesetFilter}
          existingLibraryIds={new Set(nodes.map((n) => n.libraryId))}
          onConfirm={(entries) => void handleAddNodes(entries)}
          onCancel={() => setShowLibraryPicker(false)}
        />
      )}

      {showImportExport && <ImportExportModal onClose={() => setShowImportExport(false)} />}

      {nlResult && (
        <NLPreviewModal
          result={nlResult}
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
