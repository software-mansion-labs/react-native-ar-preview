import { Alert, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openAR, type ErrorCode } from 'react-native-ar-preview';

import { ModelCard } from '../components/ModelCard';
import { SwmLogo } from '../components/SwmLogo';
import { MONO } from '../consts';
import { MODEL } from '../models';

const Index = () => {
  const insets = useSafeAreaInsets();

  const handleOpenAR = () => {
    openAR(MODEL.source).catch((error: Error & { code?: ErrorCode }) => {
      Alert.alert('AR error', `${error.code ?? 'unknown'}: ${error.message}`);
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <SwmLogo />
        <View>
          <Text style={styles.title}>AR Preview</Text>
          <Text style={styles.subtitle}>react-native-ar-preview</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.content}>
        <ModelCard model={MODEL} onPress={handleOpenAR} />
      </View>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111111',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: MONO,
    color: '#6e6e6e',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e7e7e7',
    marginHorizontal: -20,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
});
