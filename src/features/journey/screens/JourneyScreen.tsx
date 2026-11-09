import { useUser } from '@clerk/expo';
import { UserButton } from '@clerk/expo/native-components';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ContactProfilePage } from '../../welcome/screens/ContactProfilePage';
import {
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
import { theme } from '../../../theme';
import { EVENTS } from '../events';
import { EventSheet } from './EventSheet';

const { width, height } = Dimensions.get('window');
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

export function JourneyScreen() {
  const { user } = useUser();
  const [phase, setPhase] = useState<'ready' | 'hyperdrive' | 'orbit'>('ready');
  const [orbitPage, setOrbitPage] = useState(0);
  const [orbitIndex, setOrbitIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const plans = readEventPlans(user?.unsafeMetadata);
  const selected = EVENTS.find((event) => event.id === selectedId) ?? null;
  const starsOpacity = useRef(new Animated.Value(0.55)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStarted = useRef(0);
  const dialRotation = useRef(new Animated.Value(0)).current;
  const dialDirection = useRef(1);
  const dialPanStart = useRef(0);
  const dialPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
    onPanResponderGrant: () => { dialPanStart.current = 0; },
    onPanResponderMove: (_, gesture) => { dialPanStart.current = gesture.dx; },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 36) rotateDial(gesture.dx < 0 ? 1 : -1);
    },
  }), []);
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
    holdStarted.current = Date.now();
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
      if (Date.now() - holdStarted.current >= 300) launch();
    }
  };
  const rotateDial = (direction: number) => {
    dialDirection.current = direction;
    dialRotation.setValue(0);
    Animated.timing(dialRotation, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    setOrbitIndex((i) => (i + direction + EVENTS.length) % EVENTS.length);
  };
  const launchPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      phase === 'ready' && gesture.dy < -12 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -56) launch();
    },
  }), [phase]);

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
        <View style={[styles.nebula, styles.nebulaOne]} />
        <View style={[styles.nebula, styles.nebulaTwo]} />
        <View style={[styles.nebula, styles.nebulaThree]} />
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
                shadowColor: star.tint,
                shadowOpacity: i % 13 === 0 ? 0.75 : 0.2,
                shadowRadius: i % 13 === 0 ? 5 : 1,
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

        {phase === 'ready' ? (
          <>
          <View style={styles.launchArea} {...launchPanResponder.panHandlers}>
              <View style={styles.launchOrb}>
                <View style={styles.orbitOuter} />
                <View style={styles.orbitInner} />
                <Animated.View {...shipPanResponder.panHandlers} style={[styles.launchShip, { transform: [{ translateY: shipDragY }] }]}><Ship /></Animated.View>
              </View>
              <Text style={styles.gestureHint}>SWIPE UP TO SEARCH</Text>
            </View>
          </>
        ) : phase === 'hyperdrive' ? <View style={styles.warpPlaceholder} /> : (
          <>
            <View style={styles.orbitMap} {...dialPanResponder.panHandlers}>
              <View style={styles.dialOrbitOuter} />
              <View style={styles.dialOrbitInner} />
              <View style={styles.dialCenterGlow} />
              {[-1, 0, 1].map((offset) => {
                const event = EVENTS[(orbitIndex + offset + EVENTS.length) % EVENTS.length];
                const active = offset === 0;
                const plan = plans.find((item) => item.eventId === event.id);
                return (
                  <Animated.View
                    key={`${event.id}-${offset}`}
                    style={[styles.dialPlanet, active ? styles.dialPlanetActive : offset < 0 ? styles.dialPlanetLeft : styles.dialPlanetRight, active && { transform: [{ scale: dialRotation.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] }]}
                  >
                    <Pressable accessibilityRole="button" accessibilityLabel={`Explore ${event.name}`} onPress={() => active ? setSelectedId(event.id) : rotateDial(offset)}>
                    <View style={[styles.planet, active ? styles.planetActive : styles.planetPeek, { borderColor: event.color, shadowColor: event.color }]}>
                      <View style={[styles.planetMark, { backgroundColor: event.color }]} />
                    </View>
                    <View pointerEvents="none" style={[styles.planetHorizon, { borderColor: event.color }]} />
                    {plan && active ? <View style={styles.attendingDot} /> : null}
                    {active ? <View style={styles.dialEventLabel}><Text numberOfLines={2} style={styles.dialEventName}>{event.name}</Text><Text style={styles.dialEventMeta}>{event.date}  ·  {event.place}</Text></View> : null}
                    </Pressable>
                  </Animated.View>
                );
              })}
              <Pressable accessibilityRole="button" accessibilityLabel="Hold spaceship for one and a half seconds to hyperdrive" onPressIn={startHold} onPressOut={endHold} style={({ pressed }) => [styles.dialShip, pressed && styles.dialShipPressed]}>
                <Ship />
                <Text style={styles.dialShipHint}>HOLD 1.5 SEC TO HYPERDRIVE</Text>
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
  const scale = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1.08, 1] });

  useEffect(() => {
    const listener = progress.addListener(({ value }) => setPercentage(Math.min(100, Math.round(value * 100))));
    return () => progress.removeListener(listener);
  }, [progress]);

  return (
    <View pointerEvents="none" style={styles.hyperdriveOverlay}>
      {Array.from({ length: 38 }, (_, index) => (
        <HyperdriveStreak key={index} index={index} />
      ))}
      <View style={styles.hyperdriveReadout}>
        <Text style={styles.hyperdriveEyebrow}>ORBIT SCAN</Text>
        <Animated.Text style={[styles.hyperdrivePercent, { transform: [{ scale }] }]}>{percentage}%</Animated.Text>
        <Text style={styles.hyperdriveCaption}>LOCATING CONFERENCES</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>
      <View style={styles.lockedShip}><Ship /></View>
    </View>
  );
}

