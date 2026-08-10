/**
 * Default label for a transition the user didn't name a specific
 * technique for, e.g. "Top Mount to Armbar" — used wherever an edge is
 * created (manual Connect flow, NL parsing) so a blank/empty label never
 * gets stored; every edge reads as something meaningful without the
 * user having to type anything.
 */
export function defaultEdgeLabel(sourceLabel: string, targetLabel: string): string {
  return `${sourceLabel} to ${targetLabel}`
}
