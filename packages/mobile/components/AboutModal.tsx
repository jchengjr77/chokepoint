import { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { monoFont } from '../theme/typography';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  fontsLoaded: boolean;
}

type Tab = 'about' | 'team';

function Feature({
  title,
  children,
  font,
}: {
  title: string;
  children: string;
  font: (weight?: Parameters<typeof monoFont>[0]) => { fontFamily: string };
}) {
  return (
    <View style={styles.feature}>
      <Text style={[styles.featureTitle, font('semiBold')]}>{title}</Text>
      <Text style={[styles.featureBody, font('regular')]}>{children}</Text>
    </View>
  );
}

function AboutTab({ font }: { font: (weight?: Parameters<typeof monoFont>[0]) => { fontFamily: string } }) {
  return (
    <>
      <Text style={[styles.heading, font('bold')]}>The modern grappler's training journal.</Text>
      <Text style={[styles.paragraph, font('regular')]}>
        Track your knowledge of positions and submissions, connected by techniques.
      </Text>

      <Feature title="Natural language input" font={font}>
        Type what you trained in plain English (e.g. "scissor sweep from closed guard to mount, then mounted armbar")
        and your map automatically updates itself.
      </Feature>
      <Feature title="Calendar" font={font}>
        Training inputs are logged into the calendar automatically. This shows what you trained on any given day.
      </Feature>
      <Feature title="Positions & Techniques" font={font}>
        Positions and Submissions are nodes in the map, and Techniques connect them. Don't see something you know?
        Define your own!
      </Feature>
      <Feature title="Smart Layout" font={font}>
        The map runs left to right by advantage: bad positions on the left, good ones on the right. Use Auto-Layout
        to clean up your map.
      </Feature>
      <Feature title="Themes" font={font}>
        Pick from popular color themes and light or dark mode from the toolbar!
      </Feature>
    </>
  );
}

function TeamTab({ font }: { font: (weight?: Parameters<typeof monoFont>[0]) => { fontFamily: string } }) {
  return (
    <>
      <Text style={[styles.heading, font('bold')]}>JJ Cheng</Text>
      <Text style={[styles.paragraph, font('regular')]}>
        Chokepoint is built and maintained by a single person, in whatever hours are left after training. There is
        no QA department. There is no on-call rotation. There's only JJ Cheng, who should really be learning how to
        pass a guard instead of building this thing. Maybe then he would stop falling back into leglocks all the
        time.
      </Text>

      <View style={styles.card}>
        <Text style={[styles.cardName, font('semiBold')]}>Jonathan Cheng</Text>
        <Text style={[styles.cardSub, font('regular')]}>
          Blue belt, training at Workshop NYC (Lower East Side). Based in New York City.
        </Text>
        <View style={styles.linkRow}>
          <Pressable onPress={() => void Linking.openURL('https://github.com/jchengjr77')}>
            <Text style={[styles.link, font('regular')]}>github.com/jchengjr77</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL('https://www.linkedin.com/in/jchengjr77/')}>
            <Text style={[styles.link, font('regular')]}>LinkedIn</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.paragraph, styles.footnote, font('regular')]}>Dirty leglockers...</Text>
    </>
  );
}

export function AboutModal({ visible, onClose, fontsLoaded }: AboutModalProps) {
  const [tab, setTab] = useState<Tab>('about');
  const font = (weight: Parameters<typeof monoFont>[0] = 'regular') => monoFont(weight, fontsLoaded);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, font('semiBold')]}>Chokepoint</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[styles.closeX, font('regular')]}>&times;</Text>
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            {(['about', 'team'] as Tab[]).map((t) => (
              <Pressable key={t} style={styles.tabButton} onPress={() => setTab(t)}>
                <Text
                  style={[
                    styles.tabButtonText,
                    font('medium'),
                    tab === t ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  ]}
                >
                  {t === 'about' ? 'About' : 'Team'}
                </Text>
                {tab === t && <View style={styles.tabUnderline} />}
              </Pressable>
            ))}
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {tab === 'about' ? <AboutTab font={font} /> : <TeamTab font={font} />}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, font('medium')]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 13, textTransform: 'uppercase' },
  closeX: { color: colors.textSecondary, fontSize: 18 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabButtonText: { fontSize: 11, textTransform: 'uppercase' },
  tabButtonTextActive: { color: colors.textPrimary },
  tabButtonTextInactive: { color: colors.textSecondary },
  tabUnderline: { marginTop: 6, height: 2, width: '60%', backgroundColor: colors.textPrimary },
  body: { paddingHorizontal: 16 },
  bodyContent: { paddingVertical: 16 },
  heading: { color: colors.textPrimary, fontSize: 15, marginBottom: 8, lineHeight: 20 },
  paragraph: { color: colors.textPrimary, fontSize: 12, lineHeight: 18, marginBottom: 20 },
  footnote: { color: colors.textSecondary, marginTop: 16, marginBottom: 0 },
  feature: { marginBottom: 14 },
  featureTitle: { color: colors.textPrimary, fontSize: 11, textTransform: 'uppercase', marginBottom: 3 },
  featureBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    borderRadius: radius,
    padding: 12,
  },
  cardName: { color: colors.textPrimary, fontSize: 12, marginBottom: 4 },
  cardSub: { color: colors.textSecondary, fontSize: 11, lineHeight: 15, marginBottom: 8 },
  linkRow: { flexDirection: 'row', gap: 14 },
  link: { color: colors.nodeSubmission, fontSize: 11, textDecorationLine: 'underline' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  closeButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingHorizontal: 12, paddingVertical: 8 },
  closeButtonText: { color: colors.textPrimary, fontSize: 11, textTransform: 'uppercase' },
});
