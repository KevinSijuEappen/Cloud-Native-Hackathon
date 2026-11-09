import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type EventItem = { id: string; name: string; place: string; date: string; topic: string; color: string; x: number; y: number };
const EVENTS: EventItem[] = [
  { id: '1', name: 'Cloud Native Summit', place: 'Salt Lake City', date: 'Nov 12–14', topic: 'Cloud · Engineering', color: '#71d7ff', x: 22, y: 26 },
  { id: '2', name: 'Design Systems Orbit', place: 'Online', date: 'Nov 18', topic: 'Design · Product', color: '#c79bff', x: 69, y: 34 },
  { id: '3', name: 'Frontier AI Forum', place: 'San Francisco', date: 'Nov 21–22', topic: 'AI · Startups', color: '#ffb66d', x: 29, y: 59 },
  { id: '4', name: 'Indie Makers Meetup', place: 'Denver', date: 'Nov 26', topic: 'Community · Founders', color: '#ff7da8', x: 73, y: 68 },
];
const { width, height } = Dimensions.get('window');

export function JourneyScreen() {
  const [launched, setLaunched] = useState(false);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const shipY = useRef(new Animated.Value(0)).current;
  const starsOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (!launched) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(shipY, { toValue: -height * 0.55, duration: 900, useNativeDriver: true }),
        Animated.timing(shipY, { toValue: -height * 0.38, duration: 550, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(starsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(starsOpacity, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ]),
    ]).start();
  }, [launched, shipY, starsOpacity]);

  return (
    <SafeAreaView style={styles.screen}>
      <Animated.View pointerEvents="none" style={[styles.starLayer, { opacity: starsOpacity }]}>
        {Array.from({ length: 44 }, (_, i) => <View key={i} style={[styles.star, { left: `${(i * 47 + 11) % 100}%`, top: `${(i * 67 + 7) % 100}%`, opacity: 0.3 + ((i * 13) % 7) / 10 }]} />)}
      </Animated.View>
      <View style={styles.topBar}><Text style={styles.brand}>✦  STARPATH</Text><Text style={styles.counter}>{launched ? 'NEARBY SIGNALS  ·  04' : 'MISSION CONTROL'}</Text></View>

      {!launched ? <>
        <View style={styles.intro}><Text style={styles.kicker}>YOUR NEXT CONNECTION IS OUT THERE</Text><Text style={styles.heading}>Choose your{ '\n' }next destination.</Text></View>
        <View style={styles.launchArea}>
          <View style={styles.launchRing}><Text style={styles.arrow}>↑</Text><View style={styles.ship}><Text style={styles.shipGlyph}>▲</Text></View></View>
          <Pressable accessibilityRole="button" onPress={() => setLaunched(true)} style={styles.prompt}><Text style={styles.promptTitle}>Swipe to start your journey</Text><Text style={styles.promptHint}>DISCOVER EVENTS AROUND YOU</Text></Pressable>
        </View>
        <View style={styles.mode}><Text style={styles.modeLabel}>TRAVEL MODE</Text><Text style={styles.modeValue}>✦  Flying solo</Text><Text style={styles.modeEdit}>CHANGE</Text></View>
      </> : <>
        <View style={styles.mapHeader}><Text style={styles.kicker}>TRANSMISSION RECEIVED</Text><Text style={styles.mapTitle}>Conferences in your orbit</Text><Text style={styles.mapSub}>Tap a planet to explore its world</Text></View>
        <View style={styles.orbitMap}>
          <View style={styles.orbitLine} />
          {EVENTS.map((event, index) => (
            <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`Explore ${event.name}`} onPress={() => setSelected(event)} style={[styles.planetWrap, { left: `${event.x}%`, top: `${event.y}%` }]}>
              <View style={[styles.planet, { borderColor: event.color, shadowColor: event.color, width: 48 + (index % 2) * 12, height: 48 + (index % 2) * 12 }]}><View style={[styles.planetMark, { backgroundColor: event.color }]} /></View>
              <Text numberOfLines={1} style={styles.planetName}>{event.name}</Text>
            </Pressable>
          ))}
          <Animated.View style={[styles.shipFloat, { transform: [{ translateY: shipY }] }]}><Text style={styles.shipGlyph}>▲</Text></Animated.View>
        </View>
        <View style={styles.bottomHint}><Text style={styles.bottomHintText}>✦  4 EVENTS WITHIN YOUR ORBIT</Text><Text style={styles.bottomHintText}>Swipe around to explore</Text></View>
      </>}

      {selected && <View style={styles.scrim}><Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} /><View style={styles.sheet}>
        <View style={[styles.sheetPlanet, { backgroundColor: selected.color }]} /><Text style={styles.sheetKicker}>DESTINATION FOUND</Text><Text style={styles.sheetTitle}>{selected.name}</Text><Text style={styles.sheetMeta}>{selected.date}  ·  {selected.place}</Text><Text style={styles.sheetTopic}>{selected.topic}</Text>
        <Pressable style={styles.attendButton} onPress={() => setSelected(null)}><Text style={styles.attendText}>Attend this conference  →</Text></Pressable>
        <Pressable onPress={() => setSelected(null)} style={styles.closeButton}><Text style={styles.closeText}>Close</Text></Pressable>
      </View></View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080d1a', overflow: 'hidden' },
  starLayer: { ...StyleSheet.absoluteFillObject }, star: { position: 'absolute', width: 2, height: 2, borderRadius: 2, backgroundColor: '#d7e7ff' },
  topBar: { height: 58, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { color: '#e2ebff', fontSize: 13, fontWeight: '800', letterSpacing: 2 }, counter: { color: '#7788a8', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  intro: { paddingHorizontal: 26, paddingTop: 48 }, kicker: { color: '#7e9acb', fontSize: 10, fontWeight: '800', letterSpacing: 1.7 }, heading: { color: '#f1f5ff', fontSize: 34, lineHeight: 41, fontWeight: '700', marginTop: 14 },
  launchArea: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 58 }, launchRing: { width: 156, height: 156, borderRadius: 100, borderWidth: 1, borderColor: '#556b91', backgroundColor: 'rgba(33,53,84,0.24)', alignItems: 'center', justifyContent: 'center', marginBottom: 26 }, arrow: { position: 'absolute', color: '#91a9d5', fontSize: 28, top: 18 }, ship: { width: 58, height: 58, borderRadius: 30, backgroundColor: '#131e32', borderWidth: 1, borderColor: '#6e86b0', alignItems: 'center', justifyContent: 'center', marginTop: 24 }, shipGlyph: { color: '#e8f2ff', fontSize: 28 }, prompt: { alignItems: 'center', padding: 10 }, promptTitle: { color: '#eaf1ff', fontSize: 16, fontWeight: '600' }, promptHint: { color: '#7183a3', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 10 },
  mode: { height: 76, marginHorizontal: 24, borderTopWidth: 1, borderColor: '#27334b', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modeLabel: { color: '#7788a8', fontSize: 9, letterSpacing: 1.2 }, modeValue: { color: '#dce7fa', fontSize: 13, fontWeight: '600' }, modeEdit: { color: '#92a7cf', fontSize: 9, letterSpacing: 1 },
  mapHeader: { paddingHorizontal: 24, paddingTop: 26 }, mapTitle: { color: '#f1f5ff', fontSize: 25, fontWeight: '700', marginTop: 10 }, mapSub: { color: '#8290aa', fontSize: 13, marginTop: 6 }, orbitMap: { flex: 1, marginTop: 4 }, orbitLine: { position: 'absolute', width: width * 0.88, height: width * 0.88, borderRadius: width, borderWidth: 1, borderColor: 'rgba(124,151,196,0.18)', left: width * 0.06, top: height * 0.09 }, planetWrap: { position: 'absolute', width: 110, alignItems: 'center', marginLeft: -32, marginTop: -25 }, planet: { borderRadius: 60, borderWidth: 1, backgroundColor: '#142036', alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.5, shadowRadius: 17, elevation: 7 }, planetMark: { width: '44%', height: '44%', borderRadius: 40, opacity: 0.35 }, planetName: { color: '#d9e4f8', fontSize: 10, fontWeight: '600', marginTop: 8, width: 110, textAlign: 'center' }, shipFloat: { position: 'absolute', top: '45%', left: '48%', width: 48, height: 48, borderRadius: 30, backgroundColor: '#15223a', borderColor: '#718ab7', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, bottomHint: { paddingHorizontal: 24, paddingBottom: 22, flexDirection: 'row', justifyContent: 'space-between' }, bottomHintText: { color: '#7484a0', fontSize: 9, letterSpacing: 0.7 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,6,16,0.72)', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#121c2e', padding: 26, paddingBottom: 34, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#34435d' }, sheetPlanet: { width: 38, height: 38, borderRadius: 24, marginBottom: 18 }, sheetKicker: { color: '#8ea5cf', fontWeight: '800', fontSize: 9, letterSpacing: 1.6 }, sheetTitle: { color: '#f1f5ff', fontSize: 25, fontWeight: '700', marginTop: 8 }, sheetMeta: { color: '#c2cee2', fontSize: 14, marginTop: 9 }, sheetTopic: { color: '#8191aa', fontSize: 13, marginTop: 7 }, attendButton: { height: 52, borderRadius: 14, backgroundColor: '#8de6c5', alignItems: 'center', justifyContent: 'center', marginTop: 24 }, attendText: { color: '#0c251e', fontSize: 15, fontWeight: '700' }, closeButton: { alignItems: 'center', padding: 14 }, closeText: { color: '#a2b1c9', fontSize: 14 },
});
