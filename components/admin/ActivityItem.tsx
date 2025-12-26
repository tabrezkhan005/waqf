import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ActivityItemProps {
  activity: {
    id: number;
    action: string;
    details?: any;
    created_at: string;
  };
}

export default function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'collection_submitted':
        return 'document-text-outline';
      case 'payment_verified':
        return 'checkmark-circle-outline';
      case 'institution_added':
        return 'add-circle-outline';
      case 'receipt_uploaded':
        return 'image-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'collection_submitted':
        return '#003D99';
      case 'payment_verified':
        return '#1A9D5C';
      case 'institution_added':
        return '#1A9D5C';
      case 'receipt_uploaded':
        return '#003D99';
      default:
        return '#8E8E93';
    }
  };

  const getActivityText = (activity: any) => {
    switch (activity.action) {
      case 'collection_submitted':
        return `${activity.details?.inspector || 'Inspector'} submitted a collection`;
      case 'payment_verified':
        return `Payment verified by ${activity.details?.accounts || 'Accounts'}`;
      case 'institution_added':
        return 'New institution added';
      case 'receipt_uploaded':
        return 'Receipt uploaded';
      default:
        return 'Activity recorded';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const icon = getActivityIcon(activity.action);
  const color = getActivityColor(activity.action);

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>{getActivityText(activity)}</Text>
        <Text style={styles.time}>{formatTime(activity.created_at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
});
























