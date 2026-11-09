import { useAuth, useUser } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { createUserSupabaseClient } from '../../../lib/supabase';
import { theme } from '../../../theme';
import type { EventItem } from '../../journey/events';
import { readContactProfile, readEventPlans, readStoredAttendee, suggestAttendee } from '../../welcome/profile';
import { findCompatibleParticipants, listConnectionRequests, requestConnection, respondToConnection, saveParticipantProfile } from '../service';
import type { CompatibleParticipant, ConnectionStatus, MatchProfile, ParticipantConnection } from '../types';

export function ConnectionsConferencePopup({ event }: { event: EventItem }) {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const client = useMemo(() => createUserSupabaseClient(() => getToken()), [getToken]);
  const metadata = user?.unsafeMetadata;
  const attendee = readStoredAttendee(metadata) ?? suggestAttendee(metadata);
  const contact = readContactProfile(metadata);
  const plans = useMemo(() => readEventPlans(metadata), [metadata]);
  const plan = useMemo(() => plans.find((item) => item.eventId === event.id), [event.id, plans]);
  const profile = useMemo<MatchProfile | null>(() => user ? ({
    role: plan?.role ?? 'attending',
    jobTitle: attendee?.jobTitle || contact?.jobTitle || '',
    organization: contact?.company || '',
    interests: (attendee?.interests || contact?.interests || '').split(/[;,]/).map((value) => value.trim()).filter(Boolean),
  }) : null, [attendee?.interests, attendee?.jobTitle, contact?.company, contact?.interests, contact?.jobTitle, plan?.role, user]);
  const [tab, setTab] = useState<'matches' | 'about'>('matches');
  const [matches, setMatches] = useState<CompatibleParticipant[]>([]);
  const [requests, setRequests] = useState<ParticipantConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!client || !user || !profile || !plan) return;
    setLoading(true);
    setError('');
    try {
      await saveParticipantProfile(client, {
        eventId: event.id,
        eventName: event.name,
        userId: user.id,
        displayName: user.fullName || user.firstName || 'Convergence member',
        role: profile.role,
        workSituation: attendee?.situation,
        jobTitle: profile.jobTitle,
        organization: profile.organization,
        interests: profile.interests,
        sessionRoom: plan.room,
        sessionTime: plan.time,
        discoverable: true,
      });
      const [nextMatches, nextRequests] = await Promise.all([
        findCompatibleParticipants(client, event.id, user.id, profile),
        listConnectionRequests(client, user.id, event.id),
      ]);
      setMatches(nextMatches);
      setRequests(nextRequests);
    } catch {
      setError('Could not load event connections. Check your account connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [attendee?.situation, client, event.id, event.name, plan, profile, user]);

  useEffect(() => { if (authLoaded && userLoaded && plan) void load(); }, [authLoaded, load, plan, userLoaded]);

  const connect = async (participant: CompatibleParticipant) => {
    if (!client || !user) return;
    setBusyId(participant.userId);
    try {
      await requestConnection(client, event.id, user.id, participant.userId);
      await load();
    } catch {
      setError('Could not send the request. It may already exist.');
    } finally {
      setBusyId('');
    }
  };

  const respond = async (requestId: string, status: Extract<ConnectionStatus, 'accepted' | 'declined'>) => {
    if (!client) return;
    setBusyId(requestId);
    try {
      await respondToConnection(client, requestId, status);
      await load();
    } catch {
      setError('Could not update that request. Refresh and try again.');
    } finally {
      setBusyId('');
    }
  };

  if (!authLoaded || !userLoaded) return <ActivityIndicator color={event.color} style={styles.loading} />;
  if (!user || !plan) return <Text style={styles.empty}>Join this event to open its connections.</Text>;

  return (
    <View style={styles.panel}>
      <Text style={[styles.kicker, { color: event.color }]}>{event.date.toUpperCase()}  /  {event.place.toUpperCase()}</Text>
      <Text style={styles.title}>{event.name}</Text>
      <View style={styles.eventMeta}>
        <Text style={styles.metaTag}>{event.topic}</Text>
        {event.officialUrl ? (
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(event.officialUrl!)}>
            <Text style={[styles.official, { color: event.color }]}>Official event info ↗</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.tabs}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'matches' }} onPress={() => setTab('matches')} style={[styles.tab, tab === 'matches' && styles.tabOn]}>
          <Text style={[styles.tabText, tab === 'matches' && styles.tabTextOn]}>Matched peers</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'about' }} onPress={() => setTab('about')} style={[styles.tab, tab === 'about' && styles.tabOn]}>
          <Text style={[styles.tabText, tab === 'about' && styles.tabTextOn]}>About event</Text>
        </Pressable>
      </View>

      {tab === 'matches' ? (
        <View style={styles.content}>
          <Text style={styles.section}>PEOPLE WITH SHARED INTERESTS</Text>
          {loading ? <ActivityIndicator color={event.color} style={styles.loading} /> : null}
          {!loading && matches.length === 0 && !error ? <Text style={styles.empty}>No opted-in attendees yet. Check back as people join the floor.</Text> : null}
          {!loading ? matches.map((match) => (
            <PopupMatch key={match.userId} match={match} userId={user.id} requests={requests} busy={busyId === match.userId || busyId !== ''} eventColor={event.color} onConnect={() => void connect(match)} onRespond={(id, status) => void respond(id, status)} />
          )) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={loading} onPress={() => void load()} style={styles.refresh}>
            <Text style={[styles.refreshText, { color: event.color }]}>{loading ? 'UPDATING…' : 'REFRESH PEOPLE'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.section}>EVENT OVERVIEW</Text>
          <Text style={styles.body}>{event.blurb}</Text>
          <Text style={[styles.section, styles.agendaHeading]}>ON THE SCHEDULE</Text>
          {event.highlights.map((highlight) => <Text key={highlight} style={styles.agenda}>{highlight}</Text>)}
        </View>
      )}
    </View>
  );
}

