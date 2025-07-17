import { AntDesign } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Interfaces for type safety
interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeName: string;
}

interface AttendanceRecord {
  id: number;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  workLocation: 'WFO' | 'WFH' | 'N/A';
}

const API_BASE_URL = 'http://192.168.1.42:8080/api';
const workLocations = ['WFO', 'WFH', 'N/A'];
const attendanceStatuses: AttendanceRecord['status'][] = ['Present', 'Absent', 'Late', 'Excused'];

const AdminAttendancePage = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filters
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterWorkLocation, setFilterWorkLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add' | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '',
    clockOut: '',
    status: 'Present' as AttendanceRecord['status'],
    workLocation: 'WFO' as AttendanceRecord['workLocation'],
  });

  // Download state
  const [downloadMonth, setDownloadMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  const getEmployeeNameById = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.employeeName : 'Unknown';
  }, [employees]);

  // --- Data Fetching ---
  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      fetchAttendanceRecords();
    }
  }, [employees]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employee`);
      if (response.ok) {
        const data = await response.json();
        const employeesArray = Array.isArray(data) ? data : data.data || [];
        const transformedEmployees = employeesArray.map((emp: any) => ({
          id: emp.id.toString(),
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          employeeId: emp.employeeId || emp.id.toString(),
          employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        }));
        setEmployees(transformedEmployees);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/attendances`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const mappedData = data.map((record: any) => ({
        id: record.id,
        employeeId: record.employeeId.toString(),
        employeeName: getEmployeeNameById(record.employeeId.toString()),
        date: record.date,
        clockIn: record.checkIn,
        clockOut: record.checkOut,
        status: record.present ? 'Present' : 'Absent',
        workLocation: record.workLocation || 'N/A',
      }));
      setAttendanceRecords(mappedData);
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      Alert.alert('Error', 'Failed to fetch attendance records.');
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD Handlers ---
  const handleApiCall = async (action: 'add' | 'edit') => {
    if (!formData.employeeId || !formData.date || !formData.status) {
      Alert.alert('Error', 'Please fill all required fields!');
      return;
    }
    setIsProcessing(true);

    const url = action === 'add' ? `${API_BASE_URL}/attendances` : `${API_BASE_URL}/attendances/${selectedRecord?.id}`;
    const method = action === 'add' ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          date: formData.date,
          checkIn: formData.clockIn || null,
          checkOut: formData.clockOut || null,
          present: formData.status === 'Present',
          workLocation: formData.workLocation,
        }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} record`);
      
      Alert.alert('Success', `Attendance record ${action === 'add' ? 'created' : 'updated'} successfully!`);
      handleCloseModal();
      fetchAttendanceRecords();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', `Failed to ${action} attendance record.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRecord = (recordId: number) => {
    Alert.alert('Confirm Deletion', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setIsProcessing(true);
        try {
          const response = await fetch(`${API_BASE_URL}/attendances/${recordId}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete record');
          Alert.alert('Success', 'Record deleted successfully!');
          setAttendanceRecords(prev => prev.filter(rec => rec.id !== recordId));
        } catch (error) {
          Alert.alert('Error', 'Failed to delete record.');
        } finally {
          setIsProcessing(false);
          handleCloseModal();
        }
      }},
    ]);
  };

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', record: AttendanceRecord | null = null) => {
    setModalMode(mode);
    setSelectedRecord(record);
    if (mode === 'add') {
      setFormData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0], clockIn: '', clockOut: '',
        status: 'Present', workLocation: 'WFO',
      });
    } else if (record) {
      setFormData({
        employeeId: record.employeeId, date: record.date,
        clockIn: record.clockIn || '', clockOut: record.clockOut || '',
        status: record.status, workLocation: record.workLocation,
      });
    }
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => setIsModalOpen(false);

  // --- Download Handler ---
  const handleDownloadMonthlyAttendance = async () => {
    if (!downloadMonth) {
      Alert.alert('Error', 'Please select a month to download.');
      return;
    }
    const [year, month] = downloadMonth.split('-');
    const monthlyRecords = attendanceRecords.filter(r => r.date.startsWith(`${year}-${month}`));

    if (monthlyRecords.length === 0) {
      Alert.alert('Info', 'No records found for the selected month.');
      return;
    }

    const header = "ID,Employee ID,Employee Name,Date,Clock In,Clock Out,Status,Work Location";
    const rows = monthlyRecords.map(r => `${r.id},${r.employeeId},"${r.employeeName}",${r.date},${r.clockIn || 'N/A'},${r.clockOut || 'N/A'},${r.status},${r.workLocation}`);
    const csvContent = `${header}\n${rows.join('\n')}`;
    
    try {
      const fileUri = FileSystem.documentDirectory + `attendance_${downloadMonth}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sharing not available', 'CSV file saved at: ' + fileUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate or share the CSV.');
    }
  };
  
  const filteredRecords = attendanceRecords.filter(r => 
    (filterEmployee ? r.employeeId === filterEmployee : true) &&
    (filterStatus ? r.status === filterStatus : true) &&
    (filterDate ? r.date === filterDate : true) &&
    (filterWorkLocation ? r.workLocation === filterWorkLocation : true)
  );
  
  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /><Text>Loading Records...</Text></View>;

  const renderModalContent = () => {
    const isView = modalMode === 'view';
    const isEdit = modalMode === 'edit';
    const isAdd = modalMode === 'add';
    const record = isView || isEdit ? selectedRecord : null;

    if (isView && record) {
      return (
        <View>
          <Text style={styles.modalTitle}>Attendance Details</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Employee:</Text> {record.employeeName}</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Date:</Text> {record.date}</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Clock In:</Text> {record.clockIn || 'N/A'}</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Clock Out:</Text> {record.clockOut || 'N/A'}</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Status:</Text> {record.status}</Text>
          <Text style={styles.detailText}><Text style={styles.detailLabel}>Location:</Text> {record.workLocation}</Text>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalButton, styles.editButton]} onPress={() => handleOpenModal('edit', record)}><Text style={styles.buttonText}>Edit</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={() => handleDeleteRecord(record.id)}><Text style={styles.buttonText}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      )
    }

    if (isAdd || isEdit) {
      return (
        <ScrollView>
          <Text style={styles.modalTitle}>{isAdd ? 'Add' : 'Edit'} Attendance Record</Text>
          
          <Text style={styles.label}>Employee*</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={formData.employeeId} onValueChange={(itemValue: string) => setFormData(p => ({...p, employeeId: itemValue}))} enabled={isAdd}>
              <Picker.Item label="Select Employee" value="" />
              {employees.map((emp) => <Picker.Item key={emp.id} label={emp.employeeName} value={emp.id} />)}
            </Picker>
          </View>
          
          <Text style={styles.label}>Date*</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.date}
            onChangeText={text => setFormData(prev => ({ ...prev, date: text }))}
          />
          
          <Text style={styles.label}>Status*</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={formData.status} onValueChange={(itemValue: AttendanceRecord['status']) => setFormData(p => ({...p, status: itemValue}))}>
              {attendanceStatuses.map(s => <Picker.Item key={s} label={s} value={s} />)}
            </Picker>
          </View>

          <Text style={styles.label}>Work Location*</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={formData.workLocation} onValueChange={(itemValue: AttendanceRecord['workLocation']) => setFormData(p => ({...p, workLocation: itemValue}))}>
              {workLocations.map(l => <Picker.Item key={l} label={l} value={l} />)}
            </Picker>
          </View>

          {(formData.status === 'Present' || formData.status === 'Late') && (
            <>
              <Text style={styles.label}>Clock In Time</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={formData.clockIn}
                onChangeText={text => setFormData(prev => ({ ...prev, clockIn: text }))}
              />
              <Text style={styles.label}>Clock Out Time</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={formData.clockOut}
                onChangeText={text => setFormData(prev => ({ ...prev, clockOut: text }))}
              />
            </>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleCloseModal}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={() => handleApiCall(isAdd ? 'add' : 'edit')} disabled={isProcessing}>
              {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isAdd ? 'Create Record' : 'Save Changes'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )
    }
    return null;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <AntDesign name="filter" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleOpenModal('add')}>
          <AntDesign name="plus" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={filterEmployee} onValueChange={setFilterEmployee}>
                <Picker.Item label="All Employees" value="" />
                {employees.map(e => <Picker.Item key={e.id} label={e.employeeName} value={e.id} />)}
            </Picker>
          </View>
          <TouchableOpacity onPress={() => setFilterDate(new Date().toISOString().split('T')[0])} style={styles.input}>
              <Text>{filterDate || 'Filter by Date'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredRecords.length > 0 ? (
            filteredRecords.map(record => (
              <TouchableOpacity key={record.id} style={styles.card} onPress={() => handleOpenModal('view', record)}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{record.employeeName}</Text>
                    <Text style={styles.cardDate}>{record.date}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text><Text style={styles.bold}>Status:</Text> {record.status}</Text>
                    <Text><Text style={styles.bold}>Location:</Text> {record.workLocation}</Text>
                    <Text><Text style={styles.bold}>Time:</Text> {record.clockIn || 'N/A'} - {record.clockOut || 'N/A'}</Text>
                  </View>
              </TouchableOpacity>
            ))
        ) : (
            <Text style={styles.noRecordsText}>No records found.</Text>
        )}
      </ScrollView>
      
      <View style={styles.downloadSection}>
          <TextInput 
              style={styles.monthInput}
              placeholder="YYYY-MM"
              value={downloadMonth}
              onChangeText={setDownloadMonth}
          />
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadMonthlyAttendance}>
              <AntDesign name="download" size={20} color="#fff" />
              <Text style={styles.buttonText}>Download CSV</Text>
          </TouchableOpacity>
      </View>

      <Modal visible={isModalOpen} animationType="slide" transparent={true} onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}><AntDesign name="close" size={24} /></TouchableOpacity>
                {renderModalContent()}
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ddd' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  filtersContainer: { padding: 10, backgroundColor: '#fff' },
  scrollContent: { padding: 8 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, margin: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardDate: { color: '#666' },
  cardBody: {},
  bold: { fontWeight: 'bold' },
  noRecordsText: { textAlign: 'center', marginTop: 20, color: '#666' },
  downloadSection: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  monthInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginRight: 10 },
  downloadButton: { flexDirection: 'row', backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 10, padding: 20, maxHeight: '80%' },
  closeButton: { alignSelf: 'flex-end', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 16, color: '#333', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 12, justifyContent: 'center', minHeight: 48 },
  pickerWrapper: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, borderTopWidth: 1, borderColor: '#eee', paddingTop: 16 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10, flexDirection: 'row', alignItems: 'center' },
  cancelButton: { backgroundColor: '#6c757d' },
  submitButton: { backgroundColor: '#007AFF' },
  editButton: { backgroundColor: '#ffc107' },
  deleteButton: { backgroundColor: '#dc3545' },
  detailText: { fontSize: 16, marginBottom: 8 },
  detailLabel: { fontWeight: 'bold' },
});

export default AdminAttendancePage;
