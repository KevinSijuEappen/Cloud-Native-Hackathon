import { useUser } from '@clerk/expo';
import { UserButton } from '@clerk/expo/native-components';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ContactProfilePage } from '../../welcome/screens/ContactProfilePage';
import {
  countdownTo,
  readEventPlans,
  readStoredAttendee,
  suggestAttendee,
} from '../../welcome/profile';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { Hairlines } from '../../../components/Hairlines';
import { Logo } from '../../../components/Logo';
import { DirectorySearch } from '../../search/DirectorySearch';
import { theme } from '../../../theme';
import { EVENTS, type EventItem } from '../events';
import { EventSheet } from './EventSheet';

const { width, height } = Dimensions.get('window');
const TRACK = width - 48;
const PLANET_SIZE = 128;
const STRIDE = Math.round(PLANET_SIZE * 1.28);
const LAST_EVENT = EVENTS.length - 1;
const VANISH_Y = height * 0.33;
const WARP_STREAKS = Array.from({ length: 44 }, (_, index) => ({
  turn: (index * 137.5) % 360,
  length: 28 + (index % 7) * 16,
  duration: 460 + (index % 6) * 80,
  delay: (index * 41) % 640,
  thick: index % 6 === 0,
}));
const ANDROID_TOP_INSET = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
const STARS = Array.from({ length: 118 }, (_, index) => {
  const random = (seed: number) => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  return {
    left: `${random(index + 1) * 100}%` as `${number}%`,
    top: `${random(index + 719) * 100}%` as `${number}%`,
    size: index % 13 === 0 ? 2 : 1,
    opacity: index % 13 === 0 ? 0.85 : 0.2 + random(index + 991) * 0.56,
    tint: index % 19 === 0 ? '#C9B9FF' : '#FFFFFF',
  };
});

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function overscroll(distance: number) {
  return (distance * 0.46) / (1 + distance / 260);
}

function rubber(value: number) {
  const max = LAST_EVENT * STRIDE;
  if (value < 0) return -overscroll(-value);
  if (value > max) return max + overscroll(value - max);
  return value;
}

function pulse() {
  if (Platform.OS === 'android') Vibration.vibrate(18);
  else Vibration.vibrate();
}

