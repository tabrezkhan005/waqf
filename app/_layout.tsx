import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { AuthProvider } from '@/contexts/AuthContext';
import { DialogProvider } from '@/contexts/DialogContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash visible while loading fonts
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Nunito-Regular': require('@/assets/fonts/nunito/Nunito-Regular.ttf'),
          'Nunito-Light': require('@/assets/fonts/nunito/Nunito-Light.ttf'),
          'Nunito-Medium': require('@/assets/fonts/nunito/Nunito-Medium.ttf'),
          'Nunito-SemiBold': require('@/assets/fonts/nunito/Nunito-SemiBold.ttf'),
          'Nunito-Bold': require('@/assets/fonts/nunito/Nunito-Bold.ttf'),
          'Lato-Regular': require('@/assets/fonts/lato/Lato-Regular.ttf'),
          'Lato-Light': require('@/assets/fonts/lato/Lato-Light.ttf'),
          'Lato-Bold': require('@/assets/fonts/lato/Lato-Bold.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue even if fonts fail
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null; // Splash screen is handled by app/index.tsx
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="get-started" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="_roleRouter" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="inspector" />
        <Stack.Screen name="accounts" />
        <Stack.Screen name="reports" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DialogProvider>
        <NotificationProvider>
          <RootLayoutNav />
        </NotificationProvider>
      </DialogProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
