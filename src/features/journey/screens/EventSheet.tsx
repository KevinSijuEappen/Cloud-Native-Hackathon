import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../../../theme';
import { isHappening, type EventItem } from '../events';
import { FlipCounter } from '../FlipCounter';
import { createContact, peopleAt, type DirectoryContact } from '../../search/client';
import {
  SITUATION_LABEL,
  titleLabel,
  type AttendeeProfile,
  type AttendanceRole,
  type EventPlan,
  type WorkSituation,
} from '../../welcome/profile';

type Step = 'preview' | 'details' | 'role' | 'confirm' | 'edit' | 'presenting' | 'saved';

const SITUATIONS: WorkSituation[] = ['working', 'student', 'looking'];
const SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.76;

export function EventSheet({
  event,
  plan,
  suggested,
  profileWasSaved,
  onClose,
  onSave,
  onLeave,
}: {
  event: EventItem;
  plan?: EventPlan;
  suggested: AttendeeProfile | null;
  profileWasSaved: boolean;
  onClose: () => void;
  onSave: (input: {
    role: AttendanceRole;
    profile?: AttendeeProfile;
    room?: string;
    time?: string;
  }) => Promise<void>;
  onLeave?: () => Promise<void>;
}) {
  const [step, setStep] = useState<Step>('preview');
  const [situation, setSituation] = useState<WorkSituation>(suggested?.situation ?? 'working');
  const [jobTitle, setJobTitle] = useState(suggested?.jobTitle ?? '');
  const [interests, setInterests] = useState(suggested?.interests ?? '');
  const [room, setRoom] = useState(plan?.role === 'presenting' ? plan.room : '');
  const [time, setTime] = useState(plan?.role === 'presenting' ? plan.time : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [committed, setCommitted] = useState<{ role: AttendanceRole; room: string; time: string; situation?: WorkSituation } | null>(null);

  const goBack = () => {
    setError('');
    if (step === 'details' || step === 'role') setStep('preview');
    else if (step === 'confirm' || step === 'presenting') setStep('role');
    else if (step === 'edit') setStep(suggested ? 'confirm' : 'role');
    else onClose();
  };

  const chooseRole = (role: AttendanceRole) => {
    setError('');
    if (role === 'presenting') {
      setStep('presenting');
      return;
    }
    setStep(suggested ? 'confirm' : 'edit');
  };

  const saveAttendance = async (role: AttendanceRole, profile?: AttendeeProfile) => {
    const nextRoom = role === 'presenting' ? room.trim() : '';
    const nextTime = role === 'presenting' ? time.trim() : '';
    if (role === 'attending') {
      if (!profile?.jobTitle.trim() || !profile.interests.trim()) {
        setError('Add a title and a few interests so people know how to find you.');
        setStep('edit');
        return;
      }
    }
    if (role === 'presenting' && (!nextRoom || !nextTime)) {
      setError('Add the room and the time you are presenting.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({ role, profile, room: nextRoom, time: nextTime });
      setCommitted({ role, room: nextRoom, time: nextTime, situation: profile?.situation ?? situation });
      setStep('saved');
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const draftProfile = (): AttendeeProfile => ({
    situation,
    jobTitle: jobTitle.trim(),
    interests: interests.trim(),
  });

  const leave = async () => {
    if (!onLeave) return;
    setSaving(true);
    setError('');
    try {
      await onLeave();
      onClose();
    } catch {
      setError('Could not update. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.scrim}>
      <Pressable accessibilityLabel="Close event" style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView style={styles.centerStage} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheetFrame, { borderColor: event.color }]}>
          <View style={styles.sheet}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}
            style={{ maxHeight: SHEET_MAX_HEIGHT }}
            contentContainerStyle={styles.scroll}
          >
            <Pressable accessibilityRole="button" accessibilityLabel="Close event" onPress={onClose} style={styles.handle}>
              <Text style={styles.handleMark}>×</Text>
            </Pressable>
            {step !== 'preview' && step !== 'saved' ? (
              <Pressable accessibilityRole="button" onPress={goBack} hitSlop={8} style={styles.backRow}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            ) : null}

            {step === 'preview' || step === 'details' ? (
              <>
                <View style={[styles.swatch, { backgroundColor: event.color, borderColor: event.color }]} />
                <Text style={styles.kicker}>{step === 'details' ? 'EVENT' : plan ? 'YOU’RE ON THE LIST' : 'DESTINATION FOUND'}</Text>
                <Text style={styles.title}>{event.name}</Text>
                <Text style={styles.meta}>{event.date}  ·  {event.place}</Text>
                <Text style={styles.topic}>{event.topic}</Text>
                {isHappening(event.date) ? <Text style={styles.liveTag}>Happening now</Text> : null}
                {plan ? <StatusLine plan={plan} date={event.date} /> : null}
              </>
            ) : null}

            {isHappening(event.date) && (step === 'preview' || step === 'details') ? <LiveFloor eventId={event.id} /> : null}

            {step === 'details' ? (
              <>
                <Text style={styles.body}>{event.blurb}</Text>
                <Text style={styles.section}>ON THE SCHEDULE</Text>
                {event.highlights.map((item) => (
                  <Text key={item} style={styles.highlight}>{item}</Text>
                ))}
              </>
            ) : null}

            {step === 'role' ? (
              <>
                <Text style={styles.kicker}>JOIN {event.name.toUpperCase()}</Text>
                <Text style={styles.title}>How are you taking part?</Text>
                <Choice
                  title="I’m attending"
                  copy="Share what you do so the right people can find you."
                  onPress={() => chooseRole('attending')}
                />
                <Choice
                  title="I’m presenting"
                  copy="Add your room and time so people can come find your session."
                  onPress={() => chooseRole('presenting')}
                />
              </>
            ) : null}

            {step === 'confirm' && suggested ? (
              <>
                <Text style={styles.kicker}>BEFORE YOU JOIN</Text>
                <Text style={styles.title}>Are these details right?</Text>
                <Text style={styles.body}>
                  {profileWasSaved
                    ? 'Saved from last time. Confirm them, or edit anything that changed.'
                    : 'Taken from your account. Confirm them, or edit anything that changed.'}
                </Text>
                <View style={styles.summary}>
                  <SummaryRow label="You are" value={SITUATION_LABEL[suggested.situation]} />
                  <SummaryRow label={titleLabel(suggested.situation)} value={suggested.jobTitle || 'Not added'} divided />
                  <SummaryRow label="Interests" value={suggested.interests || 'Not added'} divided />
                </View>
              </>
            ) : null}

            {step === 'edit' ? (
              <>
                <Text style={styles.kicker}>YOUR DETAILS</Text>
                <Text style={styles.title}>How should people meet you?</Text>
                <Text style={styles.body}>We’ll remember this for the next event and ask you to confirm it again.</Text>
                <Text style={styles.fieldLabel}>You are</Text>
                <View style={styles.choices}>
                  {SITUATIONS.map((item) => {
                    const selected = item === situation;
                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setSituation(item)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{SITUATION_LABEL[item]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Field label={titleLabel(situation)} value={jobTitle} placeholder={titlePlaceholder(situation)} onChangeText={setJobTitle} />
                <Field label="Interests" value={interests} placeholder="AI, design systems, startups" onChangeText={setInterests} />
              </>
            ) : null}

            {step === 'presenting' ? (
              <>
                <Text style={styles.kicker}>YOUR SESSION</Text>
                <Text style={styles.title}>Where and when?</Text>
                <Text style={styles.body}>
                  {plan?.role === 'presenting' && plan.room
                    ? 'Confirm the room and time, or edit them.'
                    : 'People looking for your session will use this.'}
                </Text>
                <Field label="Room" value={room} placeholder="Hall B, or Room 204" onChangeText={setRoom} />
                <Field label="Time" value={time} placeholder="Thu 2:00 PM" onChangeText={setTime} />
              </>
            ) : null}

            {step === 'saved' && committed ? (
              <>
                <View style={[styles.swatch, { backgroundColor: event.color, borderColor: event.color }]} />
                <GoingMark date={event.date} />
                <Text style={styles.kicker}>YOU’RE IN</Text>
                <Text style={styles.title}>{event.name}</Text>
                <Text style={styles.body}>
                  {committed.role === 'presenting'
                    ? `Presenting in ${committed.room} · ${committed.time}`
                    : `Attending · ${committed.situation ? SITUATION_LABEL[committed.situation] : 'Details saved'}`}
                </Text>
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {step === 'preview' ? (
              <View style={styles.actions}>
                <Primary label={plan ? 'Update how you’re going' : 'Attend'} onPress={() => { setError(''); setStep('role'); }} />
                <Secondary label="View event" onPress={() => setStep('details')} />
                {plan ? <Secondary label="I'm no longer going" onPress={leave} /> : null}
              </View>
            ) : null}
            {step === 'details' ? (
              <View style={styles.actions}>
                <Primary label={plan ? 'Update how you’re going' : 'Attend'} onPress={() => { setError(''); setStep('role'); }} />
                {plan ? <Secondary label="I'm no longer going" onPress={leave} /> : null}
              </View>
            ) : null}
            {step === 'confirm' ? (
              <View style={styles.actions}>
                <Primary label="This is right" disabled={saving} loading={saving} onPress={() => saveAttendance('attending', suggested ?? undefined)} />
                <Secondary label="Edit details" onPress={() => { setError(''); setStep('edit'); }} />
              </View>
            ) : null}
            {step === 'edit' ? (
              <View style={styles.actions}>
                <Primary label="Save and attend" disabled={saving} loading={saving} onPress={() => saveAttendance('attending', draftProfile())} />
              </View>
            ) : null}
            {step === 'presenting' ? (
              <View style={styles.actions}>
                <Primary
                  label={plan?.role === 'presenting' ? 'Confirm session' : 'Save my session'}
                  disabled={saving}
                  loading={saving}
                  onPress={() => saveAttendance('presenting')}
                />
              </View>
            ) : null}
            {step === 'saved' ? (
              <View style={styles.actions}>
                <Primary label="Done" onPress={onClose} />
              </View>
            ) : null}

            {step === 'preview' ? (
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            ) : null}
          </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function LiveFloor({ eventId }: { eventId: string }) {
  const [people, setPeople] = useState<DirectoryContact[]>(() => peopleAt(eventId));
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim() || !role.trim()) {
      setError('Add a name and what they do.');
      return;
    }
    setError('');
    await createContact({ name, jobTitle: role, eventId });
    setPeople(peopleAt(eventId));
    setName('');
    setRole('');
    setAdding(false);
  };

  return (
    <View style={styles.floor}>
      <Text style={styles.section}>HERE NOW</Text>
      {people.map((person) => (
        <View key={person.id} style={styles.person}>
          <Text style={styles.personName}>{person.name}</Text>
          <Text style={styles.personMeta}>{[person.jobTitle, person.here].filter(Boolean).join(' · ')}</Text>
        </View>
      ))}
      {adding ? (
        <>
          <Field label="Name" value={name} placeholder="Their name" onChangeText={setName} />
          <Field label="What they do" value={role} placeholder="iOS engineer" onChangeText={setRole} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" onPress={save} style={styles.action}>
            <Text style={styles.primaryText}>Save contact</Text>
            <Text style={styles.actionMark}>→</Text>
          </Pressable>
        </>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={styles.action}>
          <Text style={styles.primaryText}>Add a contact</Text>
          <Text style={styles.actionMark}>→</Text>
        </Pressable>
      )}
    </View>
  );
}

function StatusLine({ plan, date }: { plan: EventPlan; date: string }) {
  const detail = plan.role === 'presenting'
    ? `Presenting${plan.room ? ` · ${plan.room}` : ''}${plan.time ? ` · ${plan.time}` : ''}`
    : 'Attending';
  return (
    <View style={styles.goingBlock}>
      <GoingMark date={date} />
      <Text style={styles.status}>{detail}</Text>
    </View>
  );
}

function GoingMark({ date }: { date: string }) {
  return (
    <View style={styles.goingRow}>
      <Text style={styles.check}>✓</Text>
      {isHappening(date) ? <Text style={styles.liveInline}>Live</Text> : <FlipCounter date={date} />}
    </View>
  );
}

function Choice({ title, copy, onPress }: { title: string; copy: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.choice}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <Text style={styles.choiceCopy}>{copy}</Text>
    </Pressable>
  );
}

function SummaryRow({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  return (
    <View style={[styles.summaryRow, divided && styles.summaryDivided]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={theme.faint}
        onChangeText={onChangeText}
        autoCapitalize="sentences"
        style={styles.input}
      />
    </View>
  );
}

function Primary({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}>
      {loading ? <ActivityIndicator color={theme.fg} /> : (
        <>
          <Text style={styles.primaryText}>{label}</Text>
          <Text style={styles.actionMark}>→</Text>
        </>
      )}
    </Pressable>
  );
}

function Secondary({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
      <Text style={styles.secondaryText}>{label}</Text>
      <Text style={styles.actionMark}>→</Text>
    </Pressable>
  );
}

function titlePlaceholder(situation: WorkSituation): string {
  if (situation === 'student') return 'Interaction design';
  if (situation === 'looking') return 'Product designer';
  return 'Product designer';
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,2,9,0.68)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 36 },
  centerStage: { width: '100%', maxWidth: 480, maxHeight: '100%', justifyContent: 'center' },
  sheetFrame: { maxHeight: '100%', borderRadius: 28, borderWidth: 2 },
  sheet: { borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(24,20,36,0.94)' },
  scroll: { padding: 24 },
  handle: { alignSelf: 'flex-end', width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 0, marginBottom: 12 },
  handleMark: { color: theme.muted, fontSize: 19, lineHeight: 27, textAlign: 'center' },
  backRow: { alignSelf: 'flex-start', marginBottom: 8, marginTop: 6 },
  backText: { color: theme.muted, fontSize: 13, fontWeight: '400', letterSpacing: 0.4 },
  swatch: { width: 36, height: 36, borderRadius: 18, marginTop: 10, marginBottom: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.7)' },
  kicker: { color: theme.muted, fontWeight: '500', fontSize: 10, letterSpacing: 1.8, marginTop: 6 },
  title: { color: theme.fg, fontSize: 32, lineHeight: 36, fontWeight: '300', letterSpacing: -0.6, marginTop: 8 },
  meta: { color: theme.fg, fontSize: 15, fontWeight: '300', marginTop: 10 },
  topic: { color: theme.muted, fontSize: 14, marginTop: 4 },
  liveTag: { color: '#8fd18a', fontSize: 12, fontWeight: '500', letterSpacing: 1.2, marginTop: 12 },
  liveInline: { color: '#8fd18a', fontSize: 13, fontWeight: '500', letterSpacing: 1.1, textTransform: 'uppercase' },
  floor: { marginTop: 8 },
  person: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  personName: { color: theme.fg, fontSize: 16, fontWeight: '300' },
  personMeta: { color: theme.muted, fontSize: 13, marginTop: 3 },
  goingBlock: { marginTop: 16 },
  goingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: { color: '#6FCF97', fontSize: 18, fontWeight: '600', lineHeight: 22 },
  status: { color: theme.fg, fontSize: 14, fontWeight: '400', marginTop: 8 },
  body: { color: theme.muted, fontSize: 15, lineHeight: 22, marginTop: 14 },
  section: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.6, marginTop: 22, marginBottom: 8 },
  highlight: { color: theme.fg, fontSize: 15, lineHeight: 24, fontWeight: '300' },
  choice: { paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line, marginTop: 4 },
  choiceTitle: { color: theme.fg, fontSize: 18, fontWeight: '300' },
  choiceCopy: { color: theme.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  summary: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  summaryRow: { paddingVertical: 14 },
  summaryDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  summaryLabel: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.4, textTransform: 'uppercase' },
  summaryValue: { color: theme.fg, fontSize: 18, fontWeight: '300', marginTop: 4 },
  fieldLabel: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6, marginTop: 20 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line, paddingBottom: 8 },
  chip: { paddingVertical: 8 },
  chipSelected: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.fg },
  chipText: { color: theme.faint, fontSize: 15, fontWeight: '400' },
  chipTextSelected: { color: theme.fg },
  input: { minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.lineStrong, paddingHorizontal: 0, color: theme.fg, fontSize: 18, fontWeight: '300' },
  error: { color: theme.danger, fontSize: 14, lineHeight: 20, marginTop: 16 },
  actions: { marginTop: 28, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line },
  action: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
  primaryText: { color: theme.fg, fontSize: 16, fontWeight: '400' },
  secondaryText: { color: theme.muted, fontSize: 16, fontWeight: '400' },
  actionMark: { color: theme.fg, fontSize: 16, fontWeight: '300' },
  disabled: { opacity: 0.45 },
  closeButton: { alignItems: 'flex-start', paddingTop: 16, paddingBottom: 4 },
  closeText: { color: theme.muted, fontSize: 14 },
});
