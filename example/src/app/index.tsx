import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { isARAvailable, openAR, type ErrorCode } from 'react-native-ar-preview';

const MODEL = {
  usdz: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz',
  glb: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
};

const Index = () => {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    isARAvailable().then(setAvailable);
  }, []);

  const handleOpenAR = () => {
    openAR(MODEL).catch((error: Error & { code?: ErrorCode }) => {
      Alert.alert('AR error', `${error.code ?? 'unknown'}: ${error.message}`);
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        AR available:{' '}
        {available === null ? 'checking…' : available ? 'yes' : 'no'}
      </Text>
      <Pressable style={styles.button} onPress={handleOpenAR}>
        <Text style={styles.buttonLabel}>View in AR</Text>
      </Pressable>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  status: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
