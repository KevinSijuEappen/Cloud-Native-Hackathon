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
  PanResponder,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Hairlines } from '../../../components/Hairlines';
import { Logo } from '../../../components/Logo';
import { theme } from '../../../theme';
import { EVENTS } from '../events';
import { EventSheet } from './EventSheet';

const { width, height } = Dimensions.get('window');
const ANDROID_TOP_INSET = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

export function JourneyScreen() {
  const { user } = useUser();
  const [launched, setLaunched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const plans = readEventPlans(user?.unsafeMetadata);
  const selected = EVENTS.find((event) => event.id === selectedId) ?? null;
  const shipY = useRef(new Animated.Value(0)).current;
  const starsOpacity = useRef(new Animated.Value(0.55)).current;

  const accountPages = useMemo(() => [{
    path: 'contact',
    label: 'Your details',
    icon: 'user' as const,
    placement: { type: 'sectionStart' as const, section: 'profile' as const },
    content: <ContactProfilePage />,
  }], []);
  const launch = () => setLaunched(true);
  const launchPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      gesture.dy < -12 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -56) launch();
    },
  }), []);

  useEffect(() => {
    if (!launched) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(shipY, { toValue: -height * 0.42, duration: 750, useNativeDriver: true }),
        Animated.timing(shipY, { toValue: -height * 0.3, duration: 450, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(starsOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(starsOpacity, { toValue: 0.65, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, [launched, shipY, starsOpacity]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <Hairlines />
      <Animated.View pointerEvents="none" style={[styles.starLayer, { opacity: starsOpacity }]}>
        {Array.from({ length: 32 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: `${(i * 47 + 11) % 100}%`,
                top: `${(i * 67 + 7) % 100}%`,
                opacity: 0.25 + ((i * 13) % 7) / 12,
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
            <Text style={styles.counter}>{launched ? '4 DESTINATIONS' : 'READY TO EXPLORE'}</Text>
            <UserButton userProfileProps={{ customPages: accountPages }} />
          </View>
        </View>

        {!launched ? (
          <>
            <View style={styles.intro}>
              <Text style={styles.kicker}>MEET YOUR PEOPLE OUT THERE</Text>
              <Text style={styles.heading}>Good things{ '\n' }happen together.</Text>
              <Text style={styles.introCopy}>Find conferences, meetups, and people worth the trip.</Text>
            </View>

            <View style={styles.launchArea} {...launchPanResponder.panHandlers}>
              <View style={styles.launchOrb}>
                <View style={styles.orbitOuter} />
                <View style={styles.orbitInner} />
                <View style={styles.orbitCore}><Logo size={64} /></View>
                <View style={styles.orbitArrow}><Text style={styles.arrow}>↑</Text></View>
              </View>
              <Pressable accessibilityRole="button" accessibilityHint="Swipe up to begin" onPress={launch} style={styles.launchButton}>
                <Text style={styles.launchButtonText}>Start exploring</Text>
                <Text style={styles.launchButtonArrow}>↑</Text>
              </Pressable>
              <Text style={styles.gestureHint}>SWIPE UP ANYWHERE TO BEGIN</Text>
            </View>

            <View style={styles.modeCard}>
              <View style={styles.modeCopy}>
                <Text style={styles.modeLabel}>YOUR TRAVEL MODE</Text>
                <Text style={styles.modeValue}>Flying solo</Text>
              </View>
              <Text style={styles.modeEdit}>Change</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.mapHeader}>
              <Text style={styles.kicker}>A FEW PLACES TO START</Text>
              <Text style={styles.mapTitle}>Find your next orbit.</Text>
              <Text style={styles.mapSub}>Tap an event to see what’s happening.</Text>
            </View>
            <View style={styles.orbitMap}>
              <View style={styles.orbitLine} />
              <View style={[styles.orbitLine, styles.orbitLineSmall]} />
              {EVENTS.map((event, index) => {
                const plan = plans.find((item) => item.eventId === event.id);
                return (
                  <Pressable
                    key={event.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Explore ${event.name}`}
                    onPress={() => setSelectedId(event.id)}
                    style={[styles.planetWrap, { left: `${event.x}%`, top: `${event.y}%` }]}
                  >
                    <View
                      style={[
                        styles.planet,
                        {
                          width: 48 + (index % 2) * 12,
                          height: 48 + (index % 2) * 12,
                        },
                      ]}
                    >
                      <View style={styles.planetMark} />
                    </View>
                    <Text numberOfLines={2} style={styles.planetName}>{event.name}</Text>
                    <Text style={styles.planetPlace}>{event.place}</Text>
                    {plan ? (
                      <Text style={styles.planetStatus}>
                        {plan.role === 'presenting' ? 'Presenting' : 'Going'}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
              <Animated.View style={[styles.shipFloat, { transform: [{ translateY: shipY }] }]}>
                <Logo size={28} />
              </Animated.View>
            </View>
            <View style={styles.bottomHint}>
              <Text style={styles.bottomHintText}>4 EVENTS TO DISCOVER</Text>
              <Pressable onPress={() => setLaunched(false)} hitSlop={10}>
                <Text style={styles.backHint}>BACK TO START</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 18 },
  starLayer: { ...StyleSheet.absoluteFillObject },
  star: { position: 'absolute', width: 1, height: 1, borderRadius: 1, backgroundColor: '#ffffff' },
  topBar: { height: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  brand: { color: theme.fg, fontSize: 11, fontWeight: '500', letterSpacing: 1.8 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counter: { color: theme.muted, fontSize: 10, fontWeight: '500', letterSpacing: 1.4 },
  intro: { paddingTop: 36 },
  kicker: { color: theme.muted, fontSize: 10, fontWeight: '500', letterSpacing: 1.8 },
  heading: { color: theme.fg, fontSize: 40, lineHeight: 44, fontWeight: '300', letterSpacing: -1, marginTop: 14 },
  introCopy: { maxWidth: 280, color: theme.muted, fontSize: 15, lineHeight: 22, marginTop: 14 },
  launchArea: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  launchOrb: { width: 202, height: 202, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  orbitOuter: { position: 'absolute', width: 202, height: 202, borderRadius: 110, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' },
  orbitInner: { position: 'absolute', width: 145, height: 145, borderRadius: 80, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  orbitCore: { width: 76, height: 76, borderRadius: 40, backgroundColor: theme.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center' },
  orbitArrow: { position: 'absolute', top: 18, left: 88, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: theme.fg, fontSize: 16, fontWeight: '300' },
  launchButton: { alignSelf: 'stretch', minHeight: 54, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.lineStrong },
  launchButtonText: { color: theme.fg, fontSize: 16, fontWeight: '400' },
  launchButtonArrow: { color: theme.fg, fontSize: 18, fontWeight: '300' },
  gestureHint: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.6, marginTop: 14 },
  modeCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line, marginBottom: 4 },
  modeCopy: { flex: 1 },
  modeLabel: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.5 },
  modeValue: { color: theme.fg, fontSize: 18, fontWeight: '300', marginTop: 4 },
  modeEdit: { color: theme.muted, fontSize: 12, fontWeight: '400', letterSpacing: 0.4 },
  mapHeader: { paddingTop: 28 },
  mapTitle: { color: theme.fg, fontSize: 34, fontWeight: '300', letterSpacing: -0.8, marginTop: 10 },
  mapSub: { color: theme.muted, fontSize: 14, marginTop: 8 },
  orbitMap: { flex: 1, minHeight: 310, marginTop: 8 },
  orbitLine: { position: 'absolute', width: width * 0.86, height: width * 0.86, borderRadius: width, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', left: width * 0.02, top: height * 0.05 },
  orbitLineSmall: { width: width * 0.57, height: width * 0.57, left: width * 0.16, top: height * 0.14, borderColor: 'rgba(255,255,255,0.08)' },
  planetWrap: { position: 'absolute', width: 104, alignItems: 'center', marginLeft: -32, marginTop: -25 },
  planet: { borderRadius: 60, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.72)', backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  planetMark: { width: '42%', height: '42%', borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.28)' },
  planetName: { color: theme.fg, fontSize: 10, fontWeight: '500', marginTop: 8, width: 104, textAlign: 'center' },
  planetPlace: { color: theme.faint, fontSize: 10, marginTop: 2 },
  planetStatus: { color: theme.fg, fontSize: 10, fontWeight: '500', marginTop: 2 },
  shipFloat: { position: 'absolute', top: '45%', left: '46%', width: 42, height: 42, borderRadius: 21, backgroundColor: theme.bg, borderColor: 'rgba(255,255,255,0.45)', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  bottomHint: { minHeight: 44, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line, marginTop: 8 },
  bottomHintText: { flex: 1, color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.4 },
  backHint: { color: theme.muted, fontSize: 10, fontWeight: '500', letterSpacing: 1.2 },
});
