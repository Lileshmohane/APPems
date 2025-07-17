import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../components/AuthContext';

const API_BASE_URL = 'http://192.168.1.42:8080/api';

const requestTypes = [
  {
    label: 'Leave Request',
    value: 'Leave Request',
    icon: 'calendar-outline',
    fields: ['start_date', 'end_date', 'reason', 'attachment'],
    description: 'Request time off for personal, medical, or vacation purposes',
  },
  {
    label: 'Salary Slip Request',
    value: 'Salary Slip Request',
    icon: 'cash-outline',
    fields: ['month', 'year', 'email'],
    description: 'Request digital copies of your salary statements',
  },
  {
    label: 'Experience/Relieving Letter',
    value: 'Experience/Relieving Letter',
    icon: 'document-text-outline',
    fields: ['letter_type', 'reason', 'email'],
    description: 'Request official documentation of your employment',
  },
  {
    label: 'Asset Request',
    value: 'Asset Request',
    icon: 'laptop-outline',
    fields: ['asset_type', 'justification', 'date_needed'],
    description: 'Request company equipment or resources',
  },
  {
    label: 'HR Complaint/Feedback',
    value: 'HR Complaint/Feedback',
    icon: 'chatbox-ellipses-outline',
    fields: ['issue_type', 'description', 'attachment', 'anonymous'],
    description: 'Submit complaints or provide feedback to HR',
  },
];

const statusColors = {
  Pending: '#f0ad4e',
  Approved: '#5cb85c',
  Rejected: '#d9534f',
  Draft: '#5bc0de',
  Completed: '#5cb85c',
  'In Progress': '#5bc0de',
};

