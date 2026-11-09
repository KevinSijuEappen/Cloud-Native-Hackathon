import { StatusBar } from 'expo-status-bar';
import { LoginScreen } from './src/features/login/screens/LoginScreen';
import { JourneyScreen } from './src/features/journey/screens/JourneyScreen';
import { useState } from 'react';

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  return <>{signedIn ? <JourneyScreen /> : <LoginScreen onContinue={() => setSignedIn(true)} />}<StatusBar style="light" /></>;
}
