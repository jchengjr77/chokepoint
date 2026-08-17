import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'

export function getOAuthRedirectUrl(): string {
  return Linking.createURL('/')
}

export async function openOAuthUrl(url: string): Promise<{ url: string } | null> {
  // preferEphemeralSession skips iOS's "chokepoint.dev wants to use
  // google.com to sign in" system prompt and the shared Safari cookie
  // jar — without it, this reads as "a browser opened" rather than an
  // in-app auth sheet. No downside for us: we don't rely on a
  // persistent web session surviving between sign-ins.
  const result = await WebBrowser.openAuthSessionAsync(url, getOAuthRedirectUrl(), {
    preferEphemeralSession: true,
  })
  if (result.type === 'success' && result.url) {
    return { url: result.url }
  }
  return null
}
