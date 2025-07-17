import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useAuth } from '../../components/AuthContext';

const API_BASE_URL = 'http://192.168.1.42:8080/api';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: string;
  remarks: string;
}

interface EmployeeData {
  name: string;
  id: string;
  department: string;
  designation: string;
}

const AttendanceOverview = () => {
  const router = useRouter();
  const { employeeId, isAuthenticated, logout } = useAuth();
  
  // State management
  const [employeeData, setEmployeeData] = useState<EmployeeData>({
    name: "",
    id: "",
    department: "",
    designation: ""
  });
  
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchTime, setPunchTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [punchInDate, setPunchInDate] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLate, setIsLate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated || !employeeId) {
      console.error('User not authenticated or employee ID missing');
      router.replace('/(auth)/login');
      return;
    }
  }, [isAuthenticated, employeeId, router]);

  const fetchEmployeeData = async () => {
    if (!employeeId) {
      console.error('Employee ID not available');
      setError('Employee ID not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/employee/${employeeId}`);
      
      if (response.status === 200 && response.data) {
        const dept = response.data.department;
        const title = response.data.jobTitle;

        setEmployeeData({
          name: `${response.data.firstName || ''} ${response.data.lastName || ''}`.trim() || "Employee Name",
          id: `KDX-${response.data.id}` || `KDX-${employeeId}`,
          department: (dept && dept.trim() !== '') ? dept.trim() : "Department",
          designation: (title && title.trim() !== '') ? title.trim() : "Designation"
        });
      } else {
        setEmployeeData({
          name: "Unknown (Fallback)",
          id: `KDX-${employeeId}`,
          department: "Unknown (Fallback)",
          designation: "Unknown (Fallback)"
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch employee data:", err);
      setEmployeeData({
        name: "Unknown",
        id: `KDX-${employeeId}`,
        department: "Unknown (Error)",
        designation: "Unknown (Error)"
      });
      
      if (err.response && err.response.status === 401) {
        setError('Authentication failed. Please login again.');
        logout();
        router.replace('/(auth)/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    if (!employeeId) {
      console.error('Employee ID not available for fetching attendance');
      setError('Employee ID not available. Please login again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching attendance data for employee:', employeeId);
      console.log('API URL:', `${API_BASE_URL}/attendances`);
      
      const response = await axios.get(`${API_BASE_URL}/attendances`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Raw attendance response:', response.data);
      console.log('Response status:', response.status);
      console.log('Response data type:', typeof response.data);
      console.log('Is array:', Array.isArray(response.data));
      
      if (response.status === 200) {
        let data = response.data;
        
        // Handle different response formats
        if (!Array.isArray(data)) {
          if (data.data && Array.isArray(data.data)) {
            data = data.data;
          } else if (data.records && Array.isArray(data.records)) {
            data = data.records;
          } else {
            console.error('Unexpected data format:', data);
            setError('Invalid data format received from server');
            return;
          }
        }
        
        console.log('Processed data array:', data);
        console.log('Total records in response:', data.length);
        
        // Filter records for current employee
        const employeeRecords = data.filter((record: any) => {
          console.log('Checking record:', record);
          console.log('Record employeeId:', record.employeeId, 'Type:', typeof record.employeeId);
          console.log('Current employeeId:', employeeId, 'Type:', typeof employeeId);
          return String(record.employeeId) === String(employeeId);
        });
        
        console.log('Filtered employee records:', employeeRecords);
        console.log('Records found for employee:', employeeRecords.length);
        
        // Transform the data for display
        const transformedData = employeeRecords.map((record: any) => ({
        id: String(record.id),
        date: record.date,
          checkIn: record.checkIn ? record.checkIn : 'N/A',
          checkOut: record.checkOut && record.checkOut !== "00:00:00" ? record.checkOut : 'N/A',
        hours: calculateHoursWorkedFromStrings(record.checkIn, record.checkOut),
        status: record.status ? 'Present' : 'Absent',
          remarks: record.remark || ''
      }));
        
        console.log('Transformed attendance data:', transformedData);
        setAttendanceData(transformedData);
        setError(null);
      } else {
        console.error('Unexpected response status:', response.status);
        setError(`Unexpected response status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Failed to fetch attendance data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response) {
        if (error.response.status === 401) {
          setError('Authentication failed. Please login again.');
          logout();
          router.replace('/(auth)/login');
        } else {
          setError(`Failed to load attendance data: ${error.response.data?.message || error.response.data?.error || 'Server error'}`);
        }
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError(`Failed to load attendance data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateHoursWorkedFromStrings = (checkInStr: string, checkOutStr: string) => {
    if (!checkInStr || !checkOutStr || checkOutStr === "00:00:00") {
      return '0h';
    }
    
    const [inHours, inMinutes] = checkInStr.split(':').map(Number);
    const [outHours, outMinutes] = checkOutStr.split(':').map(Number);
    
    let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; 
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const isAfterLateTime = (time: Date | string) => {
    if (typeof time === 'string') {
      const [hours, minutes] = time.split(':').map(Number);
      return (hours > 10 || (hours === 10 && minutes >= 15));
    } else if (time instanceof Date) {
      const lateHour = 10;
      const lateMinute = 15;
      return (time.getHours() > lateHour || 
            (time.getHours() === lateHour && time.getMinutes() >= lateMinute));
    }
    return false;
  };

  const formatTimeForAPI = (date: Date) => {
    return date.toTimeString().slice(0, 8);
  };

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handlePunch = async () => {
    if (!employeeId) {
      setError('Employee ID not available. Please login again.');
      return;
    }

    const now = new Date();
    const formattedDate = formatDateForAPI(now);
    const formattedTime = formatTimeForAPI(now);

    try {
      if (!isPunchedIn) {
        const punchInData = {
          employeeId: employeeId,
          date: formattedDate,
          checkIn: formattedTime,
          checkOut: "00:00:00",
          status: true,
          remark: isAfterLateTime(now) ? "Late arrival" : "Good"
        };

        const response = await axios.post(`${API_BASE_URL}/attendances`, punchInData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200 || response.status === 201) {
          setPunchTime(now);
          setPunchInDate(now);
          setIsPunchedIn(true);
          setElapsedTime(0);
          setCurrentAttendanceId(String(response.data.id));
          
          if (isAfterLateTime(now)) {
            setStatusMessage("You are late today!");
            setIsLate(true);
          } else {
            setStatusMessage("Have a productive day!");
            setIsLate(false);
          }
          
          await fetchAttendanceData();
        }
      } else {
        if (!currentAttendanceId) {
          throw new Error('No active attendance record found');
        }
        
        // Create punch out data with current time
        const punchOutData = {
          employeeId: employeeId,
          date: formattedDate,
          checkIn: punchTime ? formatTimeForAPI(punchTime) : "00:00:00",
          checkOut: formattedTime,
          status: true,
          remark: isLate ? "Late arrival" : "Good"
        };

        console.log('Punch out data:', punchOutData);
        console.log('Updating attendance ID:', currentAttendanceId);

        const response = await axios.put(`${API_BASE_URL}/attendances/${currentAttendanceId}`, punchOutData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('Punch out response:', response.data);

        if (response.status === 200) {
          setIsPunchedIn(false);
          setPunchTime(null);
          setPunchInDate(null);
          setCurrentAttendanceId(null);
          setStatusMessage("Thanks! Have a nice day!");
          setIsLate(false);
          
          // Refresh attendance data immediately
          await fetchAttendanceData();
        }
      }
    } catch (error: any) {
      console.error('Failed to update attendance:', error);
      if (error.response) {
        if (error.response.status === 401) {
          setError('Authentication failed. Please login again.');
          logout();
          router.replace('/(auth)/login');
        } else {
          setError(`Failed: ${error.response.data?.message || 'Server error'}`);
        }
      } else if (error.request) {
        setError('No server response.');
      } else {
        setError(`Error: ${error.message}`);
      }
    }
  };

  const checkExistingPunch = async () => {
    if (!employeeId) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/attendances`);
      const today = formatDateForAPI(new Date());
      
      const record = response.data.find((r: any) =>
        r.date === today && 
        r.employeeId === employeeId &&
        (!r.checkOut || r.checkOut === "00:00:00")
      );

      if (record) {
        setIsPunchedIn(true);
        
        const checkInTime = new Date();
        const [hours, minutes, seconds] = record.checkIn.split(':').map(Number);
        checkInTime.setHours(hours, minutes, seconds);
        
        setPunchTime(checkInTime);
        setPunchInDate(checkInTime);
        setCurrentAttendanceId(String(record.id));
        setIsLate(isAfterLateTime(record.checkIn));
        setStatusMessage(isAfterLateTime(record.checkIn) ? "You are late today!" : "Have a productive day!");
      }
    } catch (err) {
      console.error("Check existing punch error:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && employeeId) {
      fetchEmployeeData();
      fetchAttendanceData();
      checkExistingPunch();
    }
  }, [isAuthenticated, employeeId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      if (isPunchedIn && punchTime) {
        const diff = Math.floor((now.getTime() - punchTime.getTime()) / 1000);
        setElapsedTime(diff);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPunchedIn, punchTime]);

  const filteredData = attendanceData
    .filter(item => {
      // Apply status filter if set
      if (statusFilter && item.status !== statusFilter) {
        return false;
      }
      
      // Apply date filter if set
      if (dateFilter && !item.date.includes(dateFilter)) {
        return false;
      }
      
      // Apply search filter if set
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
    return (
          item.date.toLowerCase().includes(searchLower) ||
          item.status.toLowerCase().includes(searchLower) ||
          item.remarks.toLowerCase().includes(searchLower) ||
          item.checkIn.toLowerCase().includes(searchLower) ||
          item.checkOut.toLowerCase().includes(searchLower)
    );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by date by default (newest first)
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (sortConfig.key === 'date') {
        return sortConfig.direction === 'asc' 
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
      
      // For other fields, use string comparison
      const valueA = String(a[sortConfig.key as keyof AttendanceRecord]).toLowerCase();
      const valueB = String(b[sortConfig.key as keyof AttendanceRecord]).toLowerCase();
      
      if (valueA < valueB) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
      if (valueA > valueB) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const getSummaryData = () => {
    const present = attendanceData.filter(a => a.status === 'Present').length;
    const absent = attendanceData.filter(a => a.status === 'Absent').length;
    const late = attendanceData.filter(a => a.remarks.includes('Late')).length;
    
    return [
      { name: 'Present', population: present, color: '#4CAF50', legendFontColor: '#333', legendFontSize: 14 },
      { name: 'Absent', population: absent, color: '#F44336', legendFontColor: '#333', legendFontSize: 14 },
      { name: 'Late', population: late, color: '#FF9800', legendFontColor: '#333', legendFontSize: 14 },
    ];
  };

  const getTotalsByStatus = () => {
    const totals = {
      totalDays: attendanceData.length,
      present: attendanceData.filter(a => a.status === 'Present').length,
      absent: attendanceData.filter(a => a.status === 'Absent').length,
      late: attendanceData.filter(a => a.remarks.includes('Late')).length,
      overtime: attendanceData.filter(a => a.remarks.includes('Overtime')).length,
      wfh: attendanceData.filter(a => a.remarks.includes('WFH')).length,
    };
    return totals;
  };

  const totals = getTotalsByStatus();

  const handleSort = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const exportToCSV = async () => {
    try {
      const headers = ['Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Remarks'];
      const dataRows = filteredData.map(item => 
        [item.date, item.checkIn, item.checkOut, item.hours, item.status, item.remarks]
      );
      
      const csvContent = [
        headers.join(','),
        ...dataRows.map(row => row.join(','))
      ].join('\n');
      
      const fileName = `attendance_report_${formatDateForAPI(new Date())}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Export Complete', 'CSV file has been saved to your device.');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export attendance data.');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Present': return '#4CAF50';
      case 'Absent': return '#F44336';
      case 'Late': return '#FF9800';
      case 'WFH': return '#2196F3';
      case 'Overtime': return '#9C27B0';
      default: return '#757575';
    }
  };

  const formatDate = (dateString: string) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' } as const;
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const renderAttendanceItem = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.recordRow}>
      <Text style={styles.cell}>{formatDate(item.date)}</Text>
      <Text style={styles.cell}>{item.checkIn}</Text>
      <Text style={styles.cell}>{item.checkOut}</Text>
      <Text style={styles.cell}>{item.hours}</Text>
      <View style={styles.statusCell}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
      <Text style={styles.cell}>{item.status}</Text>
      </View>
      <Text style={styles.cell}>{item.remarks}</Text>
    </View>
  );

  if (!isAuthenticated || !employeeId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Attendance Overview</Text>
        <Text style={styles.error}>Authentication required. Please log in.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Attendance Overview</Text>
      
      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Employee Details Card */}
      <View style={styles.employeeCard}>
        <Text style={styles.sectionTitle}>Employee Details</Text>
        <View style={styles.employeeDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{employeeData.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Employee ID:</Text>
            <Text style={styles.detailValue}>{employeeData.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Department:</Text>
            <Text style={styles.detailValue}>{employeeData.department}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Designation:</Text>
            <Text style={styles.detailValue}>{employeeData.designation}</Text>
          </View>
        </View>

        {/* Time Action Section */}
        <View style={styles.timeAction}>
          <View style={styles.currentTime}>
            <MaterialIcons name="access-time" size={20} color="#007AFF" />
            <Text style={styles.timeText}>{currentTime.toLocaleTimeString()}</Text>
          </View>
          {isPunchedIn && (
            <View style={styles.elapsedTime}>
              <Text style={styles.elapsedText}>Time elapsed: {formatElapsedTime(elapsedTime)}</Text>
            </View>
          )}
          <TouchableOpacity 
            style={[styles.punchButton, isPunchedIn ? styles.punchOut : styles.punchIn]}
            onPress={handlePunch}
          >
            <Text style={styles.punchButtonText}>
              {isPunchedIn ? 'Punch Out' : 'Punch In'}
            </Text>
          </TouchableOpacity>
          {statusMessage && (
            <Text style={[styles.statusMessage, isLate && isPunchedIn ? styles.lateMessage : null]}>
              {statusMessage}
            </Text>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Total Days</Text>
          <Text style={styles.statValue}>{totals.totalDays}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Present</Text>
          <Text style={styles.statValue}>{totals.present}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Absent</Text>
          <Text style={styles.statValue}>{totals.absent}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Work from Home</Text>
          <Text style={styles.statValue}>{totals.wfh}</Text>
        </View>
      </View>

      {/* Attendance Summary Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance Summary</Text>
        <PieChart
          data={getSummaryData()}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
        />
      </View>

      {/* Attendance History */}
      <View style={styles.section}>
        <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Attendance History</Text>
          <View style={styles.viewControls}>
            <View style={styles.viewToggle}>
              <TouchableOpacity 
                style={[styles.toggleButton, viewMode === 'table' ? styles.activeToggle : null]} 
                onPress={() => setViewMode('table')}
              >
                <Text style={[styles.toggleText, viewMode === 'table' ? styles.activeToggleText : null]}>
                  Table View
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, viewMode === 'calendar' ? styles.activeToggle : null]} 
                onPress={() => setViewMode('calendar')}
              >
                <Text style={[styles.toggleText, viewMode === 'calendar' ? styles.activeToggleText : null]}>
                  Calendar View
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.exportBtn} onPress={exportToCSV}>
              <MaterialIcons name="file-download" size={16} color="#fff" />
              <Text style={styles.exportBtnText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug Info */}
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Total Records: {attendanceData.length}</Text>
          <Text style={styles.debugText}>Filtered Records: {filteredData.length}</Text>
          <Text style={styles.debugText}>Employee ID: {employeeId}</Text>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={16} color="#666" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search..." 
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialIcons name="filter-list" size={16} color="#007AFF" />
            <Text style={styles.filterButtonText}>Filters</Text>
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filterControls}>
            <TextInput 
              style={styles.filterInput}
              placeholder="Date filter (YYYY-MM-DD)"
              value={dateFilter}
              onChangeText={setDateFilter}
            />
            <View style={styles.statusFilterContainer}>
              <TextInput 
                style={styles.filterInput}
                placeholder="Status filter"
                value={statusFilter}
                onChangeText={setStatusFilter}
              />
            </View>
          </View>
        )}

        {viewMode === 'table' ? (
          <View style={styles.tableView}>
        <View style={styles.tableHeader}>
              <TouchableOpacity style={styles.headerCell} onPress={() => handleSort('date')}>
                <Text style={styles.headerCellText}>Date</Text>
                {sortConfig.key === 'date' && (
                  <MaterialIcons 
                    name={sortConfig.direction === 'asc' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                    size={16} 
                    color="#007AFF" 
                  />
                )}
              </TouchableOpacity>
              <Text style={styles.headerCellText}>Check In</Text>
              <Text style={styles.headerCellText}>Check Out</Text>
              <Text style={styles.headerCellText}>Hours</Text>
              <TouchableOpacity style={styles.headerCell} onPress={() => handleSort('status')}>
                <Text style={styles.headerCellText}>Status</Text>
                {sortConfig.key === 'status' && (
                  <MaterialIcons 
                    name={sortConfig.direction === 'asc' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                    size={16} 
                    color="#007AFF" 
                  />
                )}
              </TouchableOpacity>
              <Text style={styles.headerCellText}>Remarks</Text>
        </View>
        <FlatList
              data={filteredData}
          renderItem={renderAttendanceItem}
          keyExtractor={item => item.id}
              ListEmptyComponent={!loading ? <Text style={styles.noData}>No records found matching your filters.</Text> : null}
              scrollEnabled={false}
        />
          </View>
        ) : (
          <View style={styles.calendarView}>
            <Text style={styles.comingSoon}>Calendar view will be implemented soon.</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Copyright © 2025 Kodvix Technologies. All Rights Reserved.</Text>
        <TouchableOpacity>
          <Text style={styles.footerLink}>Kodvix Technologies</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8fb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a7ea4',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 16,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a7ea4',
    marginBottom: 10,
  },
  employeeDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#666',
    width: 110,
  },
  detailValue: {
    color: '#222',
    fontWeight: '500',
  },
  timeAction: {
    marginTop: 10,
    alignItems: 'center',
  },
  currentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    marginLeft: 6,
    fontSize: 16,
    color: '#0a7ea4',
    fontWeight: 'bold',
  },
  elapsedTime: {
    marginBottom: 6,
  },
  elapsedText: {
    color: '#666',
    fontSize: 14,
  },
  punchButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
    elevation: 2,
  },
  punchIn: {
    backgroundColor: '#00C851',
  },
  punchOut: {
    backgroundColor: '#F44336',
  },
  punchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusMessage: {
    marginTop: 6,
    color: '#0a7ea4',
    fontWeight: '600',
    textAlign: 'center',
  },
  lateMessage: {
    color: '#FF9800',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 4,
    paddingVertical: 18,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginRight: 12,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 12,
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  filters: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    marginLeft: 8,
    fontSize: 14,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonText: {
    marginLeft: 4,
    color: '#007AFF',
    fontSize: 14,
  },
  filterControls: {
    marginBottom: 12,
  },
  filterInput: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  statusFilterContainer: {
    marginTop: 8,
  },
  tableView: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCellText: {
    flex: 1,
    fontWeight: 'bold',
    color: '#007AFF',
    fontSize: 12,
  },
  recordRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cell: {
    flex: 1,
    fontSize: 11,
    color: '#333',
  },
  statusCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 16,
  },
  calendarView: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  comingSoon: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  error: {
    color: '#c62828',
    marginBottom: 16,
    textAlign: 'center',
  },
  debugInfo: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

export default AttendanceOverview; 