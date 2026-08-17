import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { AuthProvider, useAuth } from '@chokepoint/shared';
import { colors } from '../theme/tokens';
import { FontsProvider } from '../theme/FontsContext';
import { getOAuthRedirectUrl, openOAuthUrl } from '../lib/oauth';
import '../lib/supabase';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.textPrimary} />
    </View>
  );
}

// Redirects between the (auth) and (tabs) route groups based on sign-in
// state — Expo Router has no built-in auth guard, this is the documented
// pattern for it.
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inTabsGroup = segments[0] === '(tabs)';
    if (!user && inTabsGroup) {
      router.replace('/login');
    } else if (user && !inTabsGroup) {
      router.replace('/(tabs)/log');
    }
  }, [user, loading, segments, router]);

  if (loading) return <LoadingScreen />;
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  if (!fontsLoaded) return <LoadingScreen />;

  return (
    <FontsProvider loaded={fontsLoaded}>
      <AuthProvider getOAuthRedirectUrl={getOAuthRedirectUrl} openOAuthUrl={openOAuthUrl}>
        <AuthGate>
          <Slot />
        </AuthGate>
      </AuthProvider>
    </FontsProvider>
  );
}