export function JourneyScreen() {
  const { user } = useUser();
  const [phase, setPhase] = useState<'ready' | 'hyperdrive' | 'orbit'>('ready');
  const [orbitPage, setOrbitPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const plans = readEventPlans(user?.unsafeMetadata);
  const selected = EVENTS.find((event) => event.id === selectedId) ?? null;
  const starsOpacity = useRef(new Animated.Value(0.55)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragX = useRef(new Animated.Value(0)).current;
  const positionRef = useRef(0);
  const originRef = useRef(0);
  const hapticIndex = useRef(0);
  const settleRef = useRef<(index: number, withHaptic: boolean) => void>(() => {});
  const trackX = dragX.interpolate({
    inputRange: [0, STRIDE],
    outputRange: [TRACK / 2, TRACK / 2 - STRIDE],
  });
  const dialPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
    onPanResponderGrant: () => {
      dragX.stopAnimation((value) => {
        originRef.current = value;
        positionRef.current = value;
      });
    },
    onPanResponderMove: (_, gesture) => {
      const next = rubber(originRef.current - gesture.dx);
      dragX.setValue(next);
      const nearest = clamp(Math.round(next / STRIDE), 0, LAST_EVENT);
      if (nearest !== hapticIndex.current) {
        hapticIndex.current = nearest;
        pulse();
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const projected = originRef.current - gesture.dx - gesture.vx * 360;
      const target = clamp(Math.round(rubber(projected) / STRIDE), 0, LAST_EVENT);
      settleRef.current(target, target !== hapticIndex.current);
    },
    onPanResponderTerminate: () => {
      const target = clamp(Math.round(positionRef.current / STRIDE), 0, LAST_EVENT);
      settleRef.current(target, false);
    },
  }), [dragX]);
  const shipDragY = useRef(new Animated.Value(0)).current;
  const shipStartY = useRef(0);
  const shipPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phase === 'ready',
    onMoveShouldSetPanResponder: (_, gesture) => phase === 'ready' && Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => shipDragY.stopAnimation((value) => { shipStartY.current = value; }),
    onPanResponderMove: (_, gesture) => shipDragY.setValue(Math.max(-height * 0.42, Math.min(0, shipStartY.current + gesture.dy))),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -height * 0.12) {
        Animated.timing(shipDragY, { toValue: -height * 0.32, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => launch());
      } else {
        Animated.spring(shipDragY, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 5 }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(shipDragY, { toValue: 0, useNativeDriver: true }).start(),
  }), [phase, shipDragY]);

  const accountPages = useMemo(() => [{
    path: 'contact',
    label: 'Your details',
    icon: 'user' as const,
    placement: { type: 'sectionStart' as const, section: 'profile' as const },
    content: <ContactProfilePage />,
  }], []);
  const launch = () => {
    if (phase === 'ready' || phase === 'orbit') {
      if (phase === 'orbit') setOrbitPage((page) => page + 1);
      setPhase('hyperdrive');
    }
  };
  const startHold = () => {
    if (phase !== 'orbit') return;
    Vibration.vibrate(120);
    vibrationTimer.current = setInterval(() => Vibration.vibrate(120), 450);
    holdTimer.current = setTimeout(() => {
      if (vibrationTimer.current) clearInterval(vibrationTimer.current);
      vibrationTimer.current = null;
      holdTimer.current = null;
      Vibration.cancel();
      launch();
    }, 1500);
  };
  const endHold = () => {
    if (vibrationTimer.current) clearInterval(vibrationTimer.current);
    vibrationTimer.current = null;
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
      Vibration.cancel();
    }
  };
  settleRef.current = (index, withHaptic) => {
    const next = clamp(index, 0, LAST_EVENT);
    if (withHaptic) pulse();
    hapticIndex.current = next;
    Animated.spring(dragX, {
      toValue: next * STRIDE,
      useNativeDriver: true,
      speed: 12,
      bounciness: 9,
    }).start();
  };
  const openFromSearch = (id: string) => {
    const index = EVENTS.findIndex((event) => event.id === id);
    setQuery('');
    if (index >= 0) {
      settleRef.current(index, true);
      setPhase((current) => (current === 'hyperdrive' ? current : 'orbit'));
    }
    setSelectedId(id);
  };
  const launchPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      phase === 'ready' && gesture.dy < -12 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -56) launch();
    },
  }), [phase]);

  useEffect(() => {
    const id = dragX.addListener(({ value }) => {
      positionRef.current = value;
    });
    return () => dragX.removeListener(id);
  }, [dragX]);

  useEffect(() => {
    if (phase !== 'hyperdrive') return undefined;
    progress.setValue(0);
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 3600,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(starsOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(starsOpacity, { toValue: 0.76, duration: 1700, useNativeDriver: true }),
      ]),
    ]).start();
    const timer = setTimeout(() => setPhase('orbit'), 3600);
    return () => {
      clearTimeout(timer);
      progress.stopAnimation();
    };
  }, [phase, progress, starsOpacity]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <Hairlines />
      <Animated.View pointerEvents="none" style={[styles.starLayer, { opacity: starsOpacity }]}>
        {STARS.map((star, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                backgroundColor: star.tint,
              },
            ]}
          />
        ))}
      </Animated.View>

      <View style={[styles.content, { paddingTop: ANDROID_TOP_INSET + 8 }]}>
        <View style={styles.topBar}>
          <View style={styles.brandGroup}>
            <Logo size={28} />
            <Text style={styles.brand}>CONVERGENCE</Text>
          </View>
          <View style={styles.topActions}>
            <UserButton userProfileProps={{ customPages: accountPages }} />
          </View>
        </View>

        {phase !== 'hyperdrive' ? (
          <DirectorySearch query={query} onQuery={setQuery} onSelectEvent={openFromSearch} />
        ) : null}

        {phase === 'hyperdrive' ? (
          <View style={styles.warpPlaceholder} />
        ) : query.trim() ? null : phase === 'ready' ? (
          <>
          <View style={styles.launchArea} {...launchPanResponder.panHandlers}>
              <View style={styles.launchOrb}>
                <View style={styles.orbitOuter} />
                <View style={styles.orbitInner} />
                <Animated.View {...shipPanResponder.panHandlers} style={[styles.launchShip, { transform: [{ translateY: shipDragY }] }]}><Ship /></Animated.View>
              </View>
              <Text style={styles.gestureHint}>SWIPE UP TO LAUNCH</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.orbitMap}>
              <View pointerEvents="none" style={styles.dialHorizon} />
              <View style={styles.dialGesture} {...dialPanResponder.panHandlers}>
                <Animated.View style={[styles.dialTrack, { transform: [{ translateX: trackX }] }]}>
                  {EVENTS.map((event, index) => (
                    <DialEvent
                      key={event.id}
                      event={event}
                      index={index}
                      dragX={dragX}
                      attending={plans.some((item) => item.eventId === event.id)}
                      onPress={() => {
                        const current = clamp(Math.round(positionRef.current / STRIDE), 0, LAST_EVENT);
                        if (current === index) setSelectedId(event.id);
                        else settleRef.current(index, true);
                      }}
                    />
                  ))}
                </Animated.View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Hold spaceship for one and a half seconds to hyperdrive" onPressIn={startHold} onPressOut={endHold} style={({ pressed }) => [styles.dialShip, pressed && styles.dialShipPressed]}>
                <Ship />
                <Text style={styles.dialShipHint}>HOLD TO WARP</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {phase === 'hyperdrive' ? <HyperdriveOverlay progress={progress} /> : null}

      {selected ? (
        <EventSheet
          key={selected.id}
          event={selected}
          plan={plans.find((plan) => plan.eventId === selected.id)}
          suggested={suggestAttendee(user?.unsafeMetadata)}
          profileWasSaved={readStoredAttendee(user?.unsafeMetadata) != null}
          onClose={() => setSelectedId(null)}
          onSave={async ({ role, profile, room, time }) => {
            if (!user) throw new Error('Signed out');
            const eventPlans = Object.fromEntries(plans.map((plan) => [plan.eventId, {
              eventName: plan.eventName,
              role: plan.role,
              room: plan.room,
              time: plan.time,
            }]));
            await user.updateMetadata({
              unsafeMetadata: {
                ...(profile ? { attendeeProfile: profile } : {}),
                eventPlans: {
                  ...eventPlans,
                  [selected.id]: {
                    eventName: selected.name,
                    role,
                    room: room ?? '',
                    time: time ?? '',
                  },
                },
              },
            });
          }}
        />
      ) : null}
    </View>
  );
}

