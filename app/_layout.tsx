import { Stack } from 'expo-router';
import { ThemeProvider } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
