import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { FORMAT, MONO, VIEWER } from '../consts';
import type { ExampleModel } from '../models';

const SPECS = [
  { label: 'Format', value: FORMAT },
  { label: 'Viewer', value: VIEWER },
];

type ModelCardProps = {
  model: ExampleModel;
  onPress: () => void;
};

export const ModelCard = ({ model, onPress }: ModelCardProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
  >
    <View style={styles.row}>
      <Image
        source={model.image}
        style={styles.image}
        contentFit="contain"
        transition={150}
        accessibilityLabel={`${model.name} preview`}
      />
      <View style={styles.body}>
        <View>
          <Text style={styles.microLabel}>Model</Text>
          <Text style={styles.modelName}>{model.name}</Text>
        </View>
        <View>
          {SPECS.map((spec, index) => (
            <View key={spec.label}>
              {index > 0 && <View style={styles.specDivider} />}
              <Text style={styles.specLabel}>{spec.label}</Text>
              <Text style={styles.specValue}>{spec.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
    <View style={styles.action}>
      <Text style={styles.actionLabel}>Tap to open in AR</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e7e7e7',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.75,
  },
  row: {
    flexDirection: 'row',
  },
  image: {
    width: 150,
    backgroundColor: '#ededed',
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 32,
    padding: 18,
  },
  microLabel: {
    fontSize: 10,
    fontFamily: MONO,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#6e6e6e',
  },
  modelName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginTop: 4,
  },
  specDivider: {
    height: 1,
    backgroundColor: '#ececec',
    marginVertical: 10,
  },
  specLabel: {
    fontSize: 9,
    fontFamily: MONO,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#6e6e6e',
  },
  specValue: {
    fontSize: 12,
    fontFamily: MONO,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#111111',
    marginTop: 3,
  },
  action: {
    borderTopWidth: 1,
    borderTopColor: '#e7e7e7',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  actionLabel: {
    fontSize: 10,
    fontFamily: MONO,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#111111',
  },
});
