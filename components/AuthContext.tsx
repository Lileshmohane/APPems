import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type UserRole = 'ADMIN' | 'EMPLOYEE';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  employeeId: string | null;
  userRole: UserRole | null;
  login: (loginResponse: { token: string; role: UserRole; empId: number | string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const empId = await AsyncStorage.getItem('employeeId');
      const userRole = await AsyncStorage.getItem('userRole');
      if (token && empId && userRole) {
        setIsAuthenticated(true);
        setEmployeeId(empId);
        setUserRole(userRole as UserRole);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (loginResponse: { token: string; role: UserRole; empId: number | string }) => {
    try {
      await AsyncStorage.setItem('authToken', loginResponse.token);
      await AsyncStorage.setItem('userRole', loginResponse.role);
      await AsyncStorage.setItem('employeeId', String(loginResponse.empId));
      setIsAuthenticated(true);
      setEmployeeId(String(loginResponse.empId));
      setUserRole(loginResponse.role);
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      setIsAuthenticated(false);
      setEmployeeId(null);
      setUserRole(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, employeeId, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 