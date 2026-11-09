import { forwardRef, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export const PLANET_SIZE = 128;

export const PlanetBody = forwardRef<View, { color: string; index: number; spin?: boolean }>(function PlanetBody(
  { color, index, spin = false },
  ref,
) {
  const drift = useRef(new Animated.Value(0)).current;
  const tilt = -18 + index * 8;
  const bandTop = 26 + (index % 3) * 14;

  useEffect(() => {
    if (!spin) return undefined;
    const animation = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [drift, spin]);

  const shift = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -PLANET_SIZE] });
  const face = <PlanetFace tilt={tilt} bandTop={bandTop} index={index} />;

  return (
    <View ref={ref} collapsable={false} style={styles.planetStage}>
      <View style={[styles.atmosphere, { borderColor: color }]} />
      <View style={[styles.planetDisc, { backgroundColor: color }]}>
        {spin ? (
          <Animated.View style={[styles.surface, { transform: [{ translateX: shift }] }]}>
            {face}
            <PlanetFace tilt={tilt} bandTop={bandTop} index={index} />
          </Animated.View>
        ) : face}
        <View style={styles.terminator} />
        <View style={styles.glint} />
      </View>
    </View>
  );
});

function PlanetFace({ tilt, bandTop, index }: { tilt: number; bandTop: number; index: number }) {
  return (
    <View style={styles.face}>
      <View style={[styles.planetBand, { top: bandTop, transform: [{ rotate: `${tilt}deg` }] }]} />
      <View style={[styles.planetBand, styles.planetBandThin, { top: bandTop + 34, transform: [{ rotate: `${tilt}deg` }] }]} />
      <View style={[styles.crater, { left: 24 + (index % 3) * 10, top: 58 + (index % 2) * 8, width: 16, height: 16 }]} />
      <View style={[styles.crater, { left: 72, top: 40 + index * 3, width: 9, height: 9 }]} />
      <View style={[styles.crater, { left: 46, top: 86, width: 7, height: 7 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  planetStage: { width: PLANET_SIZE, height: PLANET_SIZE, alignItems: 'center', justifyContent: 'center' },
  atmosphere: { position: 'absolute', width: PLANET_SIZE + 16, height: PLANET_SIZE + 16, borderRadius: (PLANET_SIZE + 16) / 2, borderWidth: 1, opacity: 0.45 },
  planetDisc: { width: PLANET_SIZE, height: PLANET_SIZE, borderRadius: PLANET_SIZE / 2, overflow: 'hidden' },
  surface: { position: 'absolute', left: 0, top: 0, width: PLANET_SIZE * 2, height: PLANET_SIZE, flexDirection: 'row' },
  face: { width: PLANET_SIZE, height: PLANET_SIZE, overflow: 'hidden' },
  planetBand: { position: 'absolute', left: -20, right: -20, height: 12, backgroundColor: 'rgba(0,0,0,0.16)' },
  planetBandThin: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)' },
  crater: { position: 'absolute', borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.18)' },
  terminator: { position: 'absolute', width: PLANET_SIZE, height: PLANET_SIZE, borderRadius: PLANET_SIZE / 2, backgroundColor: 'rgba(0,0,0,0.5)', left: PLANET_SIZE * 0.46 },
  glint: { position: 'absolute', width: PLANET_SIZE * 0.42, height: PLANET_SIZE * 0.22, borderRadius: PLANET_SIZE, backgroundColor: 'rgba(255,255,255,0.32)', top: PLANET_SIZE * 0.14, left: PLANET_SIZE * 0.12, transform: [{ rotate: '-22deg' }] },
});
