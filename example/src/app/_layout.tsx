import { Stack } from 'expo-router';

const RootLayout = () => (
  <Stack
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#ffffff' },
    }}
  />
);

export default RootLayout;
