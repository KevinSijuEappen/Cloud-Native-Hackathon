import { ClerkProvider, useAuth, useSession } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Logo } from './src/components/Logo';
import { JourneyScreen } from './src/features/journey/screens/JourneyScreen';
import { LoginScreen } from './src/features/login/screens/LoginScreen';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function App() {
  if (!publishableKey) {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <Logo size={140} />
        <Text style={styles.bootTitle}>Convergence</Text>
        <Text style={styles.bootCopy}>
          Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to a .env file in the project root, then restart the app.
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <StatusBar style="light" />
      <Root />
    </ClerkProvider>
  );
}

function Root() {
  const { isLoaded } = useAuth({ treatPendingAsSignedOut: false });
  const { session } = useSession();

  if (!isLoaded) {
    return (
      <View style={styles.boot}>
        <Logo size={140} />
        <ActivityIndicator color="#c084fc" />
      </View>
    );
  }

  if (session?.status === 'active') {
    return <JourneyScreen />;
  }

  return <LoginScreen />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
    backgroundColor: '#080d1a',
  },
  bootTitle: { color: '#f4f7fb', fontSize: 28, fontWeight: '700' },
  bootCopy: { color: '#9baac3', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
