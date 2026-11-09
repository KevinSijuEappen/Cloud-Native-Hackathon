import { useEffect, useMemo, useRef, useState } from 'react';
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

type EventItem = {
  id: string;
  name: string;
  place: string;
  date: string;
  topic: string;
  color: string;
  x: number;
  y: number;
};

const EVENTS: EventItem[] = [
  { id: '1', name: 'Cloud Native Summit', place: 'Salt Lake City', date: 'Nov 12–14', topic: 'Cloud · Engineering', color: '#71d7ff', x: 22, y: 26 },
  { id: '2', name: 'Design Systems Orbit', place: 'Online', date: 'Nov 18', topic: 'Design · Product', color: '#c79bff', x: 69, y: 34 },
  { id: '3', name: 'Frontier AI Forum', place: 'San Francisco', date: 'Nov 21–22', topic: 'AI · Startups', color: '#ffb66d', x: 29, y: 59 },
  { id: '4', name: 'Indie Makers Meetup', place: 'Denver', date: 'Nov 26', topic: 'Community · Founders', color: '#ff7da8', x: 73, y: 68 },
];

const { width, height } = Dimensions.get('window');
const ANDROID_TOP_INSET = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

export function JourneyScreen() {
  const [launched, setLaunched] = useState(false);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const shipY = useRef(new Animated.Value(0)).current;
  const starsOpacity = useRef(new Animated.Value(0.55)).current;

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
      <StatusBar barStyle="light-content" backgroundColor="#080d1a" />
      <View pointerEvents="none" style={styles.ambientGlow} />
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
            <View style={styles.brandMark}><Text style={styles.brandSpark}>✦</Text></View>
            <Text style={styles.brand}>STARPATH</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.counter}>{launched ? '4 DESTINATIONS' : 'READY TO EXPLORE'}</Text>
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
                <View style={styles.orbitCore}><Text style={styles.shipGlyph}>▲</Text></View>
                <View style={styles.orbitArrow}><Text style={styles.arrow}>↑</Text></View>
                <View style={[styles.spark, styles.sparkOne]} />
                <View style={[styles.spark, styles.sparkTwo]} />
                <View style={[styles.spark, styles.sparkThree]} />
              </View>
              <Pressable accessibilityRole="button" accessibilityHint="Swipe up to begin" onPress={launch} style={styles.launchButton}>
                <Text style={styles.launchButtonText}>Start exploring</Text>
                <Text style={styles.launchButtonArrow}>↑</Text>
              </Pressable>
              <Text style={styles.gestureHint}>SWIPE UP ANYWHERE TO BEGIN</Text>
            </View>

            <View style={styles.modeCard}>
              <View style={styles.modeIcon}><Text style={styles.modeIconText}>✦</Text></View>
              <View style={styles.modeCopy}>
                <Text style={styles.modeLabel}>YOUR TRAVEL MODE</Text>
                <Text style={styles.modeValue}>Flying solo</Text>
              </View>
              <Text style={styles.modeEdit}>CHANGE</Text>
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
              {EVENTS.map((event, index) => (
                <Pressable
                  key={event.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Explore ${event.name}`}
                  onPress={() => setSelected(event)}
                  style={[styles.planetWrap, { left: `${event.x}%`, top: `${event.y}%` }]}
                >
                  <View
                    style={[
                      styles.planet,
                      {
                        borderColor: event.color,
                        shadowColor: event.color,
                        width: 48 + (index % 2) * 12,
                        height: 48 + (index % 2) * 12,
                      },
                    ]}
                  >
                    <View style={[styles.planetMark, { backgroundColor: event.color }]} />
                  </View>
                  <Text numberOfLines={2} style={styles.planetName}>{event.name}</Text>
                  <Text style={styles.planetPlace}>{event.place}</Text>
                </Pressable>
              ))}
              <Animated.View style={[styles.shipFloat, { transform: [{ translateY: shipY }] }]}>
                <Text style={styles.shipGlyph}>▲</Text>
              </Animated.View>
            </View>
            <View style={styles.bottomHint}>
              <View style={styles.bottomHintDot} />
              <Text style={styles.bottomHintText}>4 EVENTS TO DISCOVER</Text>
              <Pressable onPress={() => setLaunched(false)} hitSlop={10}>
                <Text style={styles.backHint}>BACK TO START</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {selected && (
        <View style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <View style={styles.sheet}>
            <View style={[styles.sheetPlanet, { backgroundColor: selected.color }]} />
            <Text style={styles.sheetKicker}>DESTINATION FOUND</Text>
            <Text style={styles.sheetTitle}>{selected.name}</Text>
            <Text style={styles.sheetMeta}>{selected.date}  ·  {selected.place}</Text>
            <Text style={styles.sheetTopic}>{selected.topic}</Text>
            <Pressable style={styles.attendButton} onPress={() => setSelected(null)}>
              <Text style={styles.attendText}>View event  →</Text>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080d1a', overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 18 },
  ambientGlow: {
    position: 'absolute',
    top: -160,
    right: -130,
    width: 380,
    height: 380,
    borderRadius: 220,
    backgroundColor: 'rgba(46, 91, 150, 0.15)',
  },
  starLayer: { ...StyleSheet.absoluteFillObject },
  star: { position: 'absolute', width: 2, height: 2, borderRadius: 2, backgroundColor: '#d7e7ff' },
  topBar: { height: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 27, height: 27, borderRadius: 9, backgroundColor: '#15233b', alignItems: 'center', justifyContent: 'center' },
  brandSpark: { color: '#a8c4f5', fontSize: 15 },
  brand: { color: '#e6edfb', fontSize: 12, fontWeight: '800', letterSpacing: 2.2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(28, 42, 65, 0.78)', borderWidth: 1, borderColor: '#273753' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#73ddb5' },
  counter: { color: '#a1b3d2', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  intro: { paddingTop: 28 },
  kicker: { color: '#88a4d2', fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  heading: { color: '#f2f5fc', fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.8, marginTop: 11 },
  introCopy: { maxWidth: 290, color: '#9baac3', fontSize: 13, lineHeight: 19, marginTop: 11 },
  launchArea: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  launchOrb: { width: 202, height: 202, alignItems: 'center', justifyContent: 'center', marginBottom: 23 },
  orbitOuter: { position: 'absolute', width: 202, height: 202, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(121, 155, 210, 0.35)', backgroundColor: 'rgba(33, 53, 84, 0.12)' },
  orbitInner: { position: 'absolute', width: 145, height: 145, borderRadius: 80, borderWidth: 1, borderColor: 'rgba(121, 155, 210, 0.22)' },
  orbitCore: { width: 76, height: 76, borderRadius: 40, backgroundColor: '#17243a', borderWidth: 1, borderColor: '#647ea7', alignItems: 'center', justifyContent: 'center', shadowColor: '#73a7ff', shadowOpacity: 0.2, shadowRadius: 22, elevation: 6 },
  shipGlyph: { color: '#edf4ff', fontSize: 25 },
  orbitArrow: { position: 'absolute', top: 25, left: 88, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15233a' },
  arrow: { color: '#9bb5e2', fontSize: 16, fontWeight: '700' },
  spark: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#a4c1f0' },
  sparkOne: { top: 47, right: 29 }, sparkTwo: { bottom: 43, left: 27 }, sparkThree: { bottom: 25, right: 58, width: 3, height: 3 },
  launchButton: { minWidth: 205, height: 50, paddingHorizontal: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, borderRadius: 16, backgroundColor: '#b7e9d6', shadowColor: '#91e8c7', shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 },
  launchButtonText: { color: '#10261f', fontSize: 14, fontWeight: '800' },
  launchButtonArrow: { color: '#24513f', fontSize: 18, fontWeight: '700' },
  gestureHint: { color: '#7385a5', fontSize: 8, fontWeight: '700', letterSpacing: 1.35, marginTop: 13 },
  modeCard: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderRadius: 16, backgroundColor: 'rgba(20, 31, 50, 0.92)', borderWidth: 1, borderColor: '#283650', marginBottom: 4 },
  modeIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#202e46', alignItems: 'center', justifyContent: 'center' },
  modeIconText: { color: '#a8c4f5', fontSize: 17 },
  modeCopy: { flex: 1, marginLeft: 12 },
  modeLabel: { color: '#8192ad', fontSize: 8, fontWeight: '700', letterSpacing: 1.25 },
  modeValue: { color: '#e3ebf9', fontSize: 13, fontWeight: '600', marginTop: 4 },
  modeEdit: { color: '#a4b8dc', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  mapHeader: { paddingTop: 25 },
  mapTitle: { color: '#f1f5ff', fontSize: 25, fontWeight: '700', letterSpacing: -0.5, marginTop: 9 },
  mapSub: { color: '#9aa9c1', fontSize: 12, marginTop: 6 },
  orbitMap: { flex: 1, minHeight: 310, marginTop: 8 },
  orbitLine: { position: 'absolute', width: width * 0.86, height: width * 0.86, borderRadius: width, borderWidth: 1, borderColor: 'rgba(124,151,196,0.19)', left: width * 0.02, top: height * 0.05 },
  orbitLineSmall: { width: width * 0.57, height: width * 0.57, left: width * 0.16, top: height * 0.14, borderColor: 'rgba(124,151,196,0.12)' },
  planetWrap: { position: 'absolute', width: 104, alignItems: 'center', marginLeft: -32, marginTop: -25 },
  planet: { borderRadius: 60, borderWidth: 1, backgroundColor: '#142036', alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.48, shadowRadius: 17, elevation: 7 },
  planetMark: { width: '44%', height: '44%', borderRadius: 40, opacity: 0.35 },
  planetName: { color: '#e1e9f7', fontSize: 9, fontWeight: '700', marginTop: 7, width: 104, textAlign: 'center' },
  planetPlace: { color: '#8798b4', fontSize: 8, marginTop: 2 },
  shipFloat: { position: 'absolute', top: '45%', left: '46%', width: 42, height: 42, borderRadius: 24, backgroundColor: '#15223a', borderColor: '#718ab7', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bottomHint: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: '#26334a', marginTop: 8 },
  bottomHintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#78dcb8' },
  bottomHintText: { flex: 1, color: '#91a0ba', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  backHint: { color: '#a6b9dd', fontSize: 8, fontWeight: '700', letterSpacing: 0.9 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,6,16,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#121c2e', padding: 26, paddingBottom: 34, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#34435d' },
  sheetPlanet: { width: 38, height: 38, borderRadius: 24, marginBottom: 18 },
  sheetKicker: { color: '#8ea5cf', fontWeight: '800', fontSize: 9, letterSpacing: 1.6 },
  sheetTitle: { color: '#f1f5ff', fontSize: 25, fontWeight: '700', marginTop: 8 },
  sheetMeta: { color: '#c2cee2', fontSize: 14, marginTop: 9 },
  sheetTopic: { color: '#8191aa', fontSize: 13, marginTop: 7 },
  attendButton: { height: 52, borderRadius: 14, backgroundColor: '#b7e9d6', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  attendText: { color: '#10261f', fontSize: 15, fontWeight: '700' },
  closeButton: { alignItems: 'center', padding: 14 },
  closeText: { color: '#a2b1c9', fontSize: 14 },
});
