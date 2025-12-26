import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { AppState, AppStateStatus } from 'react-native';
// Device binding removed during development - will be added later
import type { Profile, Role } from '../lib/types/database';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateActivity: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Activity tracking for inactivity timeout
  const lastActivityTime = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);

  // 3 minutes in milliseconds
  const INACTIVITY_TIMEOUT = 3 * 60 * 1000;

  // Fetch user profile from database
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, district_id, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // If it's a schema error, try without .single() first
        if (error.message?.includes('schema') || error.code === 'PGRST116') {
          const { data: dataArray, error: arrayError } = await supabase
            .from('profiles')
            .select('id, full_name, role, district_id, created_at')
            .eq('id', userId)
            .limit(1);

          if (arrayError) {
            console.error('Error fetching profile (array):', arrayError);
            return null;
          }

          return dataArray && dataArray.length > 0 ? (dataArray[0] as Profile) : null;
        }
        return null;
      }

      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile (catch):', error);
      return null;
    }
  };

  // Sign in (device binding disabled during development)
  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      setLoading(true);

      // Sign in with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setLoading(false);
        return { error: authError };
      }

      if (!data.user) {
        setLoading(false);
        return { error: new Error('No user returned from authentication') };
      }

      // Fetch profile after successful authentication
      const userProfile = await fetchProfile(data.user.id);
      if (userProfile) {
        setProfile(userProfile);
        // Also set session and user immediately
        setSession(data.session);
        setUser(data.user);
        lastActivityTime.current = Date.now();
        setLoading(false);
        console.log('Sign in successful - Profile loaded:', userProfile.role);
      } else {
        setLoading(false);
        console.error('Failed to fetch profile after login');
        return { error: new Error('Failed to load user profile') };
      }

      return { error: null };
    } catch (error) {
      setLoading(false);
      console.error('Sign in error:', error);
      return { error: error instanceof Error ? error : new Error('Unknown error during sign in') };
    }
  };

  // Sign out
  const signOut = React.useCallback(async (): Promise<void> => {
    try {
      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      lastActivityTime.current = Date.now();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  // Check inactivity and log out if needed
  const checkInactivity = React.useCallback(() => {
    // Use refs to avoid dependency issues
    const currentSession = session;
    const currentUser = user;

    if (!currentSession || !currentUser) {
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime.current;

    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
      console.log('User inactive for 3+ minutes, logging out...');
      signOut();
    } else {
      // Schedule next check
      const remainingTime = INACTIVITY_TIMEOUT - timeSinceLastActivity;
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(checkInactivity, remainingTime);
    }
  }, [session, user, signOut]);

  // Update last activity time and restart inactivity timer
  const updateActivity = React.useCallback(() => {
    if (!session || !user) {
      return;
    }
    lastActivityTime.current = Date.now();
    backgroundTimeRef.current = null;
    // Restart inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(checkInactivity, INACTIVITY_TIMEOUT);
  }, [session, user, checkInactivity]);

  // Refresh profile
  const refreshProfile = async (): Promise<void> => {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then((profile) => {
          if (profile) {
            setProfile(profile);
          }
        });
        lastActivityTime.current = Date.now();
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignore TOKEN_REFRESHED events - they don't indicate a real auth state change
      if (event === 'TOKEN_REFRESHED') {
        // Only update session silently without triggering state changes or profile refetch
        if (session) {
          setSession(session);
          // Update activity time on token refresh (inline to avoid closure issues)
          lastActivityTime.current = Date.now();
          backgroundTimeRef.current = null;
        }
        return;
      }

      console.log('Auth state changed:', event, 'Session:', !!session);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id);
        if (userProfile) {
          setProfile(userProfile);
          console.log('Profile loaded from auth state change:', userProfile.role);
        }
        lastActivityTime.current = Date.now();
      } else {
        setProfile(null);
        // Clear inactivity timer on logout
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
      }

      setLoading(false);
    });

    // Monitor app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (backgroundTimeRef.current) {
          const timeInBackground = Date.now() - backgroundTimeRef.current;
          if (timeInBackground >= INACTIVITY_TIMEOUT) {
            // User was in background for 3+ minutes, log them out
            console.log('App was in background for 3+ minutes, logging out...');
            signOut();
          } else {
            // Update activity time and continue
            updateActivity();
          }
          backgroundTimeRef.current = null;
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        backgroundTimeRef.current = Date.now();
      }
      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // Separate effect to manage inactivity timer based on session/user
  useEffect(() => {
    if (session && user) {
      // Start inactivity timer when user is logged in
      checkInactivity();
    } else {
      // Clear timer when logged out
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [session, user, checkInactivity]);

  const value: AuthContextType = {
    session,
    user,
    profile,
    loading,
    signIn,
    signOut,
    refreshProfile,
    updateActivity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
