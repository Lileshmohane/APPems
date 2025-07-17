import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { useAuth, UserRole } from '../../components/AuthContext';

const API_URL = 'http://192.168.1.42:8080/api/auth/register';

const RegisterScreen = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (Object.values(formData).some(val => !val)) {
      setError('Please fill in all fields.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      await login(data.token);
      // Navigate to main app after successful registration
      router.replace('/(tabs)');

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Get started with your new account</Text>
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TextInput style={styles.input} placeholder="First Name" value={formData.firstName} onChangeText={v => updateField('firstName', v)} />
      <TextInput style={styles.input} placeholder="Last Name" value={formData.lastName} onChangeText={v => updateField('lastName', v)} />
      <TextInput style={styles.input} placeholder="Email" value={formData.email} onChangeText={v => updateField('email', v)} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={formData.password} onChangeText={v => updateField('password', v)} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm Password" value={formData.confirmPassword} onChangeText={v => updateField('confirmPassword', v)} secureTextEntry />

      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[styles.roleButton, role === 'EMPLOYEE' && styles.roleSelected]}
          onPress={() => setRole('EMPLOYEE')}
        >
          <Text style={[styles.roleText, role === 'EMPLOYEE' && styles.roleTextSelected]}>Employee</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, role === 'ADMIN' && styles.roleSelected]}
          onPress={() => setRole('ADMIN')}
        >
          <Text style={[styles.roleText, role === 'ADMIN' && styles.roleTextSelected]}>Admin</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.switchLink}>
        <Text style={styles.linkText}>Already have an account? <Text style={{fontWeight: 'bold'}}>Sign In</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#f5f5f5',
      },
      title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
      },
      subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
      },
      input: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        fontSize: 16,
        borderColor: '#ddd',
        borderWidth: 1,
      },
      roleContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        width: '100%',
        justifyContent: 'center',
      },
      roleButton: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: '#007AFF',
        backgroundColor: '#fff',
      },
      roleSelected: {
        backgroundColor: '#007AFF',
      },
      roleText: {
        textAlign: 'center',
        fontWeight: '600',
        color: '#007AFF',
      },
      roleTextSelected: {
        color: '#fff',
      },
      button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
      },
      buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
      },
      errorText: {
        color: 'red',
        marginBottom: 12,
      },
      switchLink: {
        marginTop: 24,
      },
      linkText: {
        color: '#666',
      }
});

export default RegisterScreen; 