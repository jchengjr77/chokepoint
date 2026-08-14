const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Monorepo support: watch the whole workspace (so edits to
// @chokepoint/shared trigger a Metro refresh) and let Metro resolve
// modules hoisted to the root node_modules, not just this package's own.
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
// @chokepoint/shared ships its TS source directly (no build step) — force
// Metro to resolve the workspace symlink to its real path rather than
// treating it as an external package, so its own relative imports (and
// this app's single copy of react/react-native) resolve consistently.
config.resolver.disableHierarchicalLookup = false
config.resolver.unstable_enableSymlinks = true

module.exports = config
