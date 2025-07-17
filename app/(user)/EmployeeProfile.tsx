import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../components/AuthContext';

const API_BASE_URL = 'http://192.168.1.42:8080/api';

// Define the employee type
interface Employee {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  salary?: number;
  status: string;
}

const EmployeeProfile = () => {
  const { employeeId: authEmployeeId, isAuthenticated, logout } = useAuth();
  const employeeId = authEmployeeId; // Only use real employeeId
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !employeeId) {
      setError('User not authenticated or employee ID missing');
      return;
    }
  }, [isAuthenticated, employeeId]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!employeeId) {
        setError('Employee ID not available');
        return;
      }
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/employee/${employeeId}`);
        setEmployee(response.data);
        setError(null);
      } catch (err: any) {
        setError('Failed to fetch employee data');
        if (err && err.response && err.response.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeeData();
  }, [employeeId, logout]);

  const handleChange = (field: keyof Employee, value: string) => {
    setEmployee((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      if (!employee) return;
      const res = await axios.put(`${API_BASE_URL}/employee/${employee.id}`, employee);
      setEmployee(res.data);
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      setError('Update error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Processing your request...</Text>
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Failed to load profile information</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Employee Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your professional information and preferences</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}><Feather name="user" size={18} /> Personal Information</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={employee.firstName}
            onChangeText={text => handleChange('firstName', text)}
            editable={editMode}
            placeholder="Enter first name"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={employee.lastName}
            onChangeText={text => handleChange('lastName', text)}
            editable={editMode}
            placeholder="Enter last name"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={employee.email}
            editable={false}
            placeholder="Email address"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={employee.phone}
            onChangeText={text => handleChange('phone', text)}
            editable={editMode}
            placeholder="Phone number"
          />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}><Feather name="briefcase" size={18} /> Professional Information</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Department</Text>
          <TextInput
            style={styles.input}
            value={employee.department}
            editable={false}
            placeholder="Department name"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Job Title</Text>
          <TextInput
            style={styles.input}
            value={employee.jobTitle}
            editable={false}
            placeholder="Job position"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Salary</Text>
          <TextInput
            style={styles.input}
            value={employee.salary ? String(employee.salary) : ''}
            editable={false}
            placeholder="Annual salary"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Status</Text>
          <TextInput
            style={styles.input}
            value={employee.status}
            editable={false}
            placeholder="Status"
          />
        </View>
      </View>
      <View style={styles.actions}>
        {editMode ? (
          <>
            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
            <Feather name="edit" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f2f6ff', flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f6ff' },
  loadingText: { marginTop: 12, color: '#666' },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  headerSubtitle: { color: '#666', fontSize: 14, marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a', flexDirection: 'row', alignItems: 'center' },
  formGroup: { marginBottom: 12 },
  label: { color: '#333', marginBottom: 4, fontSize: 14 },
  input: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, fontSize: 15, borderWidth: 1, borderColor: '#e1e1e1' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', padding: 12, borderRadius: 8 },
  editBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, marginRight: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  cancelBtn: { backgroundColor: '#e1e1e1', padding: 12, borderRadius: 8 },
  cancelBtnText: { color: '#333', fontWeight: 'bold' },
  error: { color: '#c62828', marginTop: 16, textAlign: 'center' },
});

export default EmployeeProfile; 