import { AntDesign } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Holiday {
  holidayId: number;
  nameOfHoliday: string;
  description: string;
  date: string;
}

const API_BASE_URL = 'http://192.168.1.12:8080/api/holiday';

const AdminHolidayPage = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    nameOfHoliday: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await axios.get<Holiday[]>(`${API_BASE_URL}/`);
      setHolidays(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      setError('Failed to load holidays. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/save`, formData);
      setHolidays([...holidays, response.data]);
      setShowAddModal(false);
      setFormData({ nameOfHoliday: '', description: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error adding holiday:', error);
      Alert.alert('Error', 'Failed to add holiday. Please try again.');
    }
  };

  const handleEditHoliday = async () => {
    if (!selectedHoliday) return;
    try {
      const response = await axios.put(`${API_BASE_URL}/save`, {
        ...formData,
        holidayId: selectedHoliday.holidayId,
      });
      setHolidays(
        holidays.map((holiday) =>
          holiday.holidayId === selectedHoliday.holidayId ? response.data : holiday
        )
      );
      setShowEditModal(false);
      setSelectedHoliday(null);
      setFormData({ nameOfHoliday: '', description: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error updating holiday:', error);
      Alert.alert('Error', 'Failed to update holiday. Please try again.');
    }
  };

  const handleDeleteHoliday = async (holidayId: number) => {
    Alert.alert('Delete Holiday', 'Are you sure you want to delete this holiday?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_BASE_URL}?holidayId=${holidayId}`);
            setHolidays(holidays.filter((holiday) => holiday.holidayId !== holidayId));
          } catch (error) {
            console.error('Error deleting holiday:', error);
            Alert.alert('Error', 'Failed to delete holiday. Please try again.');
          }
        },
      },
    ]);
  };

  const openEditModal = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setFormData({
      nameOfHoliday: holiday.nameOfHoliday,
      description: holiday.description,
      date: new Date(holiday.date).toISOString().split('T')[0],
    });
    setShowEditModal(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date(formData.date);
    setShowDatePicker(Platform.OS === 'ios');
    setFormData((prev) => ({ ...prev, date: currentDate.toISOString().split('T')[0] }));
  };

  const filteredHolidays = holidays.filter((holiday) => {
    const holidayDate = new Date(holiday.date);
    const matchesSearch =
      holiday.nameOfHoliday.toLowerCase().includes(searchTerm.toLowerCase()) ||
      holiday.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = holidayDate.getFullYear() === yearFilter;
    return matchesSearch && matchesYear;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading holidays...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Holiday Management</Text>
        </View>

        <View style={styles.filtersSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search holidays..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={yearFilter}
              onValueChange={(itemValue) => setYearFilter(Number(itemValue))}
              style={styles.yearPicker}>
              {[2023, 2024, 2025, 2026].map((year) => (
                <Picker.Item key={year} label={String(year)} value={year} />
              ))}
            </Picker>
          </View>
        </View>
        <TouchableOpacity style={styles.addHolidayBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addHolidayBtnText}>Add Holiday</Text>
        </TouchableOpacity>

        <View style={styles.holidaysGrid}>
          {filteredHolidays.length === 0 ? (
            <View style={styles.centered}>
              <Text>No holidays found for the selected criteria.</Text>
            </View>
          ) : (
            filteredHolidays.map((holiday) => (
              <View key={holiday.holidayId} style={styles.holidayCard}>
                <View style={styles.holidayDate}>
                  <Text style={styles.month}>
                    {new Date(holiday.date).toLocaleString('default', { month: 'short' })}
                  </Text>
                  <Text style={styles.day}>{new Date(holiday.date).getDate()}</Text>
                </View>
                <View style={styles.holidayInfo}>
                  <Text style={styles.holidayName}>{holiday.nameOfHoliday}</Text>
                  <Text>{holiday.description}</Text>
                </View>
                <View style={styles.holidayActions}>
                  <TouchableOpacity onPress={() => openEditModal(holiday)}>
                    <AntDesign name="edit" size={24} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteHoliday(holiday.holidayId)}>
                    <AntDesign name="delete" size={24} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <Modal
          visible={showAddModal || showEditModal}
          animationType="slide"
          onRequestClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}
          transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {showEditModal ? 'Edit Holiday' : 'Add New Holiday'}
              </Text>

              <Text style={styles.label}>Holiday Name</Text>
              <TextInput
                style={styles.input}
                value={formData.nameOfHoliday}
                onChangeText={(text) => setFormData({ ...formData, nameOfHoliday: text })}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                multiline
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />

              <Text style={styles.label}>Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                <Text>{new Date(formData.date).toLocaleDateString()}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={new Date(formData.date)}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={showEditModal ? handleEditHoliday : handleAddHoliday}>
                  <Text style={styles.buttonText}>
                    {showEditModal ? 'Update Holiday' : 'Add Holiday'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: 'red', textAlign: 'center' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  filtersSection: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  yearPicker: { height: 50, width: 120 },
  addHolidayBtn: {
    backgroundColor: '#007AFF',
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addHolidayBtnText: { color: '#fff', fontWeight: 'bold' },
  holidaysGrid: { padding: 10 },
  holidayCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  holidayDate: { marginRight: 15, alignItems: 'center', width: 50 },
  month: { textTransform: 'uppercase', color: '#007AFF', fontWeight: 'bold' },
  day: { fontSize: 24, fontWeight: 'bold' },
  holidayInfo: { flex: 1 },
  holidayName: { fontSize: 18, fontWeight: 'bold' },
  holidayActions: { flexDirection: 'row', justifyContent: 'space-between', width: 60 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    justifyContent: 'center',
    minHeight: 40,
  },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, marginLeft: 10 },
  cancelButton: { backgroundColor: '#6c757d' },
  submitButton: { backgroundColor: '#007AFF' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default AdminHolidayPage;
