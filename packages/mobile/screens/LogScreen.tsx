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
  ActivityIndicator,
} from 'react-native';
import {
  parseNaturalLanguage,
  applyNlResult,
  useGraphStore,
  useCustomLibrary,
  useNlpUsage,
  buildSessionShareData,
  useTrainingLog,
  type NLParseResult,
} from '@chokepoint/shared';
import { colors, radius } from '../theme/tokens';
import { useMonoFont } from '../theme/typography';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatLoggedDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function LogScreen() {
  const { nodes, edges, addNode, addEdge, incrementNodeProficiency, incrementEdgeProficiency } = useGraphStore();
  const { entries: customLibraryEntries } = useCustomLibrary();
  const { entries: trainingLogEntries, refresh: refreshTrainingLog } = useTrainingLog(true);
  const [usageRefreshToken, setUsageRefreshToken] = useState(0);
  const { used, limit, unlimited } = useNlpUsage(usageRefreshToken);

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<NLParseResult | null>(null);
  const [confirmedMessage, setConfirmedMessage] = useState<string | null>(null);
  const font = useMonoFont();

  const handleSubmit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    setConfirmedMessage(null);
    try {
      const parsed = await parseNaturalLanguage(text, nodes.map((n) => n.libraryId), customLibraryEntries);
      setUsageRefreshToken((t) => t + 1);
      const nothingFound = parsed.nodes.length === 0 && parsed.edges.length === 0 && parsed.unrecognized.length === 0;
      if (nothingFound) {
        setError("Didn't recognize any grappling training in that — try describing what you trained.");
        return;
      }
      setResult(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse input');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setResult(null);
  };

  const handleConfirm = async () => {
    if (!result || applying) return;
    setApplying(true);
    try {
      await applyNlResult(result, {
        nodes,
        edges,
        addNode,
        addEdge,
        incrementNodeProficiency,
        incrementEdgeProficiency,
      });
      const shareData = buildSessionShareData(result, trainingLogEntries);
      setConfirmedMessage(
        `Logged ${shareData.transitions.length + shareData.standaloneChain.length} item${
          shareData.transitions.length + shareData.standaloneChain.length === 1 ? '' : 's'
        }. ${shareData.streakDays} day streak.`
      );
      void refreshTrainingLog();
      setResult(null);
      setText('');
    } finally {
      setApplying(false);
    }
  };

  if (result) {
    return (
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.reviewContent}>
          <Text style={[styles.reviewTitle, font('semiBold')]}>Review</Text>
          {result.trainedAt && (
            <Text style={[styles.reviewDate, font('regular')]}>Logged as {formatLoggedDate(result.trainedAt)}</Text>
          )}

          {result.nodes.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, font('semiBold')]}>Nodes</Text>
              {result.nodes.map((n) => (
                <View key={n.libraryId} style={styles.row}>
                  <Text style={[styles.rowText, font('regular')]}>{n.label}</Text>
                  <Text style={[styles.rowMeta, font('regular')]}>
                    {n.type.toUpperCase()}
                    {n.alreadyOnGraph ? ' · +1 SESSION' : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {result.edges.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, font('semiBold')]}>Transitions</Text>
              {result.edges.map((e, idx) => {
                const sourceLabel = result.nodes.find((n) => n.libraryId === e.sourceLibraryId)?.label ?? e.sourceLibraryId;
                const targetLabel = result.nodes.find((n) => n.libraryId === e.targetLibraryId)?.label ?? e.targetLibraryId;
                return (
                  <View key={idx} style={styles.row}>
                    <Text style={[styles.rowText, font('regular')]}>
                      {sourceLabel} {e.bidirectional ? '↔' : '→'} {targetLabel}
                    </Text>
                    {e.label && <Text style={[styles.rowMeta, font('regular')]}>{e.label}</Text>}
                  </View>
                );
              })}
            </View>
          )}

          {result.unrecognized.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, font('semiBold')]}>Unrecognized (skipped)</Text>
              {result.unrecognized.map((term, idx) => (
                <View key={idx} style={styles.warningRow}>
                  <Text style={[styles.warningText, font('regular')]}>{term}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.reviewFooter}>
          <Pressable style={styles.reviewButtonSecondary} onPress={handleCancel} disabled={applying}>
            <Text style={[styles.reviewButtonSecondaryText, font('semiBold')]}>Edit</Text>
          </Pressable>
          <Pressable style={styles.reviewButtonPrimary} onPress={() => void handleConfirm()} disabled={applying}>
            {applying ? (
              <ActivityIndicator color={colors.bgPrimary} />
            ) : (
              <Text style={[styles.reviewButtonPrimaryText, font('semiBold')]}>Confirm</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.centerContent}>
        <Text style={[styles.prompt, font('semiBold')]}>What did you learn today?</Text>
        <Text style={[styles.promptSub, font('regular')]}>
          Describe what you drilled — Chokepoint adds it to your map for you.
        </Text>

        {confirmedMessage && <Text style={[styles.confirmed, font('regular')]}>{confirmedMessage}</Text>}
        {error && <Text style={[styles.error, font('regular')]}>{error}</Text>}
      </View>

      <View style={styles.inputBar}>
        {!error && !unlimited && used !== null && (
          <Text style={[styles.quota, font('regular')]}>
            {Math.max(limit - used, 0)} of {limit} free AI parses left this week
          </Text>
        )}
        <View style={styles.inputRow}>
          <Text style={[styles.prompt2, font('semiBold')]}>&gt;</Text>
          <TextInput
            style={[styles.input, font('regular')]}
            value={text}
            onChangeText={setText}
            placeholder="e.g. scissor sweep from closed guard to mount"
            placeholderTextColor={colors.textTertiary}
            editable={!busy}
            multiline
          />
          <Pressable
            style={[styles.sendButton, (busy || !text.trim()) && styles.sendButtonDisabled]}
            onPress={() => void handleSubmit()}
            disabled={busy || !text.trim()}
          >
            {busy ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={[styles.sendButtonText, font('semiBold')]}>Send</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgPrimary },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  prompt: { color: colors.textPrimary, fontSize: 16, textAlign: 'center', marginBottom: 8 },
  promptSub: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  confirmed: { color: colors.nodeSubmission, fontSize: 12, textAlign: 'center', marginTop: 16 },
  error: { color: colors.danger, fontSize: 12, textAlign: 'center', marginTop: 16 },
  inputBar: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgSurface, padding: 12 },
  quota: { color: colors.textTertiary, fontSize: 10, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  prompt2: { color: colors.nodeSubmission, fontSize: 14, paddingBottom: 8 },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: colors.textPrimary, fontSize: 11, textTransform: 'uppercase' },

  reviewContent: { padding: 16 },
  reviewTitle: { color: colors.textPrimary, fontSize: 14, textTransform: 'uppercase', marginBottom: 4 },
  reviewDate: { color: colors.textSecondary, fontSize: 11, marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionLabel: { color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 6,
  },
  rowText: { color: colors.textPrimary, fontSize: 12, flex: 1 },
  rowMeta: { color: colors.textTertiary, fontSize: 10, textTransform: 'uppercase', marginLeft: 8 },
  warningRow: {
    borderWidth: 1,
    borderColor: '#664400',
    borderRadius: radius,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 6,
  },
  warningText: { color: colors.textSecondary, fontSize: 12 },
  reviewFooter: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
  },
  reviewButtonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reviewButtonSecondaryText: { color: colors.textPrimary, fontSize: 12, textTransform: 'uppercase' },
  reviewButtonPrimary: {
    flex: 1,
    backgroundColor: colors.textPrimary,
    borderRadius: radius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reviewButtonPrimaryText: { color: colors.bgPrimary, fontSize: 12, textTransform: 'uppercase' },
});
