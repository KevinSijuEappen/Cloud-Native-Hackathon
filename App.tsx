import { ClerkProvider, useAuth, useSession, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Logo } from './src/components/Logo';
import { theme } from './src/theme';
import { JourneyScreen } from './src/features/journey/screens/JourneyScreen';
import { LoginScreen } from './src/features/login/screens/LoginScreen';
import { readContactProfile, type ContactProfile } from './src/features/welcome/profile';
import { WelcomeScreen } from './src/features/welcome/screens/WelcomeScreen';

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
  const { user, isLoaded: userLoaded } = useUser();
  const [completedProfile, setCompletedProfile] = useState<ContactProfile | null>(null);
  const signedIn = session?.status === 'active';
  const profile = completedProfile ?? (signedIn ? readContactProfile(user?.unsafeMetadata) : null);

  if (!isLoaded || (signedIn && !userLoaded)) {
    return (
      <View style={styles.boot}>
        <Logo size={140} />
        <ActivityIndicator color={theme.fg} />
      </View>
    );
  }

  if (!signedIn) {
    return <LoginScreen />;
  }

  if (!profile) {
    return <WelcomeScreen onComplete={setCompletedProfile} />;
  }

  return <JourneyScreen />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
    backgroundColor: theme.bg,
  },
  bootTitle: { color: theme.fg, fontSize: 32, fontWeight: '300', letterSpacing: -0.4 },
  bootCopy: { color: theme.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
