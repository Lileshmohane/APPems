// Environment configuration
export const BASE_URL = __DEV__ 
  ? 'http://192.168.1.42:8080/api'  // Development environment
  : 'https://your-production-api.com/api'; // Production environment (update this URL)

// API endpoints
export const API_ENDPOINTS = {
  // Employee endpoints
  EMPLOYEE: (id) => `${BASE_URL}/employee/${id}`,
  EMPLOYEE_ADDRESS: (id) => `${BASE_URL}/addresses/employee/${id}`,
  
  // Attendance endpoints
  ATTENDANCES: `${BASE_URL}/attendances`,
  ATTENDANCE_BY_ID: (id) => `${BASE_URL}/attendances/${id}`,
  ATTENDANCE_BY_EMPLOYEE: (employeeId) => `${BASE_URL}/attendances/employee/${employeeId}`,
  
  // Auth endpoints
  LOGIN: `${BASE_URL}/auth/login`,
  LOGOUT: `${BASE_URL}/auth/logout`,
  REFRESH_TOKEN: `${BASE_URL}/auth/refresh`,
  
  // Other endpoints can be added here
  DOCUMENTS: `${BASE_URL}/documents`,
  EVENTS: `${BASE_URL}/events`,
  TASKS: `${BASE_URL}/tasks`,
};

// App configuration
export const APP_CONFIG = {
  APP_NAME: 'Employee Management System',
  COMPANY_NAME: 'Kodvix Technologies',
  VERSION: '1.0.0',
  
  // Time settings
  LATE_ARRIVAL_HOUR: 10,
  LATE_ARRIVAL_MINUTE: 15,
  
  // UI settings
  THEME_COLORS: {
    PRIMARY: '#007AFF',
    SUCCESS: '#4CAF50',
    WARNING: '#FF9800',
    ERROR: '#F44336',
    INFO: '#2196F3',
    BACKGROUND: '#f2f6ff',
  },
  
  // Storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'authToken',
    EMPLOYEE_ID: 'employeeId',
    USER_ROLE: 'userRole',
    USER_PREFERENCES: 'userPreferences',
  },
};

// Development helpers
export const DEV_CONFIG = {
  ENABLE_LOGGING: __DEV__,
  ENABLE_DEBUG_MODE: __DEV__,
  MOCK_API_RESPONSES: false, // Set to true to use mock data
};

// Export default configuration
export default {
  BASE_URL,
  API_ENDPOINTS,
  APP_CONFIG,
  DEV_CONFIG,
}; 