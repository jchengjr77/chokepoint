import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';
import { useMonoFont } from '../../theme/typography';

export default function Stats() {
  const font = useMonoFont();
  return (
    <View style={styles.container}>
      <Text style={[styles.text, font('regular')]}>Stats view coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.textSecondary, fontSize: 12 },
});
