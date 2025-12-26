import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DistrictCardProps {
  district: {
    id: number;
    name: string;
    inspectorName: string;
    pendingCount: number;
    completedCount: number;
    totalCollected: number;
  };
  onPress: () => void;
}

export default function DistrictCard({ district, onPress }: DistrictCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${(amount / 1000).toFixed(1)}K`;
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: fadeAnim,
      }}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="location" size={20} color="#003D99" />
            </View>
            <Text style={styles.districtName} numberOfLines={1}>
              {district.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward-circle" size={24} color="#003D99" />
        </View>

        <View style={styles.inspectorBadge}>
          <Ionicons name="person" size={14} color="#1A9D5C" />
          <Text style={styles.inspectorName} numberOfLines={1}>
            {district.inspectorName}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>{district.pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#1A9D5C' }]}>{district.completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <View style={styles.totalIconContainer}>
            <Ionicons name="cash" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.totalTextContainer}>
            <Text style={styles.totalLabel}>Total Collected</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(district.totalCollected)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: 280,
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#003D9915',
    justifyContent: 'center',
    alignItems: 'center',
  },
  districtName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    flex: 1,
    letterSpacing: 0.3,
  },
  inspectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A9D5C15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  inspectorName: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: '#1A9D5C',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Nunito-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Nunito-SemiBold',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#003D9910',
    padding: 12,
    borderRadius: 12,
  },
  totalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#003D99',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalTextContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'Nunito-SemiBold',
    color: '#8E8E93',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#003D99',
    letterSpacing: 0.3,
  },
});
