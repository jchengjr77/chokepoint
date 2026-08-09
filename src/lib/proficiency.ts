export type ProficiencyTier = 0 | 1 | 2 | 3

/**
 * Maps a raw rep count to a visual tier: 0 reps is untrained (baseline
 * styling), then three increasingly-trained tiers driving thicker
 * node borders and edge strokes.
 */
export function getProficiencyTier(proficiency: number): ProficiencyTier {
  if (proficiency <= 0) return 0
  if (proficiency <= 2) return 1
  if (proficiency <= 5) return 2
  return 3
}

const TIER_STROKE_WIDTH: Record<ProficiencyTier, number> = {
  0: 1,
  1: 2,
  2: 3,
  3: 4,
}

export function getProficiencyStrokeWidth(proficiency: number): number {
  return TIER_STROKE_WIDTH[getProficiencyTier(proficiency)]
}
