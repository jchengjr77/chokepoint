// Purely cosmetic — a random one shows in the toolbar's empty space on
// each page load. Not meant to be exhaustive or taken too seriously.
export const TOOLBAR_MESSAGES: string[] = [
  '"When am I getting my blue belt?" — one-stripe white belt',
  "Wow, you're so strong. How much do you weigh?",
  "I wonder when I'm getting promoted...",
  'Move of the day: brazilian tap',
  'That was more of a crank',
  'instagram moves > strong fundamentals',
  'Oss!',
  'Those dirty leglockers...',
  'Just flow, bro. (goes 100%)',
  'Tap early, tap often.',
  'New gi, who dis?',
  "So, to finish the armbar from here...",
  "I'm just here for the cardio.",
  'Competition team when?',
  'One more roll, I promise.',
  'Death by berimbolo.',
  'Certified passer',
  "Do not mother's milk me. I will throw up."
]

export function randomToolbarMessage(): string {
  return TOOLBAR_MESSAGES[Math.floor(Math.random() * TOOLBAR_MESSAGES.length)]
}
