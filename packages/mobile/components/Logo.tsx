import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

// Five squares in BJJ belt order — the app's logo mark. Mirrors
// packages/web/src/components/Logo.tsx.
const BELT_COLORS = ['#ffffff', '#1a5fb4', '#5e2d8a', '#5c3a21', '#111111'];

interface LogoProps {
  size?: number;
}

export function Logo({ size = 10 }: LogoProps) {
  return (
    <View style={styles.row} accessibilityLabel="Chokepoint logo" accessibilityRole="image">
      {BELT_COLORS.map((color, i) => (
        <View
          key={i}
          style={{ width: size, height: size, backgroundColor: color, borderWidth: 1, borderColor: colors.border }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
