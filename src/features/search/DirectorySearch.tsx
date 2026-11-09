import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../../theme';
import { localHits, searchDirectory, type DirectoryContact, type SearchHit } from './client';

export function DirectorySearch({
  query,
  onQuery,
  onSelectEvent,
}: {
  query: string;
  onQuery: (value: string) => void;
  onSelectEvent: (id: string) => void;
}) {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [note, setNote] = useState('');
  const [contact, setContact] = useState<DirectoryContact | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) {
      setHits([]);
      setNote('');
      return;
    }
    setHits(localHits(trimmed));
    setNote('');
    let cancelled = false;
    const timer = setTimeout(() => {
      searchDirectory(trimmed)
        .then((next) => {
          if (cancelled) return;
          setHits(next);
          setNote('');
        })
        .catch(() => {
          if (!cancelled) setNote('Showing matches saved in the app. Cloud search did not answer.');
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  return (
    <View style={trimmed ? styles.fill : undefined}>
      <TextInput
        value={query}
        onChangeText={onQuery}
        placeholder="Search events or contacts"
        placeholderTextColor={theme.faint}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {trimmed ? (
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.results}>
          {note ? <Text style={styles.status}>{note}</Text> : null}
          {hits.length === 0 ? <Text style={styles.status}>Nothing matches.</Text> : null}
          {hits.map((hit) => (
            <Pressable
              key={`${hit.kind}-${hit.id}`}
              accessibilityRole="button"
              onPress={() => {
                if (hit.kind === 'event') onSelectEvent(hit.id);
                else setContact(hit);
              }}
              style={styles.row}
            >
              <Text style={styles.kind}>{hit.kind === 'event' ? 'EVENT' : 'CONTACT'}</Text>
              <Text style={styles.name}>{hit.name}</Text>
              <Text style={styles.detail}>{detail(hit)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {contact ? (
        <View style={styles.sheetScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setContact(null)} />
          <View style={styles.sheet}>
            <Text style={styles.kind}>CONTACT</Text>
            <Text style={styles.sheetName}>{contact.name}</Text>
            <Text style={styles.detail}>{[contact.jobTitle, contact.company].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.sheetBody}>{contact.interests}</Text>
            <Pressable accessibilityRole="button" onPress={() => setContact(null)} style={styles.done}>
              <Text style={styles.doneText}>Close</Text>
              <Text style={styles.doneText}>→</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function detail(hit: SearchHit): string {
  if (hit.kind === 'event') return [hit.place, hit.topic].filter(Boolean).join(' · ');
  return [hit.jobTitle, hit.company].filter(Boolean).join(' · ');
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  input: {
    minHeight: 44,
    marginTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.lineStrong,
    color: theme.fg,
    fontSize: 18,
    fontWeight: '300',
    paddingHorizontal: 0,
  },
  results: { flex: 1, marginTop: 8 },
  status: { color: theme.muted, fontSize: 14, lineHeight: 20, marginTop: 18 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line },
  kind: { color: theme.faint, fontSize: 10, fontWeight: '500', letterSpacing: 1.5 },
  name: { color: theme.fg, fontSize: 18, fontWeight: '300', marginTop: 4 },
  detail: { color: theme.muted, fontSize: 13, marginTop: 4 },
  sheetScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.lineStrong, padding: 24, paddingBottom: 32 },
  sheetName: { color: theme.fg, fontSize: 32, fontWeight: '300', letterSpacing: -0.6, marginTop: 8 },
  sheetBody: { color: theme.muted, fontSize: 15, lineHeight: 22, marginTop: 14 },
  done: { minHeight: 54, marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doneText: { color: theme.fg, fontSize: 16, fontWeight: '400' },
});
