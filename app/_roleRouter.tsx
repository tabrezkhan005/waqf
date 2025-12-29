import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { theme } from '@/lib/theme';
import React from 'react';

export default function RoleRouter() {
  const { profile, loading, session } = useAuth();

  console.log('RoleRouter - Loading:', loading, 'Profile:', profile?.role, 'Session:', !!session, 'Profile ID:', profile?.id);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If no session, redirect to auth
  if (!session) {
    console.log('RoleRouter - No session, redirecting to auth');
    return <Redirect href="/auth" />;
  }

  // If session exists but profile is still loading, wait a bit with timeout
  const [profileTimeout, setProfileTimeout] = React.useState(false);

  React.useEffect(() => {
    if (session && !profile && !loading) {
      const timer = setTimeout(() => {
        setProfileTimeout(true);
      }, 5000); // Wait 5 seconds for profile to load
      return () => clearTimeout(timer);
    } else {
      setProfileTimeout(false);
    }
  }, [session, profile, loading]);

  if (session && !profile && !loading && !profileTimeout) {
    console.log('RoleRouter - Session exists but profile not loaded yet, waiting...');
    // Give it a moment to load the profile - AuthContext should load it
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // If we have session but no profile after timeout, try to proceed anyway
  // The profile might load later, or there might be a database issue
  if (session && !profile && profileTimeout) {
    console.warn('RoleRouter - Profile loading timeout, but session exists. Attempting to proceed...');
    // Try to redirect to admin anyway - the admin layout will handle it
    // This prevents infinite loading
    return <Redirect href="/admin" />;
  }

  // Route based on role using Redirect
  if (profile && profile.role) {
    console.log('RoleRouter - Routing to:', profile.role);
    console.log('RoleRouter - Profile details:', { role: profile.role, id: profile.id });

    switch (profile.role) {
      case 'admin':
        // Redirect to admin tabs - the first tab (home) will be shown by default
        console.log('RoleRouter - Redirecting to /admin');
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

  // Fallback - should not reach here
  console.error('RoleRouter - Unexpected state, redirecting to auth');
  return <Redirect href="/auth" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    textAlign: 'center',
    padding: 20,
  },
});
