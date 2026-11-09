import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export function LoginScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>BLUETOOTH COMPANION</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to connect and manage your devices.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#748198"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          autoComplete="password"
          placeholder="Enter your password"
          placeholderTextColor="#748198"
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity accessibilityRole="button" onPress={onContinue} style={styles.button}>
          <Text style={styles.buttonText}>Sign in</Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" onPress={() => {}} style={styles.linkButton}>
          <Text style={styles.link}>Create an account</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.footer}>Authentication is a placeholder for now.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', backgroundColor: '#101827', paddingHorizontal: 24, paddingVertical: 32 },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  eyebrow: { color: '#65d6ad', fontSize: 12, fontWeight: '700', letterSpacing: 1.6, marginBottom: 16 },
  title: { color: '#f8fafc', fontSize: 32, fontWeight: '700' },
  subtitle: { color: '#a8b4c7', fontSize: 16, lineHeight: 24, marginTop: 8, marginBottom: 32 },
  label: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { height: 52, borderWidth: 1, borderColor: '#344258', borderRadius: 12, paddingHorizontal: 15, color: '#f8fafc', backgroundColor: '#182437', fontSize: 16 },
  button: { height: 52, borderRadius: 12, backgroundColor: '#65d6ad', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  buttonText: { color: '#10251f', fontSize: 16, fontWeight: '700' },
  linkButton: { alignItems: 'center', padding: 16, marginTop: 4 },
  link: { color: '#8de6c5', fontSize: 15, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 22, alignSelf: 'center', color: '#748198', fontSize: 12 }
});
