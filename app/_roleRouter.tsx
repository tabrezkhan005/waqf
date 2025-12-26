import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

export default function RoleRouter() {
  const { profile, loading, session } = useAuth();

  console.log('RoleRouter - Loading:', loading, 'Profile:', profile?.role, 'Session:', !!session);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#003D99" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!profile || !session) {
    console.log('RoleRouter - No profile or session, redirecting to auth');
    return <Redirect href="/auth" />;
  }

  // Route based on role using Redirect
  console.log('RoleRouter - Routing to:', profile.role);
  switch (profile.role) {
    case 'admin':
      // Redirect to admin tabs - the first tab (home) will be shown by default
      return <Redirect href="/admin" />;
    case 'inspector':
      return <Redirect href="/inspector/dashboard" />;
    case 'accounts':
      return <Redirect href="/accounts/dashboard" />;
    case 'reports':
      return <Redirect href="/reports/overview" />;
    default:
      console.error('RoleRouter - Invalid role:', profile.role);
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>Invalid role: {profile.role}. Please contact administrator.</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    textAlign: 'center',
    padding: 20,
  },
});