const HRRequestPage = () => {
  const { employeeId } = useAuth();
  const [activeTab, setActiveTab] = useState<'newRequest' | 'myRequests' | 'holidays'>('newRequest');
  const [selectedType, setSelectedType] = useState('');
  const [form, setForm] = useState<any>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({ status: 'all', type: 'all' });

  useEffect(() => {
    fetchRequests();
    fetchHolidays();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/complaints`);
      setRequests(res.data || []);
    } catch (err) {
      setError('Failed to load HR requests.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/holiday/`);
      setHolidays(res.data || []);
    } catch (err) {
      setError('Failed to load holidays.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setForm((prev: any) => ({ ...prev, attachment: result.assets[0] }));
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      setError('Please select a request type.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const typeConfig = requestTypes.find(t => t.value === selectedType);
      const formData = new FormData();
      formData.append('type', selectedType);
      formData.append('description', form.description || '');
      if (employeeId) {
        formData.append('employeeId', employeeId);
      }
      if (form.attachment && form.attachment.uri) {
        const fileUri = form.attachment.uri;
        const fileName = form.attachment.name || 'attachment';
        const fileType = form.attachment.mimeType || 'application/octet-stream';
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: fileType,
        } as any);
      } else {
        // Add empty file if required
        formData.append('file', new Blob([''], { type: 'text/plain' }), 'empty.txt');
      }
      // Add other fields
      (typeConfig?.fields || []).forEach(field => {
        if (field !== 'attachment' && form[field]) {
          formData.append(field, form[field]);
        }
      });
      await axios.post(`${API_BASE_URL}/complaints`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm({});
      setSelectedType('');
      fetchRequests();
      Alert.alert('Success', 'Request submitted successfully!');
    } catch (err) {
      setError('Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter.status !== 'all' && req.status !== filter.status) return false;
    if (filter.type !== 'all' && req.type !== filter.type) return false;
    return true;
  });

  return (
    <View style={styles.page}>
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'newRequest' && styles.activeTab]} onPress={() => setActiveTab('newRequest')}>
          <Ionicons name="create-outline" size={20} color={activeTab === 'newRequest' ? '#007AFF' : '#666'} />
          <Text style={styles.tabText}>New Request</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'myRequests' && styles.activeTab]} onPress={() => setActiveTab('myRequests')}>
          <Ionicons name="document-text-outline" size={20} color={activeTab === 'myRequests' ? '#007AFF' : '#666'} />
          <Text style={styles.tabText}>My Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'holidays' && styles.activeTab]} onPress={() => setActiveTab('holidays')}>
          <Ionicons name="calendar-outline" size={20} color={activeTab === 'holidays' ? '#007AFF' : '#666'} />
          <Text style={styles.tabText}>Holidays</Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'holidays' && (
        <ScrollView contentContainerStyle={styles.main}>
          <Text style={styles.heading}>Upcoming Holidays</Text>
          {holidays.length === 0 ? (
            <Text style={styles.noRequests}>No holidays found.</Text>
          ) : (
            holidays.map((holiday: any) => (
              <View key={holiday.holidayId} style={styles.card}>
                <Text style={styles.cardTitle}>{holiday.nameOfHoliday}</Text>
                <Text style={styles.cardDate}>{new Date(holiday.date).toLocaleDateString()}</Text>
                <Text style={styles.cardDesc}>{holiday.description}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
      {activeTab === 'newRequest' && (
        <ScrollView contentContainerStyle={styles.main}>
          <Text style={styles.heading}>Submit New Request</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Request Type</Text>
            {requestTypes.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[styles.typeBtn, selectedType === type.value && styles.selectedTypeBtn]}
                onPress={() => {
                  setSelectedType(type.value);
                  setForm({});
                }}
              >
                <Ionicons name={type.icon as any} size={18} color={selectedType === type.value ? '#fff' : '#007AFF'} />
                <Text style={[styles.typeBtnText, selectedType === type.value && { color: '#fff' }]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
            {selectedType !== '' && (
              <>
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('start_date') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Start Date (YYYY-MM-DD)"
                    value={form.start_date || ''}
                    onChangeText={text => handleInputChange('start_date', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('end_date') && (
                  <TextInput
                    style={styles.input}
                    placeholder="End Date (YYYY-MM-DD)"
                    value={form.end_date || ''}
                    onChangeText={text => handleInputChange('end_date', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('reason') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Reason"
                    value={form.reason || ''}
                    onChangeText={text => handleInputChange('reason', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('month') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Month (e.g. January)"
                    value={form.month || ''}
                    onChangeText={text => handleInputChange('month', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('year') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Year (e.g. 2024)"
                    value={form.year || ''}
                    onChangeText={text => handleInputChange('year', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('email') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={form.email || ''}
                    onChangeText={text => handleInputChange('email', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('letter_type') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Letter Type (e.g. Experience, Relieving)"
                    value={form.letter_type || ''}
                    onChangeText={text => handleInputChange('letter_type', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('asset_type') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Asset Type (e.g. Laptop)"
                    value={form.asset_type || ''}
                    onChangeText={text => handleInputChange('asset_type', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('justification') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Justification"
                    value={form.justification || ''}
                    onChangeText={text => handleInputChange('justification', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('date_needed') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Date Needed By (YYYY-MM-DD)"
                    value={form.date_needed || ''}
                    onChangeText={text => handleInputChange('date_needed', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('issue_type') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Issue Type"
                    value={form.issue_type || ''}
                    onChangeText={text => handleInputChange('issue_type', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('description') && (
                  <TextInput
                    style={styles.input}
                    placeholder="Description"
                    value={form.description || ''}
                    onChangeText={text => handleInputChange('description', text)}
                  />
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('anonymous') && (
                  <View style={styles.checkboxRow}>
                    <Text>Submit Anonymously</Text>
                    <TouchableOpacity onPress={() => handleInputChange('anonymous', !form.anonymous)}>
                      <Ionicons name={form.anonymous ? 'checkbox' : 'square-outline'} size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                )}
                {requestTypes.find(t => t.value === selectedType)?.fields.includes('attachment') && (
                  <TouchableOpacity style={styles.uploadBtn} onPress={handleFilePick}>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                    <Text style={styles.uploadBtnText}>{form.attachment?.name || 'Upload Attachment'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Request'}</Text>
            </TouchableOpacity>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        </ScrollView>
      )}
      {activeTab === 'myRequests' && (
        <ScrollView contentContainerStyle={styles.main}>
          <Text style={styles.heading}>My Requests</Text>
          <View style={styles.filterRow}>
            <Text>Status:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="all/Pending/Approved/Rejected"
              value={filter.status}
              onChangeText={text => setFilter(prev => ({ ...prev, status: text }))}
            />
            <Text>Type:</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="all/Leave Request/HR Complaint/Feedback/etc."
              value={filter.type}
              onChangeText={text => setFilter(prev => ({ ...prev, type: text }))}
            />
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />
          ) : filteredRequests.length === 0 ? (
            <Text style={styles.noRequests}>No requests found.</Text>
          ) : (
            filteredRequests.map((request, idx) => (
              <TouchableOpacity key={request.id || idx} style={styles.card} onPress={() => { setSelectedRequest(request); setModalVisible(true); }}>
                <Text style={styles.cardTitle}>{request.type}</Text>
                <Text style={styles.cardDesc}>{request.description}</Text>
                <Text style={styles.cardDate}>Date: {request.date || request.submitted_date}</Text>
                <Text style={[styles.cardStatus, { color: statusColors[request.status as keyof typeof statusColors] || '#007AFF' }]}>Status: {request.status || 'Pending'}</Text>
              </TouchableOpacity>
            ))
          )}
          <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modal}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
                {selectedRequest && (
                  <>
                    <Text style={styles.modalTitle}>{selectedRequest.type}</Text>
                    <Text style={styles.modalDesc}>{selectedRequest.description}</Text>
                    <Text>Date: {selectedRequest.date || selectedRequest.submitted_date}</Text>
                    <Text>Status: {selectedRequest.status || 'Pending'}</Text>
                    {selectedRequest.attachment && (
                      <TouchableOpacity style={styles.uploadBtn} onPress={async () => {
                        try {
                          const fileUri = selectedRequest.attachment.uri;
                          await Sharing.shareAsync(fileUri);
                        } catch (e) {
                          Alert.alert('Error', 'Could not open attachment.');
                        }
                      }}>
                        <Ionicons name="download-outline" size={18} color="#fff" />
                        <Text style={styles.uploadBtnText}>Download Attachment</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          </Modal>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f2f6ff' },
  main: { padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e1e1e1' },
  tab: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { marginLeft: 6, fontWeight: 'bold', color: '#007AFF' },
  formGroup: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 },
  label: { fontWeight: 'bold', marginBottom: 8 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e1e1e1', padding: 10, borderRadius: 8, marginBottom: 8 },
  selectedTypeBtn: { backgroundColor: '#007AFF' },
  typeBtnText: { marginLeft: 8, color: '#007AFF', fontWeight: 'bold' },
  input: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 8, marginBottom: 12, fontSize: 14 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', padding: 12, borderRadius: 8, marginTop: 8, marginBottom: 8, alignSelf: 'flex-start' },
  uploadBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  submitBtn: { backgroundColor: '#007AFF', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  error: { color: '#c62828', marginTop: 8, textAlign: 'center' },
  noRequests: { color: '#999', textAlign: 'center', marginVertical: 16 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e1e1e1' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#666', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#666', marginBottom: 2 },
  cardStatus: { fontSize: 12, marginBottom: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  filterInput: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 6, marginHorizontal: 6, minWidth: 80 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' },
  closeBtn: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  closeBtnText: { fontSize: 20, color: '#c62828' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { fontSize: 14, color: '#666', marginBottom: 8 },
});

export default HRRequestPage; 