import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function InspectorsInstitutionsIndex() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/admin/inspectors-institutions/inspectors')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={32} color="#003D99" />
          </View>
          <Text style={styles.cardTitle}>Inspectors</Text>
          <Text style={styles.cardDescription}>
            Manage inspectors across all districts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/admin/inspectors-institutions/institutions')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={32} color="#1A9D5C" />
          </View>
          <Text style={styles.cardTitle}>Institutions</Text>
          <Text style={styles.cardDescription}>
            Manage institutions and assignments
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#003D9915',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
});
























