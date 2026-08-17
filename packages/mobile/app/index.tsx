import { Redirect } from 'expo-router';

// AuthGate (see _layout.tsx) redirects away from here once auth state is
// known; this is just the very first frame's target so there's no
// "unmatched route" flash before that effect fires.
export default function Index() {
  return <Redirect href="/login" />;
}
