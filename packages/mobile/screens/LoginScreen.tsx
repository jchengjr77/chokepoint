import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '@chokepoint/shared';
import { colors, radius } from '../theme/tokens';
import { useMonoFont } from '../theme/typography';
import { Logo } from '../components/Logo';
import { AboutModal } from '../components/AboutModal';

export function LoginScreen() {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    const { error } = await signInWithPassword(email, password);
    setBusy(false);
    if (error) setError(error);
  };

  const handleSignUp = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    const { error } = await signUpWithPassword(email, password);
    setBusy(false);
    if (error) setError(error);
    else setInfo('Account created. You are now signed in.');
  };

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  const font = useMonoFont();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <Logo size={12} />
          </View>
          <Text style={[styles.title, font('bold')]}>Chokepoint</Text>
          <Text style={[styles.tagline, font('regular')]}>A training journal for the modern grappler.</Text>

          <Pressable style={styles.aboutButton} onPress={() => setShowAbout(true)}>
            <Text style={[styles.aboutButtonText, font('semiBold')]}>What is Chokepoint?</Text>
          </Pressable>

          <Pressable style={styles.googleButton} onPress={() => void handleGoogle()} disabled={busy}>
            <Text style={[styles.googleButtonText, font('semiBold')]}>Continue with Google</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, font('regular')]}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={[styles.label, font('regular')]}>Email</Text>
          <TextInput
            style={[styles.input, font('regular')]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder=""
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.label, font('regular')]}>Password</Text>
          <TextInput
            style={[styles.input, font('regular')]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error && <Text style={[styles.error, font('regular')]}>{error}</Text>}
          {info && <Text style={[styles.info, font('regular')]}>{info}</Text>}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => void handleLogin()}
              disabled={busy}
            >
              <Text style={[styles.buttonPrimaryText, font('semiBold')]}>Log In</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => void handleSignUp()}
              disabled={busy}
            >
              <Text style={[styles.buttonSecondaryText, font('semiBold')]}>Sign Up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <AboutModal visible={showAbout} onClose={() => setShowAbout(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgPrimary },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    borderRadius: radius,
    padding: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutButton: {
    borderWidth: 1,
    borderColor: colors.nodeSubmission,
    borderRadius: radius,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutButtonText: {
    color: colors.nodeSubmission,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    color: colors.textTertiary,
    fontSize: 10,
    textTransform: 'uppercase',
    marginHorizontal: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 6,
    marginBottom: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 11,
    marginBottom: 12,
  },
  info: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 12,
  },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: {
    flex: 1,
    borderRadius: radius,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonPrimary: { backgroundColor: colors.textPrimary },
  buttonPrimaryText: { color: colors.bgPrimary, fontSize: 12, textTransform: 'uppercase' },
  buttonSecondary: { borderWidth: 1, borderColor: colors.border },
  buttonSecondaryText: { color: colors.textPrimary, fontSize: 12, textTransform: 'uppercase' },
});
