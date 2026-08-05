import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { isARAvailable, openAR } from 'react-native-ar-preview';

const MODEL = {
  usdz: 'https://developer.apple.com/augmented-reality/quick-look/models/retrotv/tv_retro.usdz',
  glb: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
};

const App = () => {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    isARAvailable().then(setAvailable);
  }, []);

  const handleOpen = () => {
    openAR(MODEL).catch((error: Error & { code?: string }) => {
      Alert.alert(error.code ?? 'Error', error.message);
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>react-native-ar-preview</Text>
      <Text style={styles.status}>
        {available === null
          ? 'Checking AR availability…'
          : available
            ? 'AR is available on this device'
            : 'AR is not available on this device'}
      </Text>
      <Pressable style={styles.button} onPress={handleOpen}>
        <Text style={styles.buttonLabel}>View in AR</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    color: '#555',
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
