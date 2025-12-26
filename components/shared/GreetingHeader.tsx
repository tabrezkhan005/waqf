import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Profile } from '@/lib/types/database';

interface GreetingHeaderProps {
  profile: Profile;
  primaryColor: string;
}

export default function GreetingHeader({ profile, primaryColor }: GreetingHeaderProps) {
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={[styles.name, { color: primaryColor }]}>
          {profile.full_name || 'User'}
        </Text>
      </View>
      <View style={[styles.iconContainer, { backgroundColor: primaryColor + '15' }]}>
        <Ionicons name="person-circle-outline" size={40} color={primaryColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  textContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

























