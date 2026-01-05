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

  // Activity tracking for background inactivity timeout
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  const backgroundTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 3 minutes in milliseconds
  const INACTIVITY_TIMEOUT = 3 * 60 * 1000;

  // Fetch user profile from database
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      if (!userId) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, district_id, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        // Safely log error without causing console errors
        const errorInfo = {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        };

        // Only log if it's not a "no rows" error (which is expected for new users)
        // Error logging removed for performance

        // If it's a "no rows" error, try without .single()
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          const { data: dataArray, error: arrayError } = await supabase
            .from('profiles')
            .select('id, full_name, role, district_id, created_at')
            .eq('id', userId)
            .limit(1);

          if (arrayError) {
            // Only log if it's a real error, not "no rows"
            // Error logging removed for performance
            return null;
          }

          if (dataArray && dataArray.length > 0) {
            return dataArray[0] as Profile;
          }
          return null;
        }
        return null;
      }

      if (data) {
        return data as Profile;
      }

      return null;
    } catch (error: any) {
      // Safely handle caught errors
      // Error logging removed for performance
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

      // Set session and user immediately
      setSession(data.session);
      setUser(data.user);

      // Fetch profile after successful authentication
      // Try multiple times with retries (profile might be created by a trigger)
      let retries = 0;
      const maxRetries = 3;
      let userProfile: Profile | null = null;

      while (retries < maxRetries && !userProfile) {
        try {
          userProfile = await fetchProfile(data.user.id);
          if (userProfile) {
            setProfile(userProfile);
            backgroundTimeRef.current = null;
            setLoading(false);
            break;
          } else {
            retries++;
            if (retries < maxRetries) {
              // Error logging removed for performance
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
          }
        } catch (error) {
          retries++;
          // Error logging removed for performance
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }

      if (!userProfile) {
        setLoading(false);
        // Don't return error - let onAuthStateChange handle it
        // The profile might be created by a trigger or needs to be created manually
        // The auth screen will show "waiting for profile" and onAuthStateChange will retry
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

      // Clear background timer
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
      backgroundTimeRef.current = null;


      await supabase.auth.signOut();

      setSession(null);
      setUser(null);
      setProfile(null);

    } catch (error) {

      console.error('Sign out error:', error);
    }
  }, [session, profile]);

  // Check background inactivity and log out if needed
  const checkBackgroundInactivity = React.useCallback(() => {
    if (!session || !user) {
      return;
    }

    // Only check if app is in background
    if (appStateRef.current === 'active') {
      // App is in foreground, don't logout
      return;
    }

    // App is in background, check time
    if (backgroundTimeRef.current) {
      const timeInBackground = Date.now() - backgroundTimeRef.current;
      if (timeInBackground >= INACTIVITY_TIMEOUT) {
        signOut();
      }
    }
  }, [session, user, signOut]);

  // Update activity - only resets background timer when app comes to foreground
  const updateActivity = React.useCallback(() => {
    // This function is called when app comes to foreground
    // Reset background time tracking
    if (appStateRef.current === 'active') {
      backgroundTimeRef.current = null;
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
    }
  }, []);

  // Refresh profile
  const refreshProfile = async (): Promise<void> => {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id);
          if (mounted && profile) {
            setProfile(profile);
            } else if (mounted) {
            setProfile(null);
          }
        } catch (error) {
          if (mounted) {
            setProfile(null);
          }
        }
        backgroundTimeRef.current = null;
      } else {
        setProfile(null);
      }

      if (mounted) {
        setLoading(false);
      }
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
            // Don't reset background timer on token refresh - only on app state change
          }
          return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Always try to fetch profile on auth state change
        // Try multiple times with delays
        let retries = 0;
        const maxRetries = 5;
        let userProfile: Profile | null = null;

        while (retries < maxRetries && !userProfile) {
          try {
            userProfile = await fetchProfile(session.user.id);
            if (userProfile) {
              setProfile(userProfile);
              break;
            } else {
              retries++;
              if (retries < maxRetries) {
                // Error logging removed for performance
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          } catch (error) {
            retries++;
            // Error logging removed for performance
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (!userProfile) {
          // Don't set to null - keep existing profile if any, or let it be null
        }
        backgroundTimeRef.current = null;
      } else {
        setProfile(null);
        // Clear background timer on logout
        if (backgroundTimerRef.current) {
          clearTimeout(backgroundTimerRef.current);
          backgroundTimerRef.current = null;
        }
        backgroundTimeRef.current = null;
      }

      setLoading(false);
    });

    // Monitor app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (backgroundTimeRef.current && session && user) {
          const timeInBackground = Date.now() - backgroundTimeRef.current;
          if (timeInBackground >= INACTIVITY_TIMEOUT) {
            // User was in background for 3+ minutes, log them out
            signOut();
          } else {
            // Reset background timer since app is now active
            backgroundTimeRef.current = null;
            if (backgroundTimerRef.current) {
              clearTimeout(backgroundTimerRef.current);
              backgroundTimerRef.current = null;
            }
          }
        } else {
          // No background time tracked, just reset
          backgroundTimeRef.current = null;
          if (backgroundTimerRef.current) {
            clearTimeout(backgroundTimerRef.current);
            backgroundTimerRef.current = null;
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - start tracking background time
        if (session && user) {
          backgroundTimeRef.current = Date.now();
          // Set a timer to check after 3 minutes
          if (backgroundTimerRef.current) {
            clearTimeout(backgroundTimerRef.current);
          }
          backgroundTimerRef.current = setTimeout(() => {
            checkBackgroundInactivity();
          }, INACTIVITY_TIMEOUT);
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
      }
    };
  }, [session, user, signOut, checkBackgroundInactivity]);

  // Clear background timer when user logs out
  useEffect(() => {
    if (!session || !user) {
      // Clear background timer when logged out
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
      backgroundTimeRef.current = null;
    }
  }, [session, user]);

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
