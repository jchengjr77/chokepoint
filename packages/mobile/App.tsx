import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { AuthProvider, useAuth } from '@chokepoint/shared';
import { colors } from './theme/tokens';
import { monoFont } from './theme/typography';
import { LoginScreen } from './screens/LoginScreen';
import { getOAuthRedirectUrl, openOAuthUrl } from './lib/oauth';

function Root({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen fontsLoaded={fontsLoaded} />;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, monoFont('bold', fontsLoaded)]}>Chokepoint</Text>
      <Text style={[styles.subtext, monoFont('regular', fontsLoaded)]}>Signed in as {user.email}</Text>
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <AuthProvider getOAuthRedirectUrl={getOAuthRedirectUrl} openOAuthUrl={openOAuthUrl}>
      <Root fontsLoaded={fontsLoaded} />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    textTransform: 'uppercase',
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
});
