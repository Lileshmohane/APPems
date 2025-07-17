import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView, StyleSheet,
    Text,
    View
} from 'react-native';

const API_URL = 'http://192.168.1.42:8080/api';

// Type definitions
interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  assignedTo: string;
  dueDate: string;
}

const StatusBadge = ({ status, style }: { status?: string, style?: any}) => {
    const getColor = () => {
      switch (status?.toLowerCase()) {
        case 'active': return '#00C851';
        case 'pending': return '#ffbb33';
        case 'approved': return '#00C851';
        case 'rejected': return '#ff4444';
        case 'completed': return '#00C851';
        default: return '#999';
      }
    };
  
    return (
      <View style={[styles.statusBadge, { backgroundColor: getColor() }, style]}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    );
  };

const AdminDashboard = () => {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ employees: 0, leaveRequests: 0, activeTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [employeesRes, leavesRes, tasksRes] = await Promise.all([
        fetch(`${API_URL}/employee`),
        fetch(`${API_URL}/leaves/`),
        fetch(`${API_URL}/tasks`)
      ]);

      const [employeesData, leavesData, tasksData] = await Promise.all([
        employeesRes.json(),
        leavesRes.json(),
        tasksRes.json()
      ]);

      // Debug: Log leavesData to inspect structure
      console.log('leavesData:', JSON.stringify(leavesData, null, 2));

      setStats({
          employees: employeesData.length || 0,
          leaveRequests: leavesData.length || 0,
          activeTasks: tasksData.filter((t: Task) => !t.completed).length || 0,
      });

      setLeaveRequests(leavesData.map((leave: any) => ({
        id: leave.id,
        leaveType: leave.leaveType || 'Not Specified',
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason || 'No reason provided',
        status: (leave.status || 'PENDING').toUpperCase(),
        employee: {
          id: leave.employeeId || '',
          name: `${leave.firstName || 'Unknown'} ${leave.lastName || ''}`.trim(),
          email: leave.email || 'No email'
        }
      })));

      setTasks(tasksData || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        logout();
        router.replace('/login');
      }
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    if(!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchDashboardData();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Employees</Text>
          <Text style={styles.statValue}>{stats.employees}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Leave Requests</Text>
          <Text style={styles.statValue}>{stats.leaveRequests}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Tasks</Text>
          <Text style={styles.statValue}>{stats.activeTasks}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Leave Requests</Text>
        {leaveRequests.slice(0, 5).map(request => (
          <View key={request.id} style={styles.leaveCard}>
            <View style={styles.leaveHeader}>
              <View>
                <Text style={styles.employeeName}>{request.employee.name}</Text>
                <Text style={styles.employeeEmail}>{request.employee.email}</Text>
              </View>
              <StatusBadge status={request.status} />
            </View>
            <View style={styles.leaveDetails}>
              <Text style={styles.detailText}>Type: {request.leaveType}</Text>
              <Text style={styles.detailText}>
                Duration: {formatDate(request.startDate)} - {formatDate(request.endDate)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Tasks</Text>
        {tasks.slice(0, 5).map(task => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <StatusBadge 
                status={task.completed ? 'Completed' : 'Pending'}
                style={task.completed ? styles.completedStatus : styles.pendingStatus}
              />
            </View>
            <View style={styles.taskFooter}>
              <Text style={styles.assignedTo}>Assigned to: {task.assignedTo}</Text>
              <Text style={styles.dueDate}>Due: {formatDate(task.dueDate)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8fb', // lighter, modern background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f8fb',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0a7ea4',
    letterSpacing: 0.5,
  },
  errorContainer: {
    margin: 16,
    padding: 14,
    backgroundColor: '#ffebee',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#c62828',
    fontSize: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
    marginHorizontal: 8,
    marginTop: 8,
  },
  statCard: {
    minWidth: '30%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    margin: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e3eaf2',
  },
  statLabel: {
    fontSize: 15,
    color: '#7b8ca6',
    marginBottom: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  section: {
    margin: 16,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    elevation: 3,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 14,
    color: '#0a7ea4',
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  leaveCard: {
    backgroundColor: '#f9fbfd',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e3eaf2',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  employeeEmail: {
    fontSize: 13,
    color: '#7b8ca6',
    marginTop: 2,
  },
  leaveDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e3eaf2',
    paddingTop: 10,
    marginTop: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#7b8ca6',
    marginBottom: 2,
  },
  taskCard: {
    backgroundColor: '#f9fbfd',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e3eaf2',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
    flex: 1,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e3eaf2',
    paddingTop: 10,
    marginTop: 6,
  },
  assignedTo: {
    fontSize: 13,
    color: '#7b8ca6',
  },
  dueDate: {
    fontSize: 13,
    color: '#7b8ca6',
  },
  completedStatus: {
    backgroundColor: '#00C851',
  },
  pendingStatus: {
    backgroundColor: '#ffbb33',
  },
});

export default AdminDashboard; 