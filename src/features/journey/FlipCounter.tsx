import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { countdownParts } from './events';

export function FlipCounter({ date }: { date: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const parts = countdownParts(date, now);

  return (
    <View style={styles.row}>
      <FlipUnit value={parts.days} label="Days" />
      <FlipUnit value={parts.hours} label="Hrs" />
      <FlipUnit value={parts.minutes} label="Min" />
    </View>
  );
}

function FlipUnit({ value, label }: { value: number; label: string }) {
  const [shown, setShown] = useState(value);
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (value === shown) return undefined;
    const animation = Animated.timing(flip, {
      toValue: 1,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      setShown(value);
      flip.setValue(-1);
      Animated.timing(flip, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => animation.stop();
  }, [flip, shown, value]);

  const rotateX = flip.interpolate({ inputRange: [-1, 0, 1], outputRange: ['88deg', '0deg', '-88deg'] });

  return (
    <View style={styles.unit}>
      <Animated.View style={[styles.card, { transform: [{ perspective: 500 }, { rotateX }] }]}>
        <Text style={styles.number}>{String(shown).padStart(2, '0')}</Text>
        <View style={styles.seam} />
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  unit: { alignItems: 'center', width: 34 },
  card: {
    width: 32,
    height: 26,
    borderRadius: 3,
    backgroundColor: '#141414',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  number: { color: '#f5f5f5', fontSize: 14, fontWeight: '500', fontVariant: ['tabular-nums'] },
  seam: { position: 'absolute', left: 0, right: 0, top: 12, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.18)' },
  label: { color: '#8d8d8d', fontSize: 8, fontWeight: '500', letterSpacing: 0.6, marginTop: 3, textTransform: 'uppercase' },
});
