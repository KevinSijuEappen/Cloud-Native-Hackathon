import { useAuth, useUser } from '@clerk/expo';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { createUserSupabaseClient } from '../../../lib/supabase';
import { theme } from '../../../theme';
import type { EventItem } from '../../journey/events';
import { readContactProfile, readEventPlans, readStoredAttendee, suggestAttendee } from '../../welcome/profile';
import { saveParticipantProfile } from '../service';
import { ConnectionsConferenceScreen } from './ConnectionsConferenceScreen';
import type { ConnectionsViewer } from './ConnectionsConferenceScreen';

/** Post-join connection view, populated from the signed-in Clerk account and live Supabase rows. */
export function ConnectionsConferenceEntryScreen({ event, onBack }: { event: EventItem; onBack?: () => void }) {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const client = useMemo(() => createUserSupabaseClient(() => getToken()), [getToken]);
  const metadata = user?.unsafeMetadata;
  const contact = readContactProfile(metadata);
  const attendee = readStoredAttendee(metadata) ?? suggestAttendee(metadata);
  const plan = readEventPlans(metadata).find((item) => item.eventId === event.id);
  const joinedToEvent = Boolean(plan);
  const [profileSaved, setProfileSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const viewer = useMemo<ConnectionsViewer | null>(() => {
    if (!user) return null;
    const interests = (attendee?.interests || contact?.interests || '')
      .split(/[;,]/)
      .map((interest) => interest.trim())
      .filter(Boolean);
    return {
      userId: user.id,
      displayName: user.fullName || user.firstName || 'Convergence member',
      profile: {
        role: plan?.role ?? 'attending',
        jobTitle: attendee?.jobTitle || contact?.jobTitle || '',
        organization: contact?.company || '',
        interests,
      },
      workSituation: attendee?.situation ?? null,
      sessionRoom: plan?.room,
      sessionTime: plan?.time,
      // Opening the connections area after joining is the explicit discoverability action.
      discoverable: true,
    };
  }, [attendee?.interests, attendee?.jobTitle, attendee?.situation, contact?.company, contact?.interests, contact?.jobTitle, plan?.role, plan?.room, plan?.time, user]);

  useEffect(() => {
    if (!client || !viewer || !joinedToEvent) return;
    let active = true;
    void saveParticipantProfile(client, {
      eventId: event.id,
      eventName: event.name,
      userId: viewer.userId,
      displayName: viewer.displayName,
      role: viewer.profile.role,
      workSituation: viewer.workSituation,
      jobTitle: viewer.profile.jobTitle,
      organization: viewer.profile.organization,
      interests: viewer.profile.interests,
      sessionRoom: viewer.sessionRoom,
      sessionTime: viewer.sessionTime,
      discoverable: viewer.discoverable,
    }).then(() => {
      if (active) setProfileSaved(true);
    }).catch(() => {
      if (active) setSaveError('Could not sync your event profile. Check your account connection and try again.');
    });
    return () => { active = false; };
  }, [client, event.id, event.name, joinedToEvent, viewer]);

  if (!authLoaded || !userLoaded) {
    return <Loading label="Loading your account…" />;
  }
  if (!user || !viewer) {
    return <Loading label="Sign in to connect with people at this event." />;
  }
  if (!joinedToEvent) {
    return <Loading label="Join this event from the orbit to open its connections." />;
  }
  if (!client) {
    return <Loading label="Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to load event connections." />;
  }

  return (
    <View style={styles.root}>
      <ConnectionsConferenceScreen client={client} event={event} viewer={viewer} onBack={onBack} />
      {saveError ? <View style={styles.notice}><Text style={styles.noticeText}>{saveError}</Text></View> : null}
      {!profileSaved && !saveError ? <View style={styles.sync}><ActivityIndicator size="small" color={event.color} /></View> : null}
    </View>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <SafeAreaView style={styles.loading}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <ActivityIndicator color={theme.fg} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  loadingLabel: { color: theme.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  sync: { position: 'absolute', top: 10, right: 12 },
  notice: { position: 'absolute', bottom: 20, left: 20, right: 20, padding: 12, borderRadius: 10, backgroundColor: '#171010', borderWidth: 1, borderColor: theme.line },
  noticeText: { color: theme.danger, fontSize: 12, lineHeight: 17 },
});