function HyperdriveStreak({ index }: { index: number }) {
  const travel = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const duration = 520 + (index % 6) * 105;
  const left = `${2 + ((index * 41) % 96)}%` as `${number}%`;
  const streakHeight = 54 + ((index * 29) % 142);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay((index * 43) % 470),
      Animated.parallel([
        Animated.timing(travel, { toValue: 1, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: index % 5 === 0 ? 0.9 : 0.6, duration: 120, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: duration - 120, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(travel, { toValue: 0, duration: 1, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [duration, index, opacity, travel]);

  return (
    <Animated.View
      style={[
        styles.hyperdriveStreak,
        {
          left,
          height: streakHeight,
          opacity,
          transform: [{ translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.18, height * 1.1] }) }],
        },
      ]}
    />
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
  orbitOuter: { position: 'absolute', width: 220, height: 220, borderRadius: 120, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(193,174,255,0.2)', transform: [{ rotate: '-18deg' }] },
  orbitInner: { position: 'absolute', width: 162, height: 162, borderRadius: 90, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(193,174,255,0.12)', transform: [{ rotate: '24deg' }] },
  launchShip: { position: 'absolute', bottom: 28 + 42, alignItems: 'center' },
  shipImage: { width: 82, height: 120, opacity: 0.96 },
  gestureHint: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.6, marginTop: 14 },
  orbitMap: { flex: 1, minHeight: 310, position: 'relative', overflow: 'hidden' },
  dialOrbitOuter: { position: 'absolute', width: width * 1.18, height: width * 0.74, borderRadius: width, borderWidth: 1, borderColor: 'rgba(187,160,255,0.22)', alignSelf: 'center', top: '27%' },
  dialOrbitInner: { position: 'absolute', width: width * 0.82, height: width * 0.5, borderRadius: width, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(187,160,255,0.12)', alignSelf: 'center', top: '34%' },
  dialCenterGlow: { position: 'absolute', width: 12, height: 12, borderRadius: 8, backgroundColor: '#E7DCFF', top: '51%', alignSelf: 'center', shadowColor: '#A476FF', shadowOpacity: 1, shadowRadius: 16 },
  dialPlanet: { position: 'absolute', top: '38%', zIndex: 2, alignItems: 'center' },
  dialPlanetActive: { left: '50%', marginLeft: -40, top: '35%' },
  dialPlanetLeft: { left: -14, top: '43%', transform: [{ scale: 0.7 }], opacity: 0.58 },
  dialPlanetRight: { right: -14, top: '43%', transform: [{ scale: 0.7 }], opacity: 0.58 },
  planetActive: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, backgroundColor: 'rgba(22,19,36,0.95)', alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.45, shadowRadius: 18, elevation: 5 },
  planetPeek: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, backgroundColor: 'rgba(22,19,36,0.9)', alignItems: 'center', justifyContent: 'center' },
  planetHorizon: { position: 'absolute', width: '78%', height: '26%', top: '52%', borderTopWidth: 1, borderBottomWidth: 1, borderRadius: 30, opacity: 0.68, transform: [{ rotate: '-8deg' }] },
  dialEventLabel: { position: 'absolute', top: 96, width: width * 0.62, alignItems: 'center' },
  dialEventName: { color: theme.fg, fontSize: 17, fontWeight: '400', textAlign: 'center' },
  dialEventMeta: { color: theme.muted, fontSize: 11, marginTop: 5, textAlign: 'center' },
  dialShip: { position: 'absolute', bottom: 18, alignSelf: 'center', alignItems: 'center', padding: 10, borderRadius: 30 },
  dialShipPressed: { backgroundColor: 'rgba(166,136,255,0.18)', transform: [{ scale: 0.96 }] },
  dialShipHint: { color: '#B9ACD7', fontSize: 8, fontWeight: '600', letterSpacing: 1.3, marginTop: -6 },
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
  hyperdriveOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  hyperdriveStreak: { position: 'absolute', top: '-18%', width: 1, backgroundColor: '#E7E2FF', shadowColor: '#A98CFF', shadowOpacity: 0.85, shadowRadius: 5, elevation: 3 },
  hyperdriveReadout: { position: 'absolute', top: '18%', left: 0, right: 0, alignItems: 'center' },
  hyperdriveEyebrow: { color: '#9487B8', fontSize: 9, fontWeight: '600', letterSpacing: 2.2, marginBottom: 9 },
  hyperdrivePercent: { color: '#F0EDFF', fontSize: 48, lineHeight: 53, fontWeight: '200', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  hyperdriveCaption: { color: '#BDB4D5', fontSize: 9, fontWeight: '600', letterSpacing: 2, marginTop: 6 },
  progressTrack: { width: 150, height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 13 },
  progressFill: { height: 1, backgroundColor: '#E4DEFF' },
  lockedShip: { position: 'absolute', left: width / 2 - 41, top: height * 0.48, alignItems: 'center' },
  warpPlaceholder: { flex: 1 },
});
