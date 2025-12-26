import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDialogHelpers } from '@/hooks/use-dialog';
import { useNotification } from '@/contexts/NotificationContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const passwordInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const { signIn, profile, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useDialogHelpers();
  const { showNotification } = useNotification();

  // Animation refs
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const greetingFade = useRef(new Animated.Value(0)).current;
  const greetingSlide = useRef(new Animated.Value(30)).current;
  const welcomeFade = useRef(new Animated.Value(0)).current;
  const welcomeSlide = useRef(new Animated.Value(30)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Set automatic greeting based on time of day
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good Evening');
    } else {
      setGreeting('Good Evening');
    }

    // Animations
    Animated.parallel([
      Animated.timing(logoFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(greetingFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(greetingSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(welcomeFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(welcomeSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Keyboard listeners
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to active input after a short delay
        setTimeout(() => {
          if (emailFocused) {
            emailInputRef.current?.measureInWindow((x, y) => {
              const scrollTo = y - 100; // Position input 100px from top
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, scrollTo),
                animated: true,
              });
            });
          } else if (passwordFocused) {
            passwordInputRef.current?.measureInWindow((x, y) => {
              const scrollTo = y - 100;
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, scrollTo),
                animated: true,
              });
            });
          }
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [emailFocused, passwordFocused]);

  // Redirect to role router when user is authenticated
  useEffect(() => {
    if (session && profile && !authLoading) {
      // User is logged in, redirect to role-based router
      console.log('Auth Screen - User authenticated, redirecting to role router. Role:', profile.role);

      // Stop loading spinner
      setLoading(false);

      // Use a small delay to ensure navigation is ready
      const timer = setTimeout(() => {
        router.replace('/_roleRouter');
      }, 200);
      return () => clearTimeout(timer);
    } else if (session && !profile && authLoading) {
      // Session exists but profile is still loading from AuthContext
      // Keep showing loading state
      setLoading(true);
    } else if (!session && !authLoading) {
      // No session and auth is not loading, ensure loading is false
      setLoading(false);
    }
  }, [session, profile, authLoading, loading, router]);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      showError('Error', 'Please enter both email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showError('Error', 'Please enter a valid email address');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      console.log('Attempting login for:', email.trim());
      const { error } = await signIn(email.trim(), password);

      if (error) {
        setLoading(false);
        console.error('Login error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));

        // Show more detailed error message
        let errorMessage = error.message || 'Invalid credentials. Please try again.';

        // Handle specific error types
        if (error.message?.includes('schema') || error.message?.includes('querying')) {
          errorMessage = 'Database connection error. Please check your connection and try again.';
        } else if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message?.includes('Device not authorized')) {
          errorMessage = error.message;
        }

        showError('Sign In Failed', errorMessage);
        return;
      }

      // Success - wait for session and profile to be set
      console.log('Login successful! Waiting for session and profile...');
      showNotification('Login successful!', 'success', 2000);

      // The useEffect will handle redirect automatically once session and profile are set
      // Don't set loading to false here - let the useEffect handle it
      // This ensures the spinner shows until we're ready to redirect
    } catch (error: any) {
      setLoading(false);
      console.error('Login exception:', error);
      showError('Sign In Failed', error?.message || 'An unexpected error occurred. Please try again.');
    }
  };

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.measureInWindow((x, y) => {
          const scrollTo = y - 100;
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, scrollTo),
            animated: true,
          });
        });
      }
    }, 150);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(40, keyboardHeight + 20) }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <Animated.View
            style={[
              styles.logoSection,
              {
                opacity: logoFade,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('@/assets/images/waqfbg.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Animated.Text
              style={[
                styles.greeting,
                {
                  opacity: greetingFade,
                  transform: [{ translateY: greetingSlide }],
                },
              ]}
            >
              {greeting}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.welcomeText,
                {
                  opacity: welcomeFade,
                  transform: [{ translateY: welcomeSlide }],
                },
              ]}
            >
              Welcome back!
            </Animated.Text>
            <Animated.Text
              style={[
                styles.subtitle,
                {
                  opacity: subtitleFade,
                  transform: [{ translateY: subtitleSlide }],
                },
              ]}
            >
              Please sign in to continue
            </Animated.Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  emailFocused && styles.inputWrapperFocused,
                  email && !email.trim() && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#6B7280"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => {
                    setEmailFocused(true);
                    scrollToInput(emailInputRef);
                  }}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>
              {email && !email.trim() && (
                <Text style={styles.errorText}>Email cannot be empty</Text>
              )}
              {email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                <Text style={styles.errorText}>Please enter a valid email address</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <View
                style={[
                  styles.passwordContainer,
                  passwordFocused && styles.passwordContainerFocused,
                  password && !password.trim() && styles.passwordContainerError,
                ]}
              >
                <TextInput
                  ref={passwordInputRef}
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#6B7280"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => {
                    setPasswordFocused(true);
                    scrollToInput(passwordInputRef);
                  }}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIconText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              {password && !password.trim() && (
                <Text style={styles.errorText}>Password cannot be empty</Text>
              )}
              {password && password.length > 0 && password.length < 6 && (
                <Text style={styles.warningText}>
                  Password should be at least 6 characters
                </Text>
              )}
            </View>

            {/* Contact Admin Link */}
            <TouchableOpacity style={styles.contactAdmin}>
              <Text style={styles.contactAdminText}>Facing issue? Contact Admin</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Extra space for keyboard */}
            <View style={{ height: 50 }} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: SCREEN_HEIGHT * 1.2, // Ensure enough scroll space
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    tintColor: '#0A7E43',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  greeting: {
    fontSize: 32,
    fontFamily: 'Nunito-Bold',
    color: '#0F0F0F',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: 'Nunito-SemiBold',
    color: '#0A7E43',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#0F0F0F',
    opacity: 0.7,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: 'Nunito-SemiBold',
    color: '#0F0F0F',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  required: {
    color: '#EF4444',
    fontSize: 15,
    fontFamily: 'Nunito-SemiBold',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputWrapperFocused: {
    borderColor: '#0A7E43',
    borderWidth: 2.5,
    backgroundColor: '#FAFFFC',
    ...Platform.select({
      ios: {
        shadowColor: '#0A7E43',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    borderWidth: 2.5,
    backgroundColor: '#FFF5F5',
  },
  input: {
    fontSize: 17,
    fontFamily: 'Nunito-Regular',
    color: '#0F0F0F',
    paddingHorizontal: 20,
    paddingVertical: 18,
    letterSpacing: 0.1,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    color: '#EF4444',
    marginTop: 8,
    marginLeft: 4,
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    color: '#F59E0B',
    marginTop: 8,
    marginLeft: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  passwordContainerFocused: {
    borderColor: '#0A7E43',
    borderWidth: 2.5,
    backgroundColor: '#FAFFFC',
    ...Platform.select({
      ios: {
        shadowColor: '#0A7E43',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  passwordContainerError: {
    borderColor: '#EF4444',
    borderWidth: 2.5,
    backgroundColor: '#FFF5F5',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 18,
    paddingLeft: 20,
    paddingRight: 12,
    fontSize: 17,
    fontFamily: 'Nunito-Regular',
    color: '#0F0F0F',
    letterSpacing: 0.1,
  },
  eyeIcon: {
    padding: 16,
    paddingLeft: 12,
    paddingRight: 16,
  },
  eyeIconText: {
    fontSize: 22,
  },
  contactAdmin: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  contactAdminText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#0A7E43',
    textDecorationLine: 'underline',
    letterSpacing: 0.2,
  },
  button: {
    backgroundColor: '#0A7E43',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: '#0A7E43',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.5,
  },
});
