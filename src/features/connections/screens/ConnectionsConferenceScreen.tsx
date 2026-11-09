import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventItem } from '../../journey/events';
import { theme } from '../../../theme';
import {
  findCompatibleParticipants,
  listConnectionRequests,
  requestConnection,
  respondToConnection,
} from '../service';
import type { CompatibleParticipant, ConnectionStatus, MatchProfile, ParticipantConnection } from '../types';

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: theme.bg,
  card: theme.bg,
  border: theme.line,
  borderSoft: theme.lineStrong,
  text: theme.fg,
  muted: theme.muted,
  cyan: theme.fg,
  purple: theme.muted,
  danger: theme.danger,
};

export type ConnectionsViewer = {
  userId: string;
  displayName: string;
  profile: MatchProfile;
  workSituation?: 'working' | 'student' | 'looking' | null;
  sessionRoom?: string;
  sessionTime?: string;
  discoverable: boolean;
};

export function ConnectionsConferenceScreen({
  client,
  event,
  viewer,
  onBack,
}: {
  client?: SupabaseClient;
  event: EventItem;
  viewer: ConnectionsViewer;
  onBack?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'matches' | 'about'>('matches');
  const [matches, setMatches] = useState<CompatibleParticipant[]>([]);
  const [requests, setRequests] = useState<ParticipantConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!client) throw new Error('Supabase client is missing.');
      const [nextMatches, nextRequests] = await Promise.all([
        findCompatibleParticipants(client, event.id, viewer.userId, viewer.profile),
        listConnectionRequests(client, viewer.userId, event.id),
      ]);
      setMatches(nextMatches);
      setRequests(nextRequests);
    } catch {
      setError('Could not load people for this event. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [client, event.id, viewer.profile, viewer.userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleRequest = async (participant: CompatibleParticipant) => {
    setBusyId(participant.userId);
    setError('');
    try {
      if (!client) throw new Error('Supabase client is missing.');
      await requestConnection(client, event.id, viewer.userId, participant.userId);
      await refresh();
    } catch {
      setError('Could not send the connection request. It may already exist.');
    } finally {
      setBusyId(null);
    }
  };

  const handleResponse = async (requestId: string, status: Extract<ConnectionStatus, 'accepted' | 'declined'>) => {
    setBusyId(requestId);
    setError('');
    try {
      if (!client) throw new Error('Supabase client is missing.');
      await respondToConnection(client, requestId, status);
      await refresh();
    } catch {
      setError('Could not update this request. Refresh and try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.planetSky}>
        <EventPlanet color={event.color} index={Math.max(0, (Number.parseInt(event.id, 10) || 1) - 1)} />
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back to the orbit" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backMark}>‹</Text>
          </Pressable>
        ) : null}
        <View style={styles.stars} pointerEvents="none">
          {Array.from({ length: 20 }, (_, index) => (
            <View key={index} style={[styles.star, { left: `${(index * 47 + 9) % 100}%`, top: `${(index * 71 + 17) % 92}%`, opacity: index % 4 === 0 ? 0.85 : 0.36 }]} />
          ))}
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handleWrap}><View style={styles.handle} /></View>

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: event.color }]}>{event.date.toUpperCase()}  //  EVENT ORBIT</Text>
          <Text numberOfLines={2} style={styles.title}>{event.name}</Text>
          <View style={styles.metaRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metaList} style={styles.metaScroll}>
              <MetaPill label={`⌖  ${event.place}`} />
              <MetaPill label={`✳  ${event.topic}`} />
              {viewer.profile.role === 'presenting' && viewer.sessionTime ? <MetaPill label={`◷  ${viewer.sessionTime}`} /> : null}
            </ScrollView>
            {event.officialUrl ? (
              <Pressable accessibilityRole="link" accessibilityLabel="Open official event information" onPress={() => void Linking.openURL(event.officialUrl!)} style={styles.officialLink}>
                <Text style={[styles.officialLinkText, { color: event.color }]}>Official info ↗</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.tabs}>
          <Tab label="Matched peers" active={activeTab === 'matches'} onPress={() => setActiveTab('matches')} />
          <Tab label="About event" active={activeTab === 'about'} onPress={() => setActiveTab('about')} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {activeTab === 'matches' ? (
            <>
              <Text style={styles.sectionTitle}>PEOPLE WITH SHARED SIGNALS</Text>
              {requests.some((request) => request.recipient_user_id === viewer.userId && request.status === 'pending') ? (
                <Text style={styles.inboxLabel}>NEW CONNECTION REQUESTS</Text>
              ) : null}
              {loading ? <ActivityIndicator color={COLORS.cyan} style={styles.loader} /> : null}
              {!loading && !matches.length ? <Text style={styles.empty}>No opted-in matches yet. People will appear here as they join this event.</Text> : null}
              {!loading ? matches.map((match) => (
                <MatchCard
                  key={match.userId}
                  participant={match}
                  viewerId={viewer.userId}
                  requests={requests}
                  busy={busyId === match.userId}
                  onConnect={() => void handleRequest(match)}
                  onRespond={(requestId, status) => void handleResponse(requestId, status)}
                />
              )) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.refreshButton}>
              <Text style={[styles.refreshText, { color: event.color }]}>REFRESH PEOPLE</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>EVENT OVERVIEW</Text>
              <Text style={styles.description}>{event.blurb}</Text>
              <Text style={[styles.sectionTitle, styles.agendaTitle]}>ON THE SCHEDULE</Text>
              {event.highlights.map((item) => <Text key={item} style={styles.agendaItem}>{item}</Text>)}
            </>
          )}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

function MetaPill({ label }: { label: string }) {
  return <View style={styles.pill}><Text numberOfLines={1} style={styles.pillText}>{label}</Text></View>;
}

// This mirrors the event-specific planet used on the journey dial, including its
// event color, atmosphere, bands, craters, terminator, and light glint.
function EventPlanet({ color, index }: { color: string; index: number }) {
  const size = Math.min(width * 0.68, 256);
  const tilt = -18 + index * 8;
  const bandTop = size * (0.2 + (index % 3) * 0.1);
  return (
    <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: color }}>
        <View style={{ position: 'absolute', left: -20, right: -20, height: size * 0.09, top: bandTop, backgroundColor: 'rgba(0,0,0,0.16)', transform: [{ rotate: `${tilt}deg` }] }} />
        <View style={{ position: 'absolute', left: -20, right: -20, height: size * 0.045, top: bandTop + size * 0.26, backgroundColor: 'rgba(255,255,255,0.2)', transform: [{ rotate: `${tilt}deg` }] }} />
        <View style={{ position: 'absolute', left: size * (0.19 + (index % 3) * 0.08), top: size * 0.48, width: size * 0.13, height: size * 0.13, borderRadius: size, backgroundColor: 'rgba(0,0,0,0.18)' }} />
        <View style={{ position: 'absolute', left: size * 0.57, top: size * 0.32, width: size * 0.075, height: size * 0.075, borderRadius: size, backgroundColor: 'rgba(0,0,0,0.18)' }} />
        <View style={{ position: 'absolute', left: size * 0.46, width: size, height: size, borderRadius: size, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        <View style={{ position: 'absolute', width: size * 0.42, height: size * 0.22, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.32)', top: size * 0.14, left: size * 0.12, transform: [{ rotate: '-22deg' }] }} />
      </View>
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MatchCard({ participant, viewerId, requests, busy, onConnect, onRespond }: {
  participant: CompatibleParticipant;
  viewerId: string;
  requests: ParticipantConnection[];
  busy: boolean;
  onConnect: () => void;
  onRespond: (requestId: string, status: Extract<ConnectionStatus, 'accepted' | 'declined'>) => void;
}) {
  const request = requests.find((item) => item.event_id === participant.eventId && (
    (item.requester_user_id === viewerId && item.recipient_user_id === participant.userId)
    || (item.recipient_user_id === viewerId && item.requester_user_id === participant.userId)
  ));
  const initials = participant.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const interests = participant.interests.slice(0, 3).join('  ·  ');
  const role = participant.role === 'presenting' ? 'PRESENTER' : 'ATTENDEE';
  let actionLabel = 'CONNECT';
  let action: (() => void) | undefined = onConnect;
  let muted = false;

  if (request?.status === 'accepted') {
    actionLabel = 'CONNECTED';
    action = undefined;
    muted = true;
  } else if (request?.status === 'pending' && request.requester_user_id === viewerId) {
    actionLabel = 'REQUEST SENT';
    action = undefined;
    muted = true;
  } else if (request?.status === 'pending') {
    actionLabel = 'ACCEPT';
    action = () => onRespond(request.id, 'accepted');
  } else if (request?.status === 'declined') {
    actionLabel = 'DECLINED';
    action = undefined;
    muted = true;
  }

  return (
    <View style={styles.profileCard}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials || 'C'}</Text></View>
      <View style={styles.profileInfo}>
        <Text numberOfLines={1} style={styles.profileName}>{participant.displayName}</Text>
        <Text numberOfLines={1} style={styles.profileRole}>{role}{participant.jobTitle ? `  ·  ${participant.jobTitle}` : ''}</Text>
        <Text numberOfLines={1} style={styles.profileTags}>{interests || participant.organization || 'Conference participant'}</Text>
        {participant.reasons[0] ? <Text numberOfLines={1} style={styles.reason}>{participant.reasons[0].label}: {participant.reasons[0].value}</Text> : null}
        {participant.sessionRoom || participant.sessionTime ? <Text numberOfLines={1} style={styles.sessionMeta}>{[participant.sessionRoom, participant.sessionTime].filter(Boolean).join('  ·  ')}</Text> : null}
        {request?.status === 'pending' && request.recipient_user_id === viewerId ? (
          <View style={styles.responseActions}>
            <Pressable disabled={busy} onPress={() => onRespond(request.id, 'accepted')} style={styles.acceptButton}><Text style={styles.acceptText}>ACCEPT</Text></Pressable>
            <Pressable disabled={busy} onPress={() => onRespond(request.id, 'declined')} style={styles.declineButton}><Text style={styles.declineText}>PASS</Text></Pressable>
          </View>
        ) : action ? (
          <Pressable disabled={busy} onPress={action} style={[styles.connectButton, muted && styles.connectMuted]}>
            {busy ? <ActivityIndicator size="small" color={COLORS.cyan} /> : <Text style={[styles.connectText, muted && styles.connectMutedText]}>{actionLabel}</Text>}
          </Pressable>
        ) : <Text style={styles.connectedLabel}>{actionLabel}</Text>}
      </View>
      <View style={styles.matchBadge}><Text style={styles.matchText}>{participant.score}%</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  planetSky: { height: height * 0.36, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' },
  backButton: { position: 'absolute', left: 20, top: 8, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.line },
  backMark: { color: theme.fg, fontSize: 30, lineHeight: 32, fontWeight: '300', marginTop: -3 },
  stars: { ...StyleSheet.absoluteFillObject },
  star: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: '#EAE7FF' },
  planet: { width: 144, height: 144, borderRadius: 72, backgroundColor: '#27232F', borderWidth: 1, borderColor: COLORS.borderSoft, shadowColor: COLORS.purple, shadowOpacity: 0.3, shadowRadius: 32, elevation: 8 },
  coordinates: { position: 'absolute', top: 48, left: 20, color: COLORS.muted, fontSize: 10, fontWeight: '500', letterSpacing: 1.4 },
  sheet: { flex: 1, backgroundColor: COLORS.card, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border, paddingTop: 8 },
  handleWrap: { alignItems: 'center', paddingVertical: 6 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.borderSoft },
  header: { paddingHorizontal: 20, paddingVertical: 10 },
  eyebrow: { color: COLORS.cyan, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 5 },
  title: { color: COLORS.text, fontSize: 25, lineHeight: 30, fontWeight: '600', letterSpacing: -0.3, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaScroll: { flexShrink: 1 },
  metaList: { gap: 7, paddingRight: 4 },
  officialLink: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 3 },
  officialLinkText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  pill: { maxWidth: width * 0.65, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16 },
  pillText: { color: COLORS.muted, fontSize: 11 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 10, padding: 3, borderRadius: 12, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, minHeight: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: '#202020' },
  tabText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: COLORS.text },
  content: { flex: 1, marginTop: 14 },
  contentInner: { paddingHorizontal: 20, paddingBottom: 18 },
  sectionTitle: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 11 },
  inboxLabel: { color: COLORS.purple, fontSize: 9, fontWeight: '700', letterSpacing: 1.3, marginBottom: 8 },
  loader: { marginTop: 24 },
  empty: { color: COLORS.muted, fontSize: 13, lineHeight: 19, paddingVertical: 18 },
  error: { color: COLORS.danger, fontSize: 12, lineHeight: 18, marginTop: 10 },
  refreshButton: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 11, marginTop: 6 },
  refreshText: { color: COLORS.cyan, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  profileCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginBottom: 9 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#292431', borderWidth: 1, borderColor: 'rgba(168,85,247,0.45)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  profileInfo: { flex: 1, minWidth: 0, marginHorizontal: 11 },
  profileName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  profileRole: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  profileTags: { color: COLORS.cyan, fontSize: 10, marginTop: 5 },
  reason: { color: '#C9A8F6', fontSize: 10, marginTop: 4 },
  sessionMeta: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  matchBadge: { backgroundColor: 'rgba(6,182,212,0.1)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.75)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  matchText: { color: COLORS.cyan, fontSize: 11, fontWeight: '700' },
  connectButton: { alignSelf: 'flex-start', minHeight: 28, minWidth: 74, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(6,182,212,0.55)' },
  connectText: { color: COLORS.cyan, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  connectMuted: { borderColor: COLORS.borderSoft },
  connectMutedText: { color: COLORS.muted },
  connectedLabel: { color: COLORS.cyan, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginTop: 12 },
  responseActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  acceptButton: { borderRadius: 7, backgroundColor: COLORS.cyan, paddingHorizontal: 10, paddingVertical: 7 },
  acceptText: { color: COLORS.bg, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  declineButton: { borderRadius: 7, borderWidth: 1, borderColor: COLORS.borderSoft, paddingHorizontal: 10, paddingVertical: 6 },
  declineText: { color: COLORS.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  description: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  agendaTitle: { marginTop: 22 },
  agendaItem: { color: COLORS.text, fontSize: 12, lineHeight: 19, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  actionBar: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  primaryButton: { minHeight: 49, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.text },
  joinedButton: { backgroundColor: COLORS.borderSoft },
  primaryText: { color: COLORS.bg, fontSize: 11, fontWeight: '800', letterSpacing: 0.75 },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.76)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 22, alignItems: 'center' },
  modalKicker: { color: COLORS.cyan, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  modalTitle: { color: COLORS.text, fontSize: 22, fontWeight: '600', marginTop: 8 },
  modalBody: { color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 10, marginBottom: 20 },
  modalButton: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 9 },
  modalButtonText: { color: COLORS.text, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
});
