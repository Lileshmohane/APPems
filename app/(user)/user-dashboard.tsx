import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    RefreshControl,
    ScrollView, StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../../components/AuthContext';
import UserSidebar from '../../components/UserSidebar';

const API_URL = 'http://192.168.1.42:8080/api';

// Types for API data
interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  progress?: number;
  priority?: string;
}

interface Project {
  id: number;
  name: string;
  tasks?: Task[];
}

interface LeaveRequest {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
}

interface Employee {
  id: number;
  hireDate: string;
}

interface PerformanceDatum {
  month: string;
  notStarted: number;
  completed: number;
  pending: number;
}

interface Stats {
  present: number;
  absent: number;
  wfh: number;
  tasks: number;
  leaveBalance: number;
}

const PriorityBadge = ({ priority }: { priority?: string }) => {
  const getColor = () => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffbb33';
      case 'low': return '#00C851';
      default: return '#999';
    }
  };

  return (
    <View style={[styles.priorityBadge, { backgroundColor: getColor() }]}>
      <Text style={styles.priorityText}>{priority}</Text>
    </View>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: any, label: string, value: number | string, color: string }) => (
  <View style={[styles.statCardModern, { backgroundColor: color + '22' }]}> 
    <View style={[styles.statIconCircle, { backgroundColor: color + '33' }]}> 
      <MaterialIcons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.statValueModern}>{value}</Text>
    <Text style={styles.statLabelModern}>{label}</Text>
  </View>
);

