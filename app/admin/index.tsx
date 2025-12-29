import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function AdminIndex() {
  const { loading, profile, session } = useAuth();

  console.log('AdminIndex - Loading:', loading, 'Profile:', profile?.role, 'Session:', !!session);

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0A7E43" />
      </View>
    );
  }

  // Redirect to home dashboard
  console.log('AdminIndex - Redirecting to /admin/home');
  return <Redirect href="/admin/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
