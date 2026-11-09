import { AuthView } from '@clerk/expo/native-components';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Hairlines } from '../../../components/Hairlines';
import { Logo } from '../../../components/Logo';
import { theme } from '../../../theme';

const { height } = Dimensions.get('window');
const LINES = ['Dive into', 'the most connected', 'conference space'] as const;

export function LoginScreen() {
  const spin = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const twinkleA = useRef(new Animated.Value(0)).current;
  const twinkleB = useRef(new Animated.Value(1)).current;
  const twinkleC = useRef(new Animated.Value(0.4)).current;
  const started = useRef(false);
  const [covering, setCovering] = useState(true);
  const [passing, setPassing] = useState(false);

  useEffect(() => {
    const orbit = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 22000, easing: Easing.linear, useNativeDriver: true }),
    );
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const pulse = (value: Animated.Value, duration: number) => Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const starsA = pulse(twinkleA, 2400);
    const starsB = pulse(twinkleB, 3200);
    const starsC = pulse(twinkleC, 2800);
    const intro = Animated.timing(reveal, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    orbit.start();
    float.start();
    starsA.start();
    starsB.start();
    starsC.start();
    intro.start();
    return () => {
      orbit.stop();
      float.stop();
      starsA.stop();
      starsB.stop();
      starsC.stop();
      intro.stop();
    };
  }, [drift, reveal, spin, twinkleA, twinkleB, twinkleC]);

  const openLogin = () => {
    if (started.current) return;
    started.current = true;
    setPassing(true);
    Animated.timing(slide, {
      toValue: 1,
      duration: 760,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start(() => setCovering(false));
  };

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotateBack = spin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const lift = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const glow = drift.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.62] });
  const hint = drift.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.92] });
  const grow = slide.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1.22, 1.48] });
  const graphicLift = slide.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  const backdrop = slide.interpolate({ inputRange: [0, 0.28, 1], outputRange: [1, 0.92, 0] });
  const copy = slide.interpolate({ inputRange: [0, 0.42], outputRange: [1, 0], extrapolate: 'clamp' });
  const copyLift = drift.interpolate({ inputRange: [0, 1], outputRange: [5, -5] });
  const starGlow = useMemo(() => STARS.map((star, index) => {
    const source = index % 3 === 0 ? twinkleA : index % 3 === 1 ? twinkleB : twinkleC;
    return source.interpolate({ inputRange: [0, 1], outputRange: [star.opacity * 0.2, star.opacity] });
  }), [twinkleA, twinkleB, twinkleC]);

  const lineStyle = (start: number) => ({
    opacity: Animated.multiply(copy, reveal.interpolate({ inputRange: [start, start + 0.28], outputRange: [0, 1], extrapolate: 'clamp' })),
    transform: [{ translateY: reveal.interpolate({ inputRange: [start, start + 0.28], outputRange: [18, 0], extrapolate: 'clamp' }) }],
  });
  const hintOpacity = Animated.multiply(
    hint,
    Animated.multiply(copy, reveal.interpolate({ inputRange: [0.62, 0.9], outputRange: [0, 1], extrapolate: 'clamp' })),
  );

  return (
    <View style={styles.screen}>
      <AuthView isDismissible={false} />
      {covering && (
        <Animated.View pointerEvents={passing ? 'none' : 'auto'} style={[styles.cover, { transform: [{ translateY }] }]}>
          <Animated.View pointerEvents="none" style={[styles.sky, { opacity: backdrop }]}>
            {STARS.map((star, index) => (
              <Animated.View key={star.id} style={[styles.star, { left: star.left, top: star.top, opacity: starGlow[index] }]} />
            ))}
          </Animated.View>
          <Hairlines />
          <Pressable accessibilityRole="button" accessibilityLabel="Tap to continue" onPress={openLogin} style={styles.page}>
            <View style={styles.center}>
              <Animated.View style={[styles.stage, { transform: [{ translateY: graphicLift }, { scale: grow }] }]}>
                <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glow }]} />
                <Animated.View pointerEvents="none" style={[styles.ring, styles.ringOuter, { transform: [{ rotate }] }]}>
                  <View style={[styles.bead, styles.beadTop]} />
                  <View style={[styles.bead, styles.beadRight]} />
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.ring, styles.ringInner, { transform: [{ rotate: rotateBack }] }]}>
                  <View style={[styles.bead, styles.beadLeft, styles.beadSmall]} />
                </Animated.View>
                <Animated.View style={{ transform: [{ translateY: lift }] }}>
                  <Logo size={120} />
                </Animated.View>
              </Animated.View>
              <Animated.View style={[styles.copy, { transform: [{ translateY: copyLift }] }]}>
                {LINES.map((line, index) => (
                  <Animated.Text key={line} style={[styles.tagline, lineStyle(0.04 + index * 0.12)]}>{line}</Animated.Text>
                ))}
                <Animated.Text style={[styles.name, lineStyle(0.42)]}>Convergence</Animated.Text>
                <Animated.Text style={[styles.hint, lineStyle(0.62), { opacity: hintOpacity }]}>Tap to continue</Animated.Text>
              </Animated.View>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const STARS = [
  { id: 'a', left: '12%', top: '16%', opacity: 0.7 },
  { id: 'b', left: '78%', top: '22%', opacity: 0.45 },
  { id: 'c', left: '24%', top: '38%', opacity: 0.35 },
  { id: 'd', left: '88%', top: '48%', opacity: 0.6 },
  { id: 'e', left: '8%', top: '62%', opacity: 0.4 },
  { id: 'f', left: '68%', top: '70%', opacity: 0.55 },
  { id: 'g', left: '42%', top: '12%', opacity: 0.3 },
  { id: 'h', left: '54%', top: '84%', opacity: 0.4 },
  { id: 'i', left: '30%', top: '74%', opacity: 0.25 },
] as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, overflow: 'hidden' },
  cover: { ...StyleSheet.absoluteFillObject },
  sky: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.bg },
  page: { flex: 1 },
  star: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  stage: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: 'transparent' },
  ring: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  ringOuter: { width: 232, height: 232, borderRadius: 116, borderColor: 'rgba(255,255,255,0.28)' },
  ringInner: { width: 176, height: 176, borderRadius: 88, borderColor: 'rgba(255,255,255,0.16)' },
  bead: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#f5f5f5' },
  beadSmall: { width: 3, height: 3, backgroundColor: '#f5f5f5' },
  beadTop: { top: -2 },
  beadRight: { right: 22, top: 34, backgroundColor: '#f5f5f5' },
  beadLeft: { left: -2, top: 86 },
  copy: { alignSelf: 'stretch', alignItems: 'center', marginTop: 8 },
  tagline: { color: theme.fg, fontSize: 28, lineHeight: 34, fontWeight: '300', textAlign: 'center', letterSpacing: -0.4 },
  name: { color: theme.fg, fontSize: 40, lineHeight: 46, fontWeight: '300', textAlign: 'center', marginTop: 6, letterSpacing: -0.8 },
  hint: { color: theme.muted, fontSize: 11, fontWeight: '500', letterSpacing: 1.8, textTransform: 'uppercase', textAlign: 'center', marginTop: 28 },
});
