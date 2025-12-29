import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

type Action = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badgeCount?: number;
  accessibilityLabel?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  rightActions?: Action[];
  style?: StyleProp<ViewStyle>;
};

export function AppHeader({ title, subtitle, rightActions = [], style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.left}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {rightActions.length > 0 ? (
        <View style={styles.right}>
          {rightActions.map((a, idx) => (
            <TouchableOpacity
              key={`${a.icon}-${idx}`}
              style={styles.iconBtn}
              onPress={a.onPress}
              activeOpacity={0.75}
              accessibilityLabel={a.accessibilityLabel}
            >
              <Ionicons name={a.icon} size={20} color={theme.colors.text} />
              {typeof a.badgeCount === 'number' && a.badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{Math.min(99, a.badgeCount)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadow,
  },
  left: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  badgeText: {
    color: theme.colors.surface,
    fontSize: 9,
    fontFamily: 'Nunito-Bold',
  },
});