const UserDashboard = () => {
  const { employeeId, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // If employeeId is not available, show a message and do not fetch data
  if (!employeeId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Employee ID not found. Please log in as an employee to view the dashboard.</Text>
      </View>
    );
  }

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({
    present: 0,
    absent: 0,
    wfh: 0,
    tasks: 0,
    leaveBalance: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceDatum[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching dashboard data for employeeId:', employeeId);

      const [
        attendanceResponse,
        tasksResponse,
        projectsResponse,
        employeeResponse,
        leaveRequestsResponse
      ] = await Promise.all([
        fetch(`${API_URL}/attendances/employee/${employeeId}`),
        fetch(`${API_URL}/tasks/employee/${employeeId}`),
        fetch(`${API_URL}/projects`),
        fetch(`${API_URL}/employee/${employeeId}`),
        fetch(`${API_URL}/leaves/employee/${employeeId}`)
      ]);

      console.log('API responses:', {
        attendanceResponse: attendanceResponse.status,
        tasksResponse: tasksResponse.status,
        projectsResponse: projectsResponse.status,
        employeeResponse: employeeResponse.status,
        leaveRequestsResponse: leaveRequestsResponse.status,
      });

      const [
        attendanceData,
        tasksData,
        projectsData,
        employeeData,
        leaveRequestsData
      ] = await Promise.all([
        attendanceResponse.json(),
        tasksResponse.json(),
        projectsResponse.json(),
        employeeResponse.json(),
        leaveRequestsResponse.json()
      ]);

      console.log('API data:', {
        attendanceData,
        tasksData,
        projectsData,
        employeeData,
        leaveRequestsData
      });

      // Calculate leave balance
      let leaveBalance = 0;
      if (employeeData && employeeData.hireDate) {
        const hireDate = new Date(employeeData.hireDate);
        const today = new Date();
        const monthsDiff = (today.getFullYear() - hireDate.getFullYear()) * 12 + 
                         (today.getMonth() - hireDate.getMonth());
        const monthsWorked = Math.max(0, monthsDiff);
        const accruedLeave = monthsWorked * 1.5;
        const approvedLeaveTaken = (leaveRequestsData || [])
          .filter((leave: LeaveRequest) => leave.status === 'APPROVED')
          .reduce((total: number, leave: LeaveRequest) => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            return total + ((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
          }, 0);
        leaveBalance = Math.max(0, accruedLeave - approvedLeaveTaken);
      }

      setStats({
        present: attendanceData?.present || 0,
        absent: attendanceData?.absent || 0,
        wfh: attendanceData?.wfh || 0,
        tasks: (tasksData as Task[])?.length || 0,
        leaveBalance: parseFloat(leaveBalance.toFixed(1)),
      });

      setTasks((tasksData as Task[]) || []);
      setProjects((projectsData as Project[]) || []);
      setLeaveRequests((leaveRequestsData as LeaveRequest[]) || []);
      setPerformanceData(processPerformanceData((tasksData as Task[]) || []));

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // Try to extract status if possible
      if (typeof err === 'object' && err !== null && 'response' in err && (err as any).response?.status === 401) {
        logout();
        router.replace('/login');
      }
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('Finished fetchDashboardData, loading set to false');
    }
  };

  useEffect(() => {
    console.log('UserDashboard useEffect:', { isAuthenticated, employeeId });
    if (isAuthenticated && employeeId) {
      fetchDashboardData();
    }
  }, [isAuthenticated, employeeId]);

  const processPerformanceData = (tasks: Task[]): PerformanceDatum[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => {
      const monthTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getMonth() === months.indexOf(month);
      });
      return {
        month,
        notStarted: monthTasks.filter(task => !task.completed && !task.progress).length,
        completed: monthTasks.filter(task => task.completed).length,
        pending: monthTasks.filter(task => !task.completed && (task.progress ?? 0) > 0).length,
      };
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <>
      <Modal
        visible={sidebarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        >
          <View style={{ width: 250, height: '100%', backgroundColor: 'transparent' }}>
            <UserSidebar onClose={() => setSidebarVisible(false)} />
          </View>
        </TouchableOpacity>
      </Modal>
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
        {/* Remove the dashboard page header (menu button and title) */}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <StatCard icon="event-available" label="Leave" value={stats.leaveBalance} color="#0a7ea4" />
          <StatCard icon="assignment" label="Tasks" value={stats.tasks} color="#FFBB28" />
        </View>

        <View style={styles.sectionModern}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="show-chart" size={20} color="#0a7ea4" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitleModern}>Task Performance</Text>
          </View>
          <LineChart
            data={{
              labels: performanceData.map(d => d.month),
              datasets: [
                {
                  data: performanceData.map(d => d.completed),
                  color: (opacity = 1) => `rgba(0, 196, 159, ${opacity})`,
                  strokeWidth: 2
                },
                {
                  data: performanceData.map(d => d.pending),
                  color: (opacity = 1) => `rgba(255, 128, 66, ${opacity})`,
                  strokeWidth: 2
                }
              ]
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.sectionModern}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="pie-chart" size={20} color="#0a7ea4" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitleModern}>Project Distribution</Text>
          </View>
          <PieChart
            data={projects.map((project, index) => ({
              name: project.name,
              population: project.tasks?.length || 0,
              color: [
                '#00C49F',
                '#FF8042',
                '#0088FE',
                '#FFBB28'
              ][index % 4],
              legendFontColor: '#7F7F7F',
            }))}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
          />
        </View>

        <View style={styles.sectionModern}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="list" size={20} color="#0a7ea4" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitleModern}>Upcoming Tasks</Text>
            {tasks.length > 5 && (
              <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push('/(user)/EmployeeTask')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {tasks.slice(0, 5).map(task => (
            <View key={task.id} style={styles.taskCardModern}>
              <View style={styles.taskHeaderModern}>
                <Text style={styles.taskTitleModern}>{task.title}</Text>
                <PriorityBadge priority={task.priority} />
              </View>
              <Text style={styles.taskDescriptionModern}>{task.description}</Text>
              <View style={styles.taskFooterModern}>
                <Text style={styles.taskDateModern}>Due: {formatDate(task.dueDate)}</Text>
                <Text style={[styles.taskStatusModern, { color: task.completed ? '#00C851' : '#FF8042' }] }>
                  {task.completed ? 'Completed' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f6ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  statCardModern: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#f2f6ff',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 18,
    elevation: 2,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValueModern: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  statLabelModern: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sectionModern: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleModern: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  seeAllBtn: {
    marginLeft: 'auto',
    backgroundColor: '#0a7ea4',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  seeAllText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  taskCardModern: {
    backgroundColor: '#f2f6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  taskHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitleModern: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a7ea4',
    flex: 1,
  },
  taskDescriptionModern: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  taskFooterModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskDateModern: {
    fontSize: 12,
    color: '#888',
  },
  taskStatusModern: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default UserDashboard; 