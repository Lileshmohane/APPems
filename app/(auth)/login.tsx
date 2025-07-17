import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { useAuth, UserRole } from '../../components/AuthContext';

const API_URL = 'http://192.168.1.42:8080/api/auth/login';

const LoginScreen = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      await login({
        token: data.token,
        role: data.role,
        empId: data.empId,
        empName: data.empName || ((data.firstName && data.lastName) ? `${data.firstName} ${data.lastName}` : (data.name || ''))
      });
      // Navigate to correct dashboard after successful login
      if (data.role === 'ADMIN') {
        router.replace('/admin-dashboard');
      } else {
        router.replace('/user-dashboard');
      }
      
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../../assets/images/asset3.png')} style={styles.illustration} />
      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

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

      <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} >
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.switchLink}>
        <Text style={styles.linkText}>Don't have an account? <Text style={{fontWeight: 'bold'}}>Register</Text></Text>
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
  illustration: {
    width: 220,
    height: 160,
    marginBottom: 20,
    resizeMode: 'contain',
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
    marginBottom: 12,
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
  forgotPassword: {
    color: '#007AFF',
    alignSelf: 'flex-end',
    marginBottom: 20,
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

export default LoginScreen;