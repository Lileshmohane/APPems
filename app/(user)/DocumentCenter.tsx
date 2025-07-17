import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../components/AuthContext';

const API_BASE_URL = 'http://192.168.1.42:8080/api';

interface Document {
  name: string;
  type: string;
  uploadDate?: string;
  data?: string;
  base64Doc?: string;
  offerLetterDoc?: string;
  latestPaySlipDoc?: string;
  doc?: string;
  mimeType?: string; // <-- Added for compatibility with company docs
}

const processCompanyDocs = (companyDoc: Document) => {
  const docs = [];
  if (companyDoc.offerLetterDoc) {
    docs.push({
      name: 'Offer Letter',
      type: 'Offer Letter',
      mimeType: 'application/pdf',
      base64Doc: companyDoc.offerLetterDoc,
      uploadDate: companyDoc.uploadDate,
    });
  }
  if (companyDoc.latestPaySlipDoc) {
    docs.push({
      name: 'Pay Slip',
      type: 'Pay Slip',
      mimeType: 'application/pdf',
      base64Doc: companyDoc.latestPaySlipDoc,
      uploadDate: companyDoc.uploadDate,
    });
  }
  if (companyDoc.doc) {
    docs.push({
      name: 'Other Document',
      type: 'Other Document',
      mimeType: 'application/pdf',
      base64Doc: companyDoc.doc,
      uploadDate: companyDoc.uploadDate,
    });
  }
  return docs;
};

const DocumentCenter = () => {
  const { employeeId: authEmployeeId, isAuthenticated, logout } = useAuth();
  const employeeId = authEmployeeId;
  const [personalDocs, setPersonalDocs] = useState<Document[]>([]);
  const [companyDocs, setCompanyDocs] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ uri: string; mimeType: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchEmployeeDocuments();
    fetchCompanyDocuments();
  }, [employeeId]);

  const fetchEmployeeDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/documents/employee/${employeeId}`);
      setPersonalDocs(res.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch personal documents.');
      setPersonalDocs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/employee-images/emp/${employeeId}`);
      console.log('Company doc response:', res.data);
      let processedDocs: Document[] = [];
      if (Array.isArray(res.data)) {
        // If array, process each item
        processedDocs = res.data.flatMap(processCompanyDocs);
      } else if (res.data) {
        // If single object, process directly
        processedDocs = processCompanyDocs(res.data);
      }
      setCompanyDocs(processedDocs);
      setError(null);
    } catch (err) {
      setError('Failed to fetch company documents.');
      setCompanyDocs([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      handleUpload(file);
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleUpload = async (file: { uri: string; name: string; mimeType?: string }) => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);
      formData.append('employeeId', String(employeeId));
      await axios.post(`${API_BASE_URL}/documents/upload/${employeeId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchEmployeeDocuments();
      Alert.alert('Success', 'Document uploaded successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (base64String: string, mimeType: string, fileName = 'document') => {
    if (!base64String) {
      Alert.alert('Error', 'Document content is empty.');
      return;
    }
    try {
      // Use the same logic as admin: write file and share
      const ext = mimeType.startsWith('application/pdf') ? '.pdf' : mimeType.startsWith('image/') ? '.jpg' : '';
      const safeName = (fileName || 'document').replace(/[^a-zA-Z0-9]/g, '_') + ext;
      const fileUri = FileSystem.cacheDirectory + safeName;
      await FileSystem.writeAsStringAsync(fileUri, base64String, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(fileUri, { mimeType });
    } catch (error) {
      Alert.alert('Error', 'Could not display document.');
    }
  };

  const filteredPersonalDocs = personalDocs.filter(doc =>
    doc.name?.toLowerCase().includes(search.toLowerCase()) ||
    doc.type?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCompanyDocs = companyDocs.filter(doc => {
    // Fallbacks for name/type
    const docName =
      doc.name ||
      (doc.offerLetterDoc ? 'Offer Letter' : doc.latestPaySlipDoc ? 'Pay Slip' : 'Company Document');
    const docType =
      doc.type ||
      (doc.offerLetterDoc ? 'Offer Letter' : doc.latestPaySlipDoc ? 'Pay Slip' : 'Unknown');
    return (
      docName.toLowerCase().includes(search.toLowerCase()) ||
      docType.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Guard: If employeeId is not available, show a message and do not fetch or render documents
  if (!employeeId) {
    return (
      <View style={styles.page}>
        <Text style={styles.heading}>Document Center</Text>
        <Text style={styles.error}>Employee ID not found. Please log in as an employee to view documents.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {(loading || uploading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
      <ScrollView contentContainerStyle={styles.main}>
        <Text style={styles.heading}>Document Center</Text>
        <TextInput
          style={styles.searchBar}
          placeholder="Search by name or type..."
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.sectionTitle}>Personal Documents</Text>
        {filteredPersonalDocs.map((doc, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardTitle}>{doc.name}</Text>
            <Text style={styles.cardType}>{doc.type}</Text>
            <Text style={styles.cardDate}>Uploaded: {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : 'N/A'}</Text>
            <TouchableOpacity style={styles.viewBtn} onPress={() => handleView(doc.data || doc.base64Doc || '', doc.type || '', doc.name || 'document')}>
              <Feather name="eye" size={18} color="#007AFF" />
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument} disabled={uploading}>
          <Feather name="upload" size={18} color="#fff" />
          <Text style={styles.uploadBtnText}>{uploading ? 'Uploading...' : 'Upload Personal Document'}</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Company Documents</Text>
        {companyDocs.map((doc, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardTitle}>{doc.name}</Text>
            <Text style={styles.cardType}>{doc.type}</Text>
            <Text style={styles.cardDate}>
              Uploaded: {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : 'N/A'}
            </Text>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => {
                if (!doc.base64Doc) {
                  Alert.alert('Error', 'No document data available.');
                  return;
                }
                let fileName = doc.name;
                let mimeType = doc.mimeType || 'application/pdf';
                if (mimeType === 'application/pdf') fileName += '.pdf';
                handleView(doc.base64Doc, mimeType, fileName);
              }}
            >
              <Feather name="eye" size={18} color="#007AFF" />
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        ))}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f2f6ff' },
  main: { padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  searchBar: { backgroundColor: '#fff', borderRadius: 8, padding: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#1a1a1a' },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e1e1e1' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  cardType: { fontSize: 14, color: '#666', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#666', marginBottom: 2 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e1e1e1', padding: 8, borderRadius: 4, marginTop: 8, alignSelf: 'flex-start' },
  viewBtnText: { color: '#007AFF', fontWeight: 'bold', marginLeft: 8 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', padding: 12, borderRadius: 8, marginTop: 12, marginBottom: 24, alignSelf: 'flex-start' },
  uploadBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' },
  closeBtn: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  closeBtnText: { fontSize: 20, color: '#c62828' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { fontSize: 14, color: '#666', marginBottom: 8 },
  error: { color: '#c62828', marginTop: 16, textAlign: 'center' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
});

export default DocumentCenter; 