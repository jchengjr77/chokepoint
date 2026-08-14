import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'

export function getOAuthRedirectUrl(): string {
  return Linking.createURL('/')
}

export async function openOAuthUrl(url: string): Promise<{ url: string } | null> {
  const result = await WebBrowser.openAuthSessionAsync(url, getOAuthRedirectUrl())
  if (result.type === 'success' && result.url) {
    return { url: result.url }
  }
  return null
}
