import { useUser } from '@clerk/expo';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Hairlines } from '../../../components/Hairlines';
import { theme } from '../../../theme';
import {
  readContactProfile,
  readEventPlans,
  readStoredAttendee,
  SITUATION_LABEL,
  suggestAttendee,
  titleLabel,
} from '../profile';

export function ContactProfilePage() {
  const { user } = useUser();
  const metadata = user?.unsafeMetadata;
  const contact = readContactProfile(metadata);
  const stored = readStoredAttendee(metadata);
  const about = stored ?? suggestAttendee(metadata);
  const plans = readEventPlans(metadata);
  const name = user?.fullName || user?.firstName || 'Your account';
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <View style={styles.screen}>
      <Hairlines />
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.name}>{name}</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
        <Text style={styles.heroMeta}>
          {plans.length === 0 ? 'No events yet' : plans.length === 1 ? '1 event on your list' : `${plans.length} events on your list`}
        </Text>
      </View>

      <Text style={styles.section}>ABOUT YOU</Text>
      <View style={styles.panel}>
        {stored ? <Text style={styles.pill}>{SITUATION_LABEL[stored.situation]}</Text> : null}
        <Detail divided={!!stored} label={stored ? titleLabel(stored.situation) : 'Job title'} value={about?.jobTitle || contact?.jobTitle} />
        <Detail divided label="Company or school" value={contact?.company} />
        <Detail divided label="Interests" value={about?.interests || contact?.interests} />
      </View>
      <Text style={styles.note}>
        {stored
          ? 'These details are saved for the next event. You’ll confirm or edit them each time you attend.'
          : 'The first time you attend an event, you’ll confirm these details. We’ll keep them for next time.'}
      </Text>

      <Text style={styles.section}>YOUR EVENTS</Text>
      {plans.length === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.empty}>Nothing here yet. Open an event on the map and tap Attend.</Text>
        </View>
      ) : (
        <View style={styles.panel}>
          {plans.map((plan, index) => (
            <View key={plan.eventId} style={[styles.plan, index > 0 && styles.planDivided]}>
              <Text style={styles.planName}>{plan.eventName}</Text>
              <Text style={styles.planMeta}>
                {plan.role === 'presenting'
                  ? `Presenting${plan.room ? ` · ${plan.room}` : ''}${plan.time ? ` · ${plan.time}` : ''}`
                  : 'Attending'}
              </Text>
            </View>
          ))}
        </View>
      )}
      </ScrollView>
    </View>
  );
}

function Detail({ label, value, divided }: { label: string; value?: string; divided?: boolean }) {
  return (
    <View style={[styles.detail, divided && styles.detailDivided]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value?.trim() || 'Not added yet'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36 },
  hero: { paddingTop: 8, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line },
  name: { color: theme.fg, fontSize: 34, fontWeight: '300', letterSpacing: -0.6 },
  email: { color: theme.muted, fontSize: 14, marginTop: 6 },
  heroMeta: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 12 },
  section: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.6, marginTop: 28, marginBottom: 4 },
  panel: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  pill: { alignSelf: 'flex-start', color: theme.fg, fontSize: 15, fontWeight: '300', marginTop: 14 },
  detail: { paddingVertical: 14 },
  detailDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  label: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.4, textTransform: 'uppercase' },
  value: { color: theme.fg, fontSize: 18, fontWeight: '300', marginTop: 4 },
  note: { color: theme.muted, fontSize: 13, lineHeight: 18, marginTop: 12 },
  plan: { paddingVertical: 14 },
  planDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  planName: { color: theme.fg, fontSize: 18, fontWeight: '300' },
  planMeta: { color: theme.muted, fontSize: 13, marginTop: 4 },
  empty: { color: theme.muted, fontSize: 15, lineHeight: 22, paddingVertical: 16 },
});