function HyperdriveOverlay({ progress }: { progress: Animated.Value }) {
  const [percentage, setPercentage] = useState(0);
  const rush = useRef(new Animated.Value(0)).current;
  const climb = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listener = progress.addListener(({ value }) => setPercentage(Math.min(100, Math.round(value * 100))));
    Animated.timing(rush, { toValue: 1, duration: 3600, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(climb, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => progress.removeListener(listener);
  }, [climb, progress, rush]);

  const climbY = climb.interpolate({ inputRange: [0, 1], outputRange: [height * 0.36, 0] });
  const driftY = rush.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const shipScale = climb.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <View pointerEvents="none" style={styles.hyperdriveOverlay}>
      {WARP_STREAKS.map((streak, index) => (
        <HyperdriveStreak key={index} {...streak} />
      ))}
      <View style={styles.hyperdriveReadout}>
        <Text style={styles.hyperdriveEyebrow}>HYPERDRIVE</Text>
        <Text style={styles.hyperdrivePercent}>{percentage}</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>
      <Animated.View style={[styles.lockedShip, { transform: [{ translateY: Animated.add(climbY, driftY) }, { scale: shipScale }] }]}>
        <Ship />
      </Animated.View>
    </View>
  );
}

function HyperdriveStreak({
  turn,
  length,
  duration,
  delay,
  thick,
}: {
  turn: number;
  length: number;
  duration: number;
  delay: number;
  thick: boolean;
}) {
  const travel = useRef(new Animated.Value(0)).current;
  const reach = Math.max(width, height) * 0.78;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(travel, { toValue: 1, duration, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(travel, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [delay, duration, travel]);

  return (
    <View style={[styles.streakPivot, { transform: [{ rotate: `${turn}deg` }] }]}>
      <Animated.View
        style={[
          styles.hyperdriveStreak,
          thick && styles.hyperdriveStreakBright,
          {
            height: length,
            opacity: travel.interpolate({ inputRange: [0, 0.06, 0.45, 1], outputRange: [0, thick ? 1 : 0.62, 0.45, 0] }),
            transform: [
              { translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [6, reach] }) },
              { scaleY: travel.interpolate({ inputRange: [0, 1], outputRange: [0.15, 3.4] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

function DialEvent({
  event,
  index,
  dragX,
  attending,
  onPress,
}: {
  event: EventItem;
  index: number;
  dragX: Animated.Value;
  attending: boolean;
  onPress: () => void;
}) {
  const center = index * STRIDE;
  const scale = dragX.interpolate({
    inputRange: [center - STRIDE, center, center + STRIDE],
    outputRange: [0.74, 1, 0.74],
    extrapolate: 'clamp',
  });
  const opacity = dragX.interpolate({
    inputRange: [center - STRIDE, center, center + STRIDE],
    outputRange: [0.4, 1, 0.4],
    extrapolate: 'clamp',
  });
  const labelOpacity = dragX.interpolate({
    inputRange: [center - STRIDE * 0.5, center, center + STRIDE * 0.5],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.dialSlot, { left: center, opacity, transform: [{ scale }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Explore ${event.name}`} onPress={onPress} style={styles.planetHit}>
        <PlanetBody color={event.color} index={index} />
      </Pressable>
      <Animated.View pointerEvents="none" style={[styles.dialEventLabel, { opacity: labelOpacity }]}>
        <Text numberOfLines={2} style={styles.dialEventName}>{event.name}</Text>
        <Text style={styles.dialEventMeta}>{event.date}  ·  {event.place}</Text>
        {attending ? (
          <View style={styles.goingRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.countdown}>{countdownTo(event.date)}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

function PlanetBody({ color, index }: { color: string; index: number }) {
  const tilt = -18 + index * 8;
  const bandTop = 26 + (index % 3) * 14;
  return (
    <View style={styles.planetStage}>
      <View style={[styles.atmosphere, { borderColor: color }]} />
      <View style={[styles.planetDisc, { backgroundColor: color }]}>
        <View style={[styles.planetBand, { top: bandTop, transform: [{ rotate: `${tilt}deg` }] }]} />
        <View style={[styles.planetBand, styles.planetBandThin, { top: bandTop + 34, transform: [{ rotate: `${tilt}deg` }] }]} />
        <View style={[styles.crater, { left: 24 + (index % 3) * 10, top: 58 + (index % 2) * 8, width: 16, height: 16 }]} />
        <View style={[styles.crater, { left: 72, top: 40 + index * 3, width: 9, height: 9 }]} />
        <View style={styles.terminator} />
        <View style={styles.glint} />
      </View>
    </View>
  );
}

function Ship() {
  return <Image accessible={false} source={require('../../../../assets/spaceship-outline.png')} resizeMode="contain" style={styles.shipImage} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 0 },
  starLayer: { ...StyleSheet.absoluteFillObject },
  star: { position: 'absolute', width: 1, height: 1, borderRadius: 1, backgroundColor: '#ffffff' },
  nebula: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(102,75,180,0.025)', shadowColor: '#7657DB', shadowOpacity: 0.4, shadowRadius: 72 },
  nebulaOne: { width: 250, height: 250, left: -120, top: height * 0.22 },
  nebulaTwo: { width: 320, height: 320, right: -190, top: height * 0.48, backgroundColor: 'rgba(51,101,168,0.02)', shadowColor: '#467FC6' },
  nebulaThree: { width: 210, height: 210, left: width * 0.28, bottom: -150, backgroundColor: 'rgba(133,77,164,0.018)', shadowColor: '#8A4CA5' },
  topBar: { height: 46, marginHorizontal: 0, paddingHorizontal: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  brand: { color: theme.fg, fontSize: 11, fontWeight: '500', letterSpacing: 1.8 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  launchArea: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 34 },
  launchOrb: { width: 230, height: 300, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  orbitOuter: { position: 'absolute', width: 220, height: 220, borderRadius: 120, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.line },
  orbitInner: { position: 'absolute', width: 162, height: 162, borderRadius: 90, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' },
  launchShip: { position: 'absolute', bottom: 28 + 42, alignItems: 'center' },
  shipImage: { width: 82, height: 120, opacity: 0.96 },
  gestureHint: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.6, marginTop: 18 },
  orbitMap: { flex: 1, minHeight: 310, position: 'relative', overflow: 'hidden' },
  dialHorizon: { position: 'absolute', left: 0, right: 0, top: '20%', marginTop: PLANET_SIZE / 2, height: StyleSheet.hairlineWidth, backgroundColor: theme.line },
  dialGesture: { flex: 1 },
  dialTrack: { ...StyleSheet.absoluteFillObject },
  dialSlot: { position: 'absolute', top: '20%', width: PLANET_SIZE, marginLeft: -PLANET_SIZE / 2, alignItems: 'center' },
  planetHit: { width: PLANET_SIZE, height: PLANET_SIZE, alignItems: 'center', justifyContent: 'center' },
  planetStage: { width: PLANET_SIZE, height: PLANET_SIZE, alignItems: 'center', justifyContent: 'center' },
  atmosphere: { position: 'absolute', width: PLANET_SIZE + 16, height: PLANET_SIZE + 16, borderRadius: (PLANET_SIZE + 16) / 2, borderWidth: 1, opacity: 0.45 },
  planetDisc: { width: PLANET_SIZE, height: PLANET_SIZE, borderRadius: PLANET_SIZE / 2, overflow: 'hidden' },
  planetBand: { position: 'absolute', left: -20, right: -20, height: 12, backgroundColor: 'rgba(0,0,0,0.16)' },
  planetBandThin: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)' },
  crater: { position: 'absolute', borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.18)' },
  terminator: { position: 'absolute', width: PLANET_SIZE, height: PLANET_SIZE, borderRadius: PLANET_SIZE / 2, backgroundColor: 'rgba(0,0,0,0.5)', left: PLANET_SIZE * 0.46 },
  glint: { position: 'absolute', width: PLANET_SIZE * 0.42, height: PLANET_SIZE * 0.22, borderRadius: PLANET_SIZE, backgroundColor: 'rgba(255,255,255,0.32)', top: PLANET_SIZE * 0.14, left: PLANET_SIZE * 0.12, transform: [{ rotate: '-22deg' }] },
  dialHint: { position: 'absolute', bottom: 148, alignSelf: 'center', color: '#B9ACD7', fontSize: 10, fontWeight: '600', letterSpacing: 1.6 },
  dialPlanet: { position: 'absolute', top: '38%', zIndex: 2, alignItems: 'center' },
  dialPlanetActive: { left: '50%', marginLeft: -40, top: '35%' },
  dialPlanetLeft: { left: -14, top: '43%', transform: [{ scale: 0.7 }], opacity: 0.58 },
  dialPlanetRight: { right: -14, top: '43%', transform: [{ scale: 0.7 }], opacity: 0.58 },
  planetActive: { width: 80, height: 80, borderRadius: 40, borderWidth: StyleSheet.hairlineWidth, backgroundColor: 'transparent' },
  planetPeek: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, backgroundColor: 'rgba(22,19,36,0.9)', alignItems: 'center', justifyContent: 'center' },
  planetHorizon: { position: 'absolute', width: '78%', height: '26%', top: '52%', borderTopWidth: 1, borderBottomWidth: 1, borderRadius: 30, opacity: 0.68, transform: [{ rotate: '-8deg' }] },
  dialEventLabel: { position: 'absolute', top: PLANET_SIZE + 18, width: TRACK * 0.78, left: (PLANET_SIZE - TRACK * 0.78) / 2, alignItems: 'center' },
  dialEventName: { color: theme.fg, fontSize: 22, fontWeight: '300', letterSpacing: -0.3, textAlign: 'center' },
  dialEventMeta: { color: theme.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  goingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  check: { color: '#6FCF97', fontSize: 16, fontWeight: '700' },
  countdown: { color: '#6FCF97', fontSize: 13, fontWeight: '500' },
  dialShip: { position: 'absolute', bottom: 28, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 16, zIndex: 4 },
  dialShipPressed: { opacity: 0.72 },
  dialShipHint: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.6, marginTop: 8 },
  orbitLine: { position: 'absolute', width: '110%', height: width * 0.72, borderRadius: width, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(190,174,255,0.14)', left: '-5%', top: '26%', transform: [{ rotate: '-18deg' }] },
  orbitLineSmall: { width: '78%', height: width * 0.49, left: '11%', top: '36%', borderColor: 'rgba(190,174,255,0.09)', transform: [{ rotate: '18deg' }] },
  orbitLineWide: { width: '100%', height: width * 0.92, left: '0%', top: '17%', borderColor: 'rgba(255,255,255,0.05)', transform: [{ rotate: '8deg' }] },
  planetWrap: { position: 'absolute', width: 52, alignItems: 'center', justifyContent: 'center', marginLeft: -26, marginTop: -26, zIndex: 2 },
  planet: { borderRadius: 60, borderWidth: StyleSheet.hairlineWidth, backgroundColor: 'rgba(18,17,31,0.9)', alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.2, shadowRadius: 6, elevation: 1 },
  planetMark: { width: '34%', height: '34%', borderRadius: 40, opacity: 0.35 },
  attendingDot: { position: 'absolute', top: 1, right: 6, width: 6, height: 6, borderRadius: 4, backgroundColor: '#BBA3FF' },
  hyperdriveButton: { minHeight: 76, marginBottom: 14, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(190,174,255,0.55)', backgroundColor: 'rgba(37,29,59,0.98)', flexDirection: 'row', alignItems: 'center', gap: 13, shadowColor: '#9B78FF', shadowOpacity: 0.26, shadowRadius: 16, elevation: 8 },
  hyperdriveButtonPressed: { backgroundColor: 'rgba(63,46,98,0.98)', transform: [{ scale: 0.98 }] },
  holdShip: { width: 48, height: 54, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  holdCopy: { flex: 1 },
  hyperdriveButtonText: { color: '#F0EBFF', fontSize: 11, fontWeight: '700', letterSpacing: 1.35 },
  hyperdriveButtonHint: { color: '#B9ACD7', fontSize: 9, fontWeight: '500', letterSpacing: 1.1, marginTop: 5 },
  hyperdriveButtonArrow: { color: '#C6B5FF', fontSize: 18 },
  hyperdriveOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 5, backgroundColor: theme.bg },
  hyperdriveStreak: { width: 1, marginLeft: -0.5, backgroundColor: '#f5f5f5' },
  hyperdriveStreakBright: { width: 2, marginLeft: -1, backgroundColor: '#ffffff' },
  streakPivot: { position: 'absolute', left: width / 2, top: VANISH_Y, width: 0, height: 0 },
  hyperdriveReadout: { position: 'absolute', top: '16%', left: 0, right: 0, alignItems: 'center' },
  hyperdriveEyebrow: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 2.2, marginBottom: 10 },
  hyperdrivePercent: { color: theme.fg, fontSize: 72, lineHeight: 76, fontWeight: '200', letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  progressTrack: { width: 96, height: StyleSheet.hairlineWidth, backgroundColor: theme.line, marginTop: 16 },
  progressFill: { height: StyleSheet.hairlineWidth, backgroundColor: theme.fg },
  lockedShip: { position: 'absolute', left: 0, right: 0, top: height * 0.5, alignItems: 'center' },
  warpPlaceholder: { flex: 1 },
});
