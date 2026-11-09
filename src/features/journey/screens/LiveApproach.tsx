import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../../../theme';
import { EVENTS, type EventItem } from '../events';
import { PLANET_SIZE, PlanetBody } from '../Planet';
import { ConnectionsConferencePopup } from '../../connections/screens/ConnectionsConferencePopup';

const { width, height } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(height * 0.56);
const ANDROID_TOP_INSET = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

type Origin = { x: number; y: number };

export function LiveApproach({
  event,
  origin,
  presence,
  onClosing,
  onClose,
}: {
  event: EventItem;
  origin: Origin | null;
  presence: string | null;
  onClosing: () => void;
  onClose: () => void;
}) {
  const zoom = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;
  const sheetDrag = useRef(new Animated.Value(0)).current;
  const openAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const leaving = useRef(false);
  const leaveRef = useRef<(after: () => void) => void>(() => {});
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const index = Math.max(0, EVENTS.findIndex((item) => item.id === event.id));
  const fallbackTop = ANDROID_TOP_INSET + 8 + 46 + 52 + Math.max(0, height - (ANDROID_TOP_INSET + 8 + 46 + 52)) * 0.2;
  const startCenterX = (origin?.x ?? (width - PLANET_SIZE) / 2) + PLANET_SIZE / 2;
  const startCenterY = (origin?.y ?? fallbackTop) + PLANET_SIZE / 2;
  const endCenterX = width / 2;
  const endCenterY = height * 0.26;
  const zoomScale = (width * 1.28) / PLANET_SIZE;

  const leave = (after: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    openAnimation.current?.stop();
    onClosing();
    sheetDrag.stopAnimation((value) => {
      Animated.parallel([
        Animated.timing(zoom, {
          toValue: 0,
          duration: 560,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetDrag, {
          toValue: value + SHEET_HEIGHT,
          duration: 340,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) after();
      });
    });
  };
  leaveRef.current = leave;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(zoom, {
        toValue: 1,
        duration: 880,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(240),
        Animated.timing(sheet, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
    openAnimation.current = animation;
    animation.start();
    return () => animation.stop();
  }, [sheet, zoom]);

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => {
      sheetDrag.setValue(Math.max(0, gesture.dy));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 72 || gesture.vy > 0.9) leaveRef.current(onCloseRef.current);
      else Animated.spring(sheetDrag, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(sheetDrag, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 0 }).start();
    },
  }), [sheetDrag]);

  const translateY = Animated.add(
    sheet.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT, 0] }),
    sheetDrag,
  );

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.planet,
          {
            left: endCenterX - PLANET_SIZE / 2,
            top: endCenterY - PLANET_SIZE / 2,
            transform: [
              { translateX: zoom.interpolate({ inputRange: [0, 1], outputRange: [startCenterX - endCenterX, 0] }) },
              { translateY: zoom.interpolate({ inputRange: [0, 1], outputRange: [startCenterY - endCenterY, 0] }) },
              { scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, zoomScale] }) },
            ],
          },
        ]}
      >
        <PlanetBody color={event.color} index={index} spin />
      </Animated.View>
      <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
        <Pressable accessibilityLabel="Leave the floor" style={styles.sky} onPress={() => leave(onClose)} />
        <Animated.View style={[styles.sheet, { height: SHEET_HEIGHT, transform: [{ translateY }] }]}>
          <View style={[styles.colorBar, { backgroundColor: event.color }]} />
          <View style={styles.header}>
            <View style={styles.grabberHit} {...pan.panHandlers}>
              <View style={styles.grabber} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} onPress={() => leave(onClose)} style={styles.closeHit}>
              <Text style={styles.closeMark}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
          >
            <Text style={styles.kicker}>Happening now</Text>
            {presence ? (
              <View style={styles.presence}>
                <Text style={styles.check}>✓</Text>
                <Text style={styles.presenceText}>{presence}</Text>
              </View>
            ) : null}
            <ConnectionsConferencePopup event={event} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 8 },
  planet: { position: 'absolute', width: PLANET_SIZE, height: PLANET_SIZE },
  sky: { flex: 1 },
  sheet: { backgroundColor: theme.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  colorBar: { height: StyleSheet.hairlineWidth },
  header: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  grabberHit: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 12, paddingBottom: 10 },
  grabber: { width: 36, height: StyleSheet.hairlineWidth, backgroundColor: theme.lineStrong },
  closeHit: { position: 'absolute', right: 16, top: 10, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeMark: { color: theme.muted, fontSize: 20, lineHeight: 22 },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 28 },
  kicker: { color: '#8fd18a', fontWeight: '500', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', marginTop: 4 },
  title: { color: theme.fg, fontSize: 32, lineHeight: 36, fontWeight: '300', letterSpacing: -0.6, marginTop: 8 },
  meta: { color: theme.fg, fontSize: 15, fontWeight: '300', marginTop: 10 },
  topic: { color: theme.muted, fontSize: 14, marginTop: 4 },
  body: { color: theme.muted, fontSize: 15, lineHeight: 22, marginTop: 14 },
  presence: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  check: { color: '#6FCF97', fontSize: 16, fontWeight: '600' },
  presenceText: { color: theme.fg, fontSize: 14, fontWeight: '400' },
  section: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 26, marginBottom: 4 },
  row: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  rowText: { color: theme.fg, fontSize: 16, lineHeight: 22, fontWeight: '300' },
  agendaLine: { flexDirection: 'row', alignItems: 'baseline', gap: 14 },
  agendaWhen: { width: 88, color: theme.muted, fontSize: 13 },
  agendaWhat: { flex: 1, color: theme.fg, fontSize: 16, lineHeight: 22, fontWeight: '300' },
  empty: { color: theme.muted, fontSize: 15, lineHeight: 22, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  personName: { color: theme.fg, fontSize: 16, fontWeight: '300' },
  personMeta: { color: theme.muted, fontSize: 13, marginTop: 3 },
  personInterests: { color: theme.fg, fontSize: 14, lineHeight: 20, fontWeight: '300', marginTop: 8 },
  fieldLabel: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6, marginTop: 18 },
  input: { minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.lineStrong, paddingHorizontal: 0, color: theme.fg, fontSize: 18, fontWeight: '300' },
  error: { color: theme.danger, fontSize: 14, lineHeight: 20, marginTop: 12 },
  actions: { marginTop: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line },
  action: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  actionText: { color: theme.fg, fontSize: 16, fontWeight: '400' },
  actionMark: { color: theme.fg, fontSize: 16, fontWeight: '300' },
});
