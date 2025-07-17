import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity
} from 'react-native';

const API_URL = 'http://192.168.1.42:8080/api/auth';

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestOtp = async () => {
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSuccess('An OTP has been sent to your email.');
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      setSuccess('OTP verified successfully.');
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      setSuccess('Password has been reset successfully.');
      setTimeout(() => router.replace('/(auth)/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.subtitle}>Enter your email to receive an OTP</Text>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <TouchableOpacity style={styles.button} onPress={handleRequestOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.subtitle}>Enter the OTP sent to {email}</Text>
            <TextInput style={styles.input} placeholder="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
            <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
            </TouchableOpacity>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.subtitle}>Enter your new password</Text>
            <TextInput style={styles.input} placeholder="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </TouchableOpacity>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../../assets/images/Kodvixlogo.png')} style={styles.logoBrand} resizeMode="contain" />
      <Text style={styles.title}>Forgot Password</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>{success}</Text> : null}
      {renderStep()}
      <TouchableOpacity onPress={() => router.back()} style={styles.switchLink}>
        <Text style={styles.linkText}>Back to Login</Text>
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
        marginBottom: 24,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
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
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginTop: 12,
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
    successText: {
        color: 'green',
        marginBottom: 12,
    },
    switchLink: {
        marginTop: 24,
    },
    linkText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    logoBrand: {
        width: 220,
        height: 200,
        aspectRatio: 3.2,
        alignSelf: 'center',
        marginBottom: 18,
    },
});

export default ForgotPasswordScreen; 