function PopupMatch({ match, userId, requests, busy, eventColor, onConnect, onRespond }: {
  match: CompatibleParticipant;
  userId: string;
  requests: ParticipantConnection[];
  busy: boolean;
  eventColor: string;
  onConnect: () => void;
  onRespond: (id: string, status: Extract<ConnectionStatus, 'accepted' | 'declined'>) => void;
}) {
  const request = requests.find((item) => (item.requester_user_id === userId && item.recipient_user_id === match.userId) || (item.recipient_user_id === userId && item.requester_user_id === match.userId));
  const initials = match.displayName.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const action = request?.status === 'accepted' ? 'CONNECTED' : request?.status === 'pending' && request.requester_user_id === userId ? 'REQUEST SENT' : request?.status === 'pending' ? 'ACCEPT' : 'CONNECT';
  return (
    <View style={styles.person}>
      <View style={[styles.avatar, { borderColor: `${eventColor}88` }]}><Text style={styles.initials}>{initials}</Text></View>
      <View style={styles.personCopy}>
        <View style={styles.nameLine}>
          <Text numberOfLines={1} style={styles.name}>{match.displayName}</Text>
          <Text style={[styles.score, { color: eventColor }]}>{match.score}%</Text>
        </View>
        <Text numberOfLines={1} style={styles.role}>{match.role === 'presenting' ? 'PRESENTER' : 'ATTENDEE'}{match.jobTitle ? `  ·  ${match.jobTitle}` : ''}</Text>
        <Text numberOfLines={1} style={styles.interests}>{match.interests.slice(0, 3).join('  ·  ') || match.organization || 'Conference participant'}</Text>
        {request?.status === 'pending' && request.recipient_user_id === userId ? (
          <View style={styles.actions}>
            <Pressable disabled={busy} onPress={() => onRespond(request.id, 'accepted')}><Text style={[styles.action, { color: eventColor }]}>ACCEPT</Text></Pressable>
            <Pressable disabled={busy} onPress={() => onRespond(request.id, 'declined')}><Text style={[styles.action, styles.pass]}>PASS</Text></Pressable>
          </View>
        ) : <Pressable disabled={busy || action !== 'CONNECT'} onPress={onConnect}><Text style={[styles.action, { color: eventColor }]}>{action}</Text></Pressable>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 4 },
  kicker: { fontSize: 9, fontWeight: '600', letterSpacing: 1.5, marginTop: 8 },
  title: { color: theme.fg, fontSize: 23, lineHeight: 28, fontWeight: '300', marginTop: 4 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  metaTag: { color: theme.muted, fontSize: 10 },
  official: { fontSize: 10, fontWeight: '600' },
  tabs: { flexDirection: 'row', marginTop: 14, padding: 3, borderWidth: 1, borderColor: theme.line, borderRadius: 11 },
  tab: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tabOn: { backgroundColor: '#202020' },
  tabText: { color: theme.muted, fontSize: 11, fontWeight: '500' },
  tabTextOn: { color: theme.fg },
  content: { paddingTop: 17 },
  section: { color: theme.faint, fontSize: 9, fontWeight: '600', letterSpacing: 1.3, marginBottom: 8 },
  loading: { marginVertical: 22 },
  empty: { color: theme.muted, fontSize: 12, lineHeight: 18, paddingVertical: 14 },
  error: { color: theme.danger, fontSize: 11, lineHeight: 16, paddingVertical: 8 },
  refresh: { alignSelf: 'center', padding: 12 },
  refreshText: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2 },
  person: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101010' },
  initials: { color: theme.fg, fontSize: 11, fontWeight: '500' },
  personCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  nameLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, color: theme.fg, fontSize: 13, fontWeight: '500' },
  score: { fontSize: 10, fontWeight: '600' },
  role: { color: theme.muted, fontSize: 10, marginTop: 3 },
  interests: { color: theme.fg, fontSize: 10, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  action: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8, marginTop: 8 },
  pass: { color: theme.muted },
  body: { color: theme.muted, fontSize: 12, lineHeight: 18 },
  agendaHeading: { marginTop: 20 },
  agenda: { color: theme.fg, fontSize: 11, lineHeight: 18, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
});
