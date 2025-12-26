import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Digital Financial Collection',
    subtitle: 'Streamlined Payment Processing',
    description: 'Modern, secure, and efficient financial management system for government collections across 26 districts',
    image: require('@/assets/images/getstarted/1.png'),
  },
  {
    id: 2,
    title: 'Real-Time Verification',
    subtitle: 'Automated Workflow Management',
    description: 'Instant verification and challan assignment with complete audit trails and automated notifications',
    image: require('@/assets/images/getstarted/2.png'),
  },
  {
    id: 3,
    title: 'Comprehensive Analytics',
    subtitle: 'Data-Driven Insights',
    description: 'Generate detailed reports and track collections with powerful analytics and visualization tools',
    image: require('@/assets/images/getstarted/3.png'),
  },
  {
    id: 4,
    title: 'Secure & Compliant',
    subtitle: 'Bank-Level Security',
    description: 'Role-based access control with device binding ensures maximum security and regulatory compliance',
    image: require('@/assets/images/getstarted/4.png'),
  },
];

export default function GetStartedScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Auto-slide every 5 seconds
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % slides.length;

        // Scroll to next
        slideRef.current?.scrollToOffset({
          offset: next * width,
          animated: true,
        });

        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== currentSlide) {
      setCurrentSlide(viewableItems[0].index);
    }
  }).current;

  const handleGetStarted = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    await AsyncStorage.setItem('has_seen_get_started', 'true');
    router.replace('/auth');
  };

  const renderSlide = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const imageScale = scrollX.interpolate({
      inputRange,
      outputRange: [1.05, 1, 1.05], // Reduced scale to prevent overflow
      extrapolate: 'clamp',
    });

    const imageOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide} key={item.id}>
        {/* Image Container - Top */}
        <Animated.View
          style={[
            styles.imageContainer,
            {
              transform: [{ scale: imageScale }],
              opacity: imageOpacity,
            },
          ]}
        >
          <Image
            source={item.image}
            style={styles.slideImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* White Bottom Section */}
        <View style={styles.whiteBottom} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header - Floating with transparency */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('@/assets/images/waqfbg.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.logoWrapper}>
            <Image
              source={require('@/assets/images/apgov.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>
      </Animated.View>

      {/* Slides */}
      <Animated.FlatList
        ref={slideRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
        keyExtractor={(item) => item.id.toString()}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />

      {/* Bottom Section - Floating */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [6, 24, 6],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 0.8, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Get Started Button */}
        <View style={styles.buttonContainer}>
          <Animated.View
            style={[
              styles.buttonWrapper,
              { transform: [{ scale: buttonScale }] },
            ]}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={handleGetStarted}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header - Transparent floating
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  logo: {
    width: 40,
    height: 40,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  mainTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  mainSubtitle: {
    fontSize: 11,
    fontFamily: 'Nunito-SemiBold',
    color: '#E8F5E9',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Slides
  slide: {
    width: width,
    height: height,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: width,
    height: height * 0.75, // Take 75% of screen height for image
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    overflow: 'hidden',
  },
  slideImage: {
    width: width,
    height: '100%',
  },
  whiteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.25, // Bottom 25% is white
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },

  // Bottom Section - Floating
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 24,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 3,
  },

  // Button
  buttonContainer: {
    width: '100%',
  },
  buttonWrapper: {
    width: '100%',
  },
  button: {
    backgroundColor: '#0A7E43',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.5,
  },
});
