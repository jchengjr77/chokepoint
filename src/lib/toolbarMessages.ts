// Purely cosmetic — a random one shows in the toolbar's empty space on
// each page load. Not meant to be exhaustive or taken too seriously.
export const TOOLBAR_MESSAGES: string[] = [
  '"When am I getting my blue belt?" — one-stripe white belt',
  "Wow, you're so strong. How much do you weigh?",
  "I wonder when I'm getting promoted...",
  'Move of the day: brazilian tap',
  'That was more of a crank',
  'instagram moves > strong fundamentals',
  'Oss',
  'Those dirty leglockers...',
  'Just flow, bro.',
  "It's not a leglock, it's a leg entanglement.",
  'Tap early, tap often.',
  'New gi, who dis?',
  'Rolling light today (narrator: they were not rolling light)',
  "Don't worry, I went easy on you.",
  "I'm just here for the cardio.",
  'The best technique is the one you never see coming — or ever remember.',
  'Competition team when?',
  'One more roll, I promise.',
  'Death by berimbolo.',
  'Certified guard passer (citation needed)',
]

export function randomToolbarMessage(): string {
  return TOOLBAR_MESSAGES[Math.floor(Math.random() * TOOLBAR_MESSAGES.length)]
}
