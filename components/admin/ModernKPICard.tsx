import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface ModernKPICardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
  iconBg: string;
  onPress?: () => void;
  delay?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function ModernKPICard({
  title,
  value,
  icon,
  gradient,
  iconBg,
  onPress,
  delay = 0,
  trend,
}: ModernKPICardProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 600 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
      opacity: opacity.value,
    };
  });

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <CardComponent
        style={[styles.card, { backgroundColor: gradient[0] }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={28} color="#FFFFFF" />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.title}>{title}</Text>
            {trend && (
              <View style={styles.trendContainer}>
                <Ionicons
                  name={trend.isPositive ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={trend.isPositive ? '#10B981' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.trendText,
                    { color: trend.isPositive ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {Math.abs(trend.value)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </CardComponent>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
    padding: 20,
    minHeight: 140,
  },
  content: {
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontSize: 28,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Nunito-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trendText: {
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
    marginLeft: 4,
  },
});
