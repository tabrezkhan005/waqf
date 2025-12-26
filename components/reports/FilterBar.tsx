import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterBarProps {
  dateRange: {
    label: string;
    from: Date | null;
    to: Date | null;
  };
  districtFilter: string | null;
  districts: Array<{ id: number; name: string }>;
  onDateRangeChange: (range: { label: string; from: Date | null; to: Date | null }) => void;
  onDistrictChange: (districtId: string | null) => void;
}

export default function FilterBar({
  dateRange,
  districtFilter,
  districts,
  onDateRangeChange,
  onDistrictChange,
}: FilterBarProps) {
  const [showDateModal, setShowDateModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);

  const quickRanges = [
    { label: 'This Month', days: 30 },
    { label: 'Last Month', days: 60 },
    { label: 'Last 3 Months', days: 90 },
    { label: 'This Year', days: 365 },
    { label: 'All Time', days: null },
  ];

  const handleQuickRange = (range: typeof quickRanges[0]) => {
    const to = new Date();
    const from = range.days ? new Date(to.getTime() - range.days * 24 * 60 * 60 * 1000) : null;
    onDateRangeChange({ label: range.label, from, to });
    setShowDateModal(false);
  };

  const selectedDistrict = districts.find((d) => d.id.toString() === districtFilter);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowDateModal(true)}
      >
        <Ionicons name="calendar-outline" size={20} color="#9C27B0" />
        <Text style={styles.filterButtonText}>{dateRange.label}</Text>
        <Ionicons name="chevron-down" size={16} color="#8E8E93" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowDistrictModal(true)}
      >
        <Ionicons name="map-outline" size={20} color="#9C27B0" />
        <Text style={styles.filterButtonText}>
          {selectedDistrict ? selectedDistrict.name : 'All Districts'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#8E8E93" />
      </TouchableOpacity>

      {/* Date Range Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={24} color="#2A2A2A" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {quickRanges.map((range) => (
                <TouchableOpacity
                  key={range.label}
                  style={styles.modalOption}
                  onPress={() => handleQuickRange(range)}
                >
                  <Text style={styles.modalOptionText}>{range.label}</Text>
                  {dateRange.label === range.label && (
                    <Ionicons name="checkmark" size={20} color="#9C27B0" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* District Modal */}
      <Modal
        visible={showDistrictModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDistrictModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select District</Text>
              <TouchableOpacity onPress={() => setShowDistrictModal(false)}>
                <Ionicons name="close" size={24} color="#2A2A2A" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  onDistrictChange(null);
                  setShowDistrictModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>All Districts</Text>
                {!districtFilter && <Ionicons name="checkmark" size={20} color="#9C27B0" />}
              </TouchableOpacity>
              {districts.map((district) => (
                <TouchableOpacity
                  key={district.id}
                  style={styles.modalOption}
                  onPress={() => {
                    onDistrictChange(district.id.toString());
                    setShowDistrictModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{district.name}</Text>
                  {districtFilter === district.id.toString() && (
                    <Ionicons name="checkmark" size={20} color="#9C27B0" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
  },
});
























