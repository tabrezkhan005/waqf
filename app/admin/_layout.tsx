import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
  const { loading, profile, session } = useAuth();
  const insets = useSafeAreaInsets();
  const [profileLoadTimeout, setProfileLoadTimeout] = React.useState(false);

  // Set timeout for profile loading
  React.useEffect(() => {
    if (session && !profile && !loading) {
      const timer = setTimeout(() => {
        setProfileLoadTimeout(true);
      }, 3000); // Wait 3 seconds for profile to load
      return () => clearTimeout(timer);
    } else {
      setProfileLoadTimeout(false);
    }
  }, [session, profile, loading]);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A7E43" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  // If no session, redirect will be handled by role router
  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A7E43" />
        <Text style={styles.loadingText}>Authenticating...</Text>
      </View>
    );
  }

  // If session exists but profile is null, wait a moment for it to load
  // But don't block forever - allow access after timeout
  if (session && !profile && !profileLoadTimeout) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A7E43" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Verify role is admin (only if profile exists)
  if (profile && profile.role !== 'admin') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Access denied. Admin role required.</Text>
      </View>
    );
  }

  // If we have session but no profile after timeout, still allow access
  // The profile might load later, or the user might need to contact admin
  // This prevents infinite loading screens

  const baseTabBarHeight = Platform.OS === 'ios' ? 60 : 56;
  const tabBarHeight = baseTabBarHeight + (insets.bottom > 0 ? insets.bottom : 0);
  const tabBarBackgroundColor = Platform.OS === 'ios' ? '#FFFFFF' : theme.colors.surface;

  return (
    <View style={[styles.container, { backgroundColor: tabBarBackgroundColor }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: '#94A3B8',
          tabBarStyle: {
            backgroundColor: tabBarBackgroundColor,
            borderTopWidth: 0,
            height: tabBarHeight,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 12,
            paddingHorizontal: 8,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              },
              android: {
                elevation: 12,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              },
            }),
          },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Nunito-SemiBold',
          marginTop: 4,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
      >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={focused ? size + 2 : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="inspectors-institutions"
        options={{
          title: 'Inspectors',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={focused ? size + 2 : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'cash' : 'cash-outline'}
              size={focused ? size + 2 : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              size={focused ? size + 2 : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={focused ? size + 2 : size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: theme.colors.muted,
  },
});
