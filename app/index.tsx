import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import SplashScreenComponent from '@/components/SplashScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_GET_STARTED_KEY = 'has_seen_get_started';

export default function Index() {
  const router = useRouter();
  const [splashFinished, setSplashFinished] = useState(false);
  const [hasSeenGetStarted, setHasSeenGetStarted] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has seen get started screen
    AsyncStorage.getItem(HAS_SEEN_GET_STARTED_KEY).then((value) => {
      setHasSeenGetStarted(value === 'true');
    });
  }, []);

  useEffect(() => {
    if (splashFinished && hasSeenGetStarted !== null) {
      // Navigate to get-started screen first (we'll handle auth there)
      // For now, just show get-started after splash
      const timer = setTimeout(() => {
        router.replace('/get-started');
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [splashFinished, hasSeenGetStarted, router]);

  // Show splash screen first
  if (!splashFinished) {
    return (
      <SplashScreenComponent
        onFinish={() => setSplashFinished(true)}
        duration={2500}
      />
    );
  }

  // Show loading while checking or navigating
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
