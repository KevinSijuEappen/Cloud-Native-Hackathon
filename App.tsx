import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Companion</Text>
      <Text style={styles.message}>Your cross-platform device app starts here.</Text>
      <Text style={styles.detail}>Bluetooth discovery and device controls will be added next.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#101827' },
  title: { color: '#f8fafc', fontSize: 28, fontWeight: '700', marginBottom: 12 },
  message: { color: '#cbd5e1', fontSize: 17, textAlign: 'center' },
  detail: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 12 }
});
