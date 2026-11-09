import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

export function Hairlines() {
  return (
    <>
      <View pointerEvents="none" style={[styles.rule, styles.left]} />
      <View pointerEvents="none" style={[styles.rule, styles.right]} />
    </>
  );
}

const styles = StyleSheet.create({
  rule: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: theme.line,
  },
  left: { left: 12 },
  right: { right: 12 },
});
