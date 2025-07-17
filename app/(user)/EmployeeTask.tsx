import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../components/AuthContext';

axios.defaults.baseURL = 'http://192.168.1.42:8080';

const EmployeeTask = () => {
  const [tasksData, setTasksData] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [view, setView] = useState('current');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const { employeeId, userRole } = useAuth();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const response = await axios.get('/api/companies');
        setCompanies(response.data);
        if (response.data.length > 0) {
          setSelectedCompany(response.data[0].name);
        }
      } catch (err) {
        setError('Failed to fetch companies. Please try again later.');
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedCompany) {
        setProjects([]);
        setSelectedProject('');
        return;
      }
      try {
        setLoadingProjects(true);
        const response = await axios.get('/api/companies');
        const company = response.data.find(c => c.name === selectedCompany);
        if (company && company.projects) {
          setProjects(company.projects);
          if (company.projects.length > 0) {
            setSelectedProject(company.projects[0].name);
          } else {
            setSelectedProject('');
          }
        } else {
          setProjects([]);
        }
      } catch (err) {
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [selectedCompany]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        let allTasks = [];
        try {
          const tasksResponse = await axios.get(`/api/tasks/employee/${employeeId}`);
          allTasks = tasksResponse?.data || [];
        } catch (err) {
          allTasks = [];
        }
        let filteredTasks = allTasks;
        if (selectedCompany) {
          filteredTasks = filteredTasks.filter(task => {
            if (task.companyName) {
              return task.companyName === selectedCompany;
            } else {
              const company = companies.find(c => c.projects && c.projects.some(p => p.id === task.projectId));
              return company && company.name === selectedCompany;
            }
          });
        }
        if (selectedProject) {
          filteredTasks = filteredTasks.filter(task => {
            const project = projects.find(p => p.name === selectedProject);
            return project && task.projectId === project.id;
          });
        }
        const formatted = filteredTasks.map(task => ({
          id: task.id || 0,
          title: task.title || 'Untitled Task',
          description: task.description || '',
          dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
          status: task.completedAt ? 'COMPLETED' : (task.progress && task.progress.includes('%')) ? 'PENDING' : 'NOT_STARTED',
          progress: task.progress ? parseInt(task.progress) : 0,
          priority: task.priority || 'MEDIUM',
          assignedTo: task.assignedTo || 'Unassigned',
          projectId: task.projectId || 0,
          completedAt: task.completedAt || null,
          employeeName: task.assignedTo || 'Unassigned',
          companyName: task.companyName || selectedCompany || 'Unknown Company',
          projectName: task.projectName || selectedProject || 'Unknown Project',
          empId: task.empId || 0
        }));
        setTasksData(formatted);
        setError(null);
      } catch (err) {
        setError('Failed to process tasks. Please try again later.');
        setTasksData([]);
      } finally {
        setLoading(false);
      }
    };
    if (employeeId) {
      fetchTasks();
    }
  }, [employeeId, selectedProject, projects, selectedCompany, companies]);

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const taskToUpdate = tasksData.find(task => task.id === taskId);
      if (!taskToUpdate) return;
      let apiProgress;
      let apiCompleted = false;
      let progress;
      let completedAt = null;
      switch (newStatus) {
        case 'COMPLETED':
          apiProgress = '100% done';
          apiCompleted = true;
          progress = 100;
          completedAt = new Date().toISOString();
          break;
        case 'PENDING':
          apiProgress = '50% done';
          apiCompleted = false;
          progress = 50;
          completedAt = null;
          break;
        default:
          apiProgress = '0% done';
          apiCompleted = false;
          progress = 0;
          completedAt = null;
      }
      const updates = {
        id: taskId,
        title: taskToUpdate.title,
        description: taskToUpdate.description,
        priority: taskToUpdate.priority,
        dueDate: taskToUpdate.dueDate.includes('T') ? taskToUpdate.dueDate : `${taskToUpdate.dueDate}T23:59:00`,
        assignedTo: taskToUpdate.assignedTo,
        completed: apiCompleted,
        progress: apiProgress,
        projectId: taskToUpdate.projectId,
        empId: taskToUpdate.empId || employeeId,
        completedAt: completedAt
      };
      const response = await axios.put(`/api/tasks/${taskId}`, updates);
      if (response.data) {
        setTasksData(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? {
              ...task,
              ...response.data,
              status: response.data.progress === '100% done' ? 'COMPLETED' : response.data.progress === '50% done' ? 'PENDING' : 'NOT_STARTED',
              progress: response.data.progress === '100% done' ? 100 : response.data.progress === '50% done' ? 50 : 0,
              dueDate: response.data.dueDate ? response.data.dueDate.split('T')[0] : task.dueDate,
              completedAt: response.data.completedAt || completedAt,
              completed: response.data.completed || apiCompleted
            } : task
          )
        );
        setSelectedTask(null);
      }
    } catch (err) {
      // Removed: Toast.show({ type: 'error', text1: 'Failed to update task.' });
    }
  };

  const filteredTasks = tasksData.filter(task =>
    task.title.toLowerCase().includes(searchText.toLowerCase()) ||
    task.priority.toLowerCase().includes(searchText.toLowerCase())
  );
  const getTasksByStatus = (status) => filteredTasks.filter(task => task.status === status);
  const notStartedTasks = getTasksByStatus('NOT_STARTED');
  const pendingTasks = getTasksByStatus('PENDING');
  const completedTasks = getTasksByStatus('COMPLETED');

  const renderTaskCard = (task, status) => (
    <View key={task.id} style={styles.card}>
      <Text style={styles.cardTitle}>{task.title}</Text>
      <Text style={styles.description}>{task.description}</Text>
      <Text style={styles.dueDate}>Due: {task.dueDate}</Text>
      <Text style={styles.priority}>Priority: {task.priority}</Text>
      <Text style={styles.companyName}>Company: {task.companyName}</Text>
      <Text style={styles.projectName}>Project: {task.projectName}</Text>
      <Text style={[styles.statusBadge, styles[task.status.toLowerCase()]]}>{task.status.replace('_', ' ')}</Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${task.progress}%`, backgroundColor: task.status === 'COMPLETED' ? '#4CAF50' : task.status === 'PENDING' ? '#FF9800' : '#ccc' }]} />
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewButton} onPress={() => setSelectedTask(task)}>
          <Text style={styles.buttonText}>View Details</Text>
        </TouchableOpacity>
        {status === 'NOT_STARTED' && (
          <>
            <TouchableOpacity style={styles.startButton} onPress={() => handleUpdateTaskStatus(task.id, 'PENDING')}>
              <Text style={styles.buttonText}>Start Task</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeButton} onPress={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}>
              <Text style={styles.buttonText}>Completed</Text>
            </TouchableOpacity>
          </>
        )}
        {status === 'PENDING' && (
          <TouchableOpacity style={styles.completeButton} onPress={() => handleUpdateTaskStatus(task.id, 'COMPLETED')}>
            <Text style={styles.buttonText}>Mark Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loadingCompanies) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /><Text>Loading companies...</Text></View>
    );
  }

  return (
    <View style={styles.pageWrapper}>
      <ScrollView contentContainerStyle={styles.main}>
        <Text style={styles.header}>All Tasks</Text>
        <View style={styles.filtersSection}>
          <View style={styles.filterGroup}>
            <Text>Company:</Text>
            <Picker
              selectedValue={selectedCompany}
              onValueChange={setSelectedCompany}
              enabled={!loadingCompanies}
              style={styles.picker}
            >
              <Picker.Item label="All Companies" value="" />
              {companies.map(company => (
                <Picker.Item key={company.id} label={company.name} value={company.name} />
              ))}
            </Picker>
          </View>
          <View style={styles.filterGroup}>
            <Text>Project:</Text>
            <Picker
              selectedValue={selectedProject}
              onValueChange={setSelectedProject}
              enabled={!loadingProjects && !!selectedCompany}
              style={styles.picker}
            >
              <Picker.Item label="All Projects" value="" />
              {projects.map(project => (
                <Picker.Item key={project.id} label={project.name} value={project.name} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, view === 'current' && styles.activeTab]} onPress={() => setView('current')}>
            <Text style={view === 'current' ? styles.activeTabText : styles.tabText}>Current Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, view === 'history' && styles.activeTab]} onPress={() => setView('history')}>
            <Text style={view === 'history' ? styles.activeTabText : styles.tabText}>Task History</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.searchBar}
          placeholder="Search by title or priority..."
          value={searchText}
          onChangeText={setSearchText}
        />
        <View style={styles.taskSummary}>
          <Text>Total Tasks: {filteredTasks.length}</Text>
          <Text>Not Started: {notStartedTasks.length}</Text>
          <Text>In Progress: {pendingTasks.length}</Text>
          <Text>Completed: {completedTasks.length}</Text>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : view === 'current' ? (
          <>
            <Text style={styles.sectionTitle}>🕒 Not Started</Text>
            {notStartedTasks.length > 0 ? notStartedTasks.map(task => renderTaskCard(task, 'NOT_STARTED')) : <Text style={styles.noTasks}>No tasks found.</Text>}
            <Text style={styles.sectionTitle}>⏳ In Progress</Text>
            {pendingTasks.length > 0 ? pendingTasks.map(task => renderTaskCard(task, 'PENDING')) : <Text style={styles.noTasks}>No tasks found.</Text>}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Completed Tasks</Text>
            {completedTasks.length > 0 ? completedTasks.map(task => renderTaskCard(task, 'COMPLETED')) : <Text style={styles.noTasks}>No completed tasks found.</Text>}
          </>
        )}
      </ScrollView>
      <Modal visible={!!selectedTask} animationType="slide" transparent onRequestClose={() => setSelectedTask(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedTask(null)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            {selectedTask && (
              <>
                <Text style={styles.modalTitle}>{selectedTask.title}</Text>
                <Text style={styles.modalDescription}>{selectedTask.description}</Text>
                <Text>Priority: {selectedTask.priority}</Text>
                <Text>Assigned To: {selectedTask.assignedTo}</Text>
                <Text>Due Date: {selectedTask.dueDate}</Text>
                <Text>Status: {selectedTask.status.replace('_', ' ')}</Text>
                <Text>Project ID: {selectedTask.projectId}</Text>
                <Text>Company: {selectedTask.companyName}</Text>
                <Text>Project: {selectedTask.projectName}</Text>
                {selectedTask.completedAt && <Text>Completed At: {new Date(selectedTask.completedAt).toLocaleString()}</Text>}
                <View style={styles.modalActions}>
                  {selectedTask.status === 'NOT_STARTED' && (
                    <>
                      <TouchableOpacity style={styles.startButton} onPress={() => handleUpdateTaskStatus(selectedTask.id, 'PENDING')}>
                        <Text style={styles.buttonText}>Start Task</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.completeButton} onPress={() => handleUpdateTaskStatus(selectedTask.id, 'COMPLETED')}>
                        <Text style={styles.buttonText}>Mark as Complete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedTask.status === 'PENDING' && (
                    <TouchableOpacity style={styles.completeButton} onPress={() => handleUpdateTaskStatus(selectedTask.id, 'COMPLETED')}>
                      <Text style={styles.buttonText}>Mark as Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  pageWrapper: { flex: 1, backgroundColor: '#f2f6ff' },
  main: { padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  filtersSection: { flexDirection: 'row', marginBottom: 12 },
  filterGroup: { flex: 1, marginRight: 8 },
  picker: { backgroundColor: '#fff', borderRadius: 8, marginTop: 4 },
  tabs: { flexDirection: 'row', marginBottom: 12 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#e1e1e1' },
  activeTab: { borderBottomColor: '#007AFF' },
  tabText: { color: '#666' },
  activeTabText: { color: '#007AFF', fontWeight: 'bold' },
  searchBar: { backgroundColor: '#fff', borderRadius: 8, padding: 8, marginBottom: 12 },
  taskSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#1a1a1a' },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e1e1e1' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  description: { fontSize: 14, color: '#666', marginBottom: 4 },
  dueDate: { fontSize: 12, color: '#666', marginBottom: 2 },
  priority: { fontSize: 12, color: '#666', marginBottom: 2 },
  companyName: { fontSize: 12, color: '#666', marginBottom: 2 },
  projectName: { fontSize: 12, color: '#666', marginBottom: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  not_started: { backgroundColor: '#ccc', color: '#333' },
  pending: { backgroundColor: '#FF9800', color: '#fff' },
  completed: { backgroundColor: '#4CAF50', color: '#fff' },
  progressBarContainer: { height: 8, backgroundColor: '#eee', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  progressBar: { height: 8, borderRadius: 4 },
  cardActions: { flexDirection: 'row', marginTop: 8 },
  viewButton: { backgroundColor: '#007AFF', padding: 8, borderRadius: 4, marginRight: 8 },
  startButton: { backgroundColor: '#FF9800', padding: 8, borderRadius: 4, marginRight: 8 },
  completeButton: { backgroundColor: '#4CAF50', padding: 8, borderRadius: 4 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  noTasks: { color: '#999', textAlign: 'center', marginVertical: 8 },
  error: { color: '#c62828', marginBottom: 16, textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%' },
  closeButton: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  closeButtonText: { fontSize: 20, color: '#c62828' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalDescription: { fontSize: 14, color: '#666', marginBottom: 8 },
  modalActions: { flexDirection: 'row', marginTop: 12 },
});

export default EmployeeTask; 