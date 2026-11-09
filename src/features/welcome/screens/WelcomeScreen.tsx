import { useUser } from '@clerk/expo';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Hairlines } from '../../../components/Hairlines';
import { Logo } from '../../../components/Logo';
import { theme } from '../../../theme';
import { EMPTY_PROFILE, type ContactProfile } from '../profile';

export function WelcomeScreen({ onComplete }: { onComplete: (profile: ContactProfile) => void }) {
  const { user } = useUser();
  const [profile, setProfile] = useState<ContactProfile>(EMPTY_PROFILE);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (field: keyof ContactProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!profile.jobTitle.trim() || !profile.company.trim() || !profile.interests.trim()) {
      setError('Add your job title, company or student status, and interests.');
      return;
    }
    if (!user) {
      setError('Sign in again before saving your details.');
      return;
    }

    const next = { ...profile, welcomeComplete: true };
    setSaving(true);
    setError('');
    try {
      await user.updateMetadata({ unsafeMetadata: { contactProfile: next } });
      onComplete(next);
    } catch {
      setError('Could not save your details. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <Hairlines />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandGroup}>
          <Logo size={36} />
          <Text style={styles.brand}>CONVERGENCE</Text>
        </View>
        <Text style={styles.eyebrow}>YOUR PROFILE</Text>
        <Text style={styles.heading}>Make it easier to connect.</Text>
        <Text style={styles.copy}>Add a little context so people you meet at events know what you do and what you’re into.</Text>

        <Field label="Job title" value={profile.jobTitle} placeholder="Product designer" onChangeText={(value) => setField('jobTitle', value)} />
        <Field label="Company or student" value={profile.company} placeholder="Northwind, or your school" onChangeText={(value) => setField('company', value)} />
        <Field label="Interests" value={profile.interests} placeholder="AI, design systems, startups" onChangeText={(value) => setField('interests', value)} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={[styles.button, saving && styles.buttonDisabled]}>
          {saving ? <ActivityIndicator color={theme.fg} /> : (
            <>
              <Text style={styles.buttonText}>Save and explore</Text>
              <Text style={styles.buttonMark}>→</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
      <Text style={styles.label}>{label}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 24, paddingTop: (StatusBar.currentHeight ?? 0) + 28, paddingBottom: 40 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { color: theme.fg, fontSize: 11, fontWeight: '500', letterSpacing: 1.8 },
  heading: { color: theme.fg, fontSize: 36, lineHeight: 40, fontWeight: '300', letterSpacing: -0.8, marginTop: 36 },
  eyebrow: { color: '#B9A6FF', fontSize: 10, fontWeight: '600', letterSpacing: 1.8, marginTop: 34 },
  copy: { color: theme.muted, fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 8 },
  label: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6, marginTop: 26 },
  input: { minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.lineStrong, paddingHorizontal: 0, color: theme.fg, fontSize: 18, fontWeight: '300' },
  error: { color: theme.danger, fontSize: 14, lineHeight: 20, marginTop: 16 },
  button: { minHeight: 56, marginTop: 36, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: theme.fg, fontSize: 16, fontWeight: '400' },
  buttonMark: { color: theme.fg, fontSize: 16, fontWeight: '300' },
});
