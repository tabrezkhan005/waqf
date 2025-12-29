import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
  related_type: string | null;
}

export default function InspectorNotificationsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, [profile?.id]);

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile.id)
        .in('type', ['payment_verified', 'payment_rejected', 'announcement'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      const unread = (data || []).filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', profile.id)
        .eq('is_read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);

    // Navigate based on notification type
    if (notification.related_type === 'collection' && notification.related_id) {
      router.push(`/inspector/collections/${notification.related_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_verified':
        return { name: 'checkmark-circle', color: theme.colors.success };
      case 'payment_rejected':
        return { name: 'close-circle', color: theme.colors.danger };
      case 'announcement':
        return { name: 'megaphone', color: theme.colors.primary };
      default:
        return { name: 'notifications', color: theme.colors.muted };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.85}
        style={{ marginBottom: theme.spacing.sm }}
      >
        <Card
          style={[
            styles.notificationCard,
            !item.is_read && styles.notificationCardUnread,
          ]}
        >
          <View style={styles.notificationContent}>
            <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
              <Ionicons name={icon.name as any} size={24} color={icon.color} />
            </View>
            <View style={styles.notificationText}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationMessage} numberOfLines={3}>
                {item.message}
              </Text>
              <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppHeader
              title="Notifications"
              subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              rightActions={
                unreadCount > 0
                  ? [
                      {
                        icon: 'checkmark-done-outline',
                        onPress: markAllAsRead,
                        accessibilityLabel: 'Mark all as read',
                      },
                    ]
                  : undefined
              }
            />
            <View style={{ height: theme.spacing.md }} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No notifications"
              description="You're all caught up. New notifications will appear here."
              icon="notifications-off-outline"
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  emptyContainer: {
    marginTop: theme.spacing.xl * 2,
  },
  notificationCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  notificationCardUnread: {
    backgroundColor: theme.colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontFamily: 'Nunito-Regular',
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontFamily: 'Nunito-Regular',
    fontSize: 11,
    color: theme.colors.muted,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
  },
});
