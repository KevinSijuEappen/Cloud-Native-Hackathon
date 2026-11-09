import { AuthView } from '@clerk/expo/native-components';
import { StyleSheet, View } from 'react-native';
import { Logo } from '../../../components/Logo';

export function LoginScreen() {
  return (
    <View style={styles.screen}>
      <AuthView isDismissible={false} logo={<AuthLogo />} />
    </View>
  );
}

function AuthLogo() {
  return (
    <View style={styles.logo}>
      <Logo size={120} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080d1a' },
  logo: { alignItems: 'center', paddingBottom: 8 },
});
