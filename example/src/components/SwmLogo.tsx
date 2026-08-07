import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import logo from '../../assets/svg/swm.svg';

export const SwmLogo = () => (
  <Image source={logo} style={styles.logo} contentFit="contain" />
);

const styles = StyleSheet.create({
  logo: {
    width: 60,
    height: '100%',
  },
});
