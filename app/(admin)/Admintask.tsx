import { AntDesign, Entypo } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosInstance from '../../utils/axiosInstance';

// Type definitions
interface Task {
  id: number;
  title: string;
  description: string;
  status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string;
  assignedTo: string;
  team: string;
  projectId: number;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface Project {
  id: number;
  name: string;
  description: string;
  companyId: number;
  tasks: Task[];
}

interface Company {
  id: number;
  name: string;
  description: string;
  projects: Project[];
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  username?: string; // Added for newTask payload
}

const formatDateForAPI = (dateString: string | Date): string | null => {
  if (!dateString) return null;
  if (dateString instanceof Date) {
    return dateString.toISOString();
  }
  // Assuming dateString is in 'YYYY-MM-DD' format
  return `${dateString}T10:00:00`;
};

// Helper to format date for Java LocalDateTime
function formatLocalDateTime(date: Date): string {
  // Returns 'YYYY-MM-DDTHH:mm:ss'
  return date.toISOString().slice(0, 19);
}

// Add this function to fetch tasks for a project
const getTasks = async (projectId: number) => {
  try {
    const response = await axiosInstance.get(`/tasks`); // fetch all tasks
    const allTasks = Array.isArray(response.data) ? response.data : [];
    // Filter tasks for this project
    return allTasks.filter(task => task.projectId === projectId);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    return [];
  }
};

// Function to fetch a single task by its ID
const getTaskById = async (taskId: number) => {
  try {
    const response = await axiosInstance.get(`/tasks/${taskId}`);
    return response.data;
  } catch (err) {
    console.error("Error fetching task by ID:", err);
    return null;
  }
};
// Example usage:
// const task = await getTaskById(1);

const Admintask = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState("companies"); // 'companies', 'projects', 'tasks'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // State for new item modals
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // Update newCompany state to include required fields
  type NewCompanyType = { name: string; description: string; email: string; websiteUrl: string; address: string; phoneNumber: string };
  const [newCompany, setNewCompany] = useState<NewCompanyType>({ name: "", description: "", email: "", websiteUrl: "", address: "", phoneNumber: "" });
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    companyId: "",
  });
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    status: "NOT_STARTED" as "NOT_STARTED",
    dueDate: "",
    priority: "MEDIUM" as "MEDIUM",
    projectId: "",
    team: "",
  });

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    assignedTo: string;
    status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
    dueDate: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>({
    title: "",
    description: "",
    assignedTo: "",
    status: "NOT_STARTED",
    dueDate: "",
    priority: "MEDIUM",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState<
    "newTask" | "editTask" | null
  >(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    let isMounted = true;
    try {
      setLoading(true);
      setError(null);
      const companiesResponse = await axiosInstance.get("/companies");
      const employeesResponse = await axiosInstance.get("/employee");

      if (isMounted) {
        setCompanies(companiesResponse.data);
        setEmployees(employeesResponse.data);
      }
    } catch (err: any) {
      console.error("Error initializing data:", err);
      if (err.message.includes("Network")) {
        setError("Network Error: Please check your connection and try again");
      } else {
        setError("Failed to load data. Please try again later.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    return () => {
      isMounted = false;
    };
  };

  const createCompany = async (companyData: NewCompanyType) => {
    try {
      const response = await axiosInstance.post("/companies", companyData);
      setCompanies((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError("Failed to create company");
      throw err;
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await axiosInstance.delete(`/tasks/${id}`);
      if (selectedProject) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                tasks: Array.isArray(prev.tasks)
                  ? prev.tasks.filter((task) => task.id !== id)
                  : [],
              }
            : null
        );
      }
    } catch (err: any) {
      setError("Failed to delete task");
      throw err;
    }
  };

  const handleCompanyClick = async (company: Company) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/companies/${company.id}`);
      setSelectedCompany(response.data);
      setView("projects");
    } catch (err: any) {
      console.error("Error fetching company:", err);
      if (err.message.includes("Network")) {
        setError("Network Error: Please check your connection and try again");
      } else {
        setError("Failed to fetch company details. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = async (project: Project) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/projects/${project.id}`);
      // Fetch tasks for this project by filtering all tasks
      const tasks = await getTasks(project.id);
      setSelectedProject({ ...response.data, tasks });
      setView("tasks");
    } catch (err: any) {
      console.error("Error fetching project:", err);
      if (err.message.includes("Network")) {
        setError("Network Error: Please check your connection and try again");
      } else {
        setError("Failed to fetch project details. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (view === "tasks") {
      setView("projects");
      setSelectedProject(null);
    } else if (view === "projects") {
      setView("companies");
      setSelectedCompany(null);
    }
  };

  const handleNewCompanySubmit = async () => {
    if (!newCompany.name.trim() || !newCompany.email.trim() || !newCompany.websiteUrl.trim() || !newCompany.address.trim() || !newCompany.phoneNumber.trim()) {
      Alert.alert("Error", "All fields are required");
      return;
    }
    try {
      setLoading(true);
      await createCompany(newCompany);
      setShowNewCompanyModal(false);
      setNewCompany({ name: "", description: "", email: "", websiteUrl: "", address: "", phoneNumber: "" });
    } catch (err) {
      setError("Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const handleNewProjectSubmit = async () => {
    if (!newProject.name.trim() || !selectedCompany) {
      Alert.alert("Error", "Project name and a selected company are required");
      return;
    }
    try {
      setLoading(true);
      const projectData = {
        name: newProject.name,
        description: newProject.description,
        companyId: selectedCompany.id, // send companyId as top-level field
      };
      const response = await axiosInstance.post("/projects", projectData);
      setSelectedCompany((prev) =>
        prev
          ? {
              ...prev,
              projects: [...prev.projects, response.data],
            }
          : null
      );
      setShowNewProjectModal(false);
      setNewProject({ name: "", description: "", companyId: "" });
    } catch (err: any) {
      setError("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === "ios");
    if (datePickerFor === "newTask") {
      setNewTask({ ...newTask, dueDate: formatLocalDateTime(currentDate) });
    } else if (datePickerFor === "editTask") {
      setFormData({
        ...formData,
        dueDate: formatLocalDateTime(currentDate),
      });
    }
  };

  const createTask = async (taskData: any) => {
    try {
      const response = await axiosInstance.post("/tasks", taskData);
      if (selectedProject) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                tasks: Array.isArray(prev.tasks)
                  ? [...prev.tasks, response.data]
                  : [response.data],
              }
            : null
        );
      }
      return response.data;
    } catch (err: any) {
      console.error(
        "API Error:",
        err.response ? err.response.data : err.message
      );
      setError("Failed to create task. " + (err.response?.data?.message || ""));
      throw err;
    }
  };

  const updateTask = async (id: number, taskData: any) => {
    try {
      const formattedData = {
        ...taskData,
        // dueDate is already formatted as 'YYYY-MM-DDTHH:mm:ss' by formatLocalDateTime
      };
      console.log("Update Task Payload:", formattedData);
      const response = await axiosInstance.put(`/tasks/${id}`, formattedData);
      if (selectedProject) {
        setSelectedProject((prev) => {
          if (!prev) return null;
          const updatedTasks = prev.tasks.map((task) =>
            task.id === id ? { ...task, ...response.data } : task
          );
          return { ...prev, tasks: updatedTasks };
        });
      }
      return response.data;
    } catch (err: any) {
      console.error(
        "API Error:",
        err.response ? err.response.data : err.message
      );
      setError(
        "Failed to update task. " + (err.response?.data?.message || "")
      );
      throw err;
    }
  };

  const markTaskAsCompleted = async (id: number) => {
    try {
      await axiosInstance.put(`/tasks/${id}/complete`);
      if (selectedProject) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === id ? { ...t, status: "COMPLETED" } : t
                ),
              }
            : null
        );
      }
    } catch (err) {
      setError("Failed to mark task as completed");
    }
  };

  const handleEditTask = async (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: task.employee?.id.toString() || "",
      status: task.status,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      priority: task.priority,
    });
    setIsModalOpen(true);
  };

  const confirmDelete = (taskId: number) => {
    console.log("Confirmed delete for task:", taskId);
    deleteTask(taskId)
      .catch(() => {
        Alert.alert("Error", "Failed to delete task.");
      });
  };

  const handleDeleteTask = (taskId: number) => {
    console.log("Delete button pressed for task:", taskId);

    Alert.alert("Confirm Delete", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => confirmDelete(taskId), // Use a closure to pass the id
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!editingTask) return;
    try {
      setLoading(true);
      await updateTask(editingTask.id, {
        ...formData,
        assignedTo: parseInt(formData.assignedTo),
        projectId: selectedProject?.id, // Ensure projectId is included
      });
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      // Error is handled in updateTask
    } finally {
      setLoading(false);
    }
  };

  const handleNewTaskSubmit = async () => {
    if (!newTask.title.trim() || !selectedProject || !newTask.assignedTo) {
      Alert.alert("Error", "All fields are required, including assignee.");
      return;
    }
    // Find the selected employee object
    const selectedEmployee = employees.find(emp => emp.id.toString() === newTask.assignedTo);
    if (!selectedEmployee) {
      Alert.alert("Error", "Please select a valid employee to assign the task.");
      return;
    }
    try {
      setLoading(true);
      // Build the payload as required by backend
      const payload = {
        // id: (omit for creation, backend will set)
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
        assignedTo: selectedEmployee.username || `${selectedEmployee.firstName}.${selectedEmployee.lastName}`.toLowerCase(),
        completedAt: null, // null for new task
        progress: null, // null for new task
        projectId: selectedProject.id,
        empId: selectedEmployee.id
      };
      console.log("Task payload:", payload);
      await createTask(payload);
      setShowNewTaskModal(false);
      setNewTask({
        title: "",
        description: "",
        assignedTo: "",
        status: "NOT_STARTED",
        dueDate: "",
        priority: "MEDIUM",
        projectId: "",
        team: "",
      });
    } catch (err) {
      // Error is handled in createTask
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "checkcircle";
      case "IN_PROGRESS":
        return "clockcircle";
      case "NOT_STARTED":
        return "minuscircle";
      default:
        return "questioncircle";
    }
  };

  const formatStatus = (status: Task["status"]) =>
    status
      ? status.replace("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
      : "";

  const showDatepickerFor = (field: "newTask" | "editTask") => {
    setDatePickerFor(field);
    setShowDatePicker(true);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {view !== "companies" && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>
        {view === "companies"
          ? "Companies"
          : view === "projects"
          ? selectedCompany?.name
          : selectedProject?.name}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderCompanies = () => (
    <ScrollView>
      {companies.map((company) => (
        <TouchableOpacity
          key={company.id}
          style={styles.listItem}
          onPress={() => handleCompanyClick(company)}
        >
          <Text style={styles.listItemText}>{company.name}</Text>
          <AntDesign name="right" size={20} color="#ccc" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderProjects = () => (
    <ScrollView>
      {selectedCompany?.projects.map((project) => (
        <TouchableOpacity
          key={project.id}
          style={styles.listItem}
          onPress={() => handleProjectClick(project)}
        >
          <Text style={styles.listItemText}>{project.name}</Text>
          <AntDesign name="right" size={20} color="#ccc" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTasks = () => (
    <ScrollView>
      {(Array.isArray(selectedProject?.tasks) ? selectedProject.tasks : []).map((task) => (
        <View key={task.id} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.taskActions}>
              <TouchableOpacity onPress={() => handleEditTask(task)}>
                <AntDesign name="edit" size={20} color="#FFC107" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.taskDescription}>{task.description}</Text>
          <View style={styles.taskMeta}>
            <View style={styles.taskStatus}>
              <AntDesign
                name={getStatusIcon(task.status)}
                size={16}
                color="#fff"
              />
              <Text style={styles.taskMetaText}>{formatStatus(task.status)}</Text>
            </View>
            <Text style={styles.taskMetaText}>
              Due:{" "}
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
          {task.employee && (
            <Text style={styles.taskMetaText}>
              Assigned to: {task.employee.firstName} {task.employee.lastName}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderModal = (
    title: string,
    visible: boolean,
    onRequestClose: () => void,
    children: React.ReactNode,
    onSubmit?: () => void
  ) => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          {children}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.buttonClose]}
              onPress={onRequestClose}
            >
              <Text style={styles.textStyle}>Cancel</Text>
            </TouchableOpacity>
            {onSubmit && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSubmit]}
                onPress={onSubmit}
              >
                <Text style={styles.textStyle}>Submit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderNewCompanyModal = () =>
    renderModal(
      "Add New Company",
      showNewCompanyModal,
      () => setShowNewCompanyModal(false),
      <>
        <TextInput
          style={styles.input}
          placeholder="Company Name"
          placeholderTextColor="#999"
          value={newCompany.name}
          onChangeText={(text) => setNewCompany({ ...newCompany, name: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          value={newCompany.email}
          onChangeText={(text) => setNewCompany({ ...newCompany, email: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Website URL"
          placeholderTextColor="#999"
          value={newCompany.websiteUrl}
          onChangeText={(text) => setNewCompany({ ...newCompany, websiteUrl: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Address"
          placeholderTextColor="#999"
          value={newCompany.address}
          onChangeText={(text) => setNewCompany({ ...newCompany, address: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={newCompany.phoneNumber}
          onChangeText={(text) => setNewCompany({ ...newCompany, phoneNumber: text })}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Description"
          placeholderTextColor="#999"
          multiline
          value={newCompany.description}
          onChangeText={(text) => setNewCompany({ ...newCompany, description: text })}
        />
      </>,
      handleNewCompanySubmit
    );

  const renderNewProjectModal = () =>
    renderModal(
      "Add New Project",
      showNewProjectModal,
      () => setShowNewProjectModal(false),
      <>
        <TextInput
          style={styles.input}
          placeholder="Project Name"
          placeholderTextColor="#999"
          value={newProject.name}
          onChangeText={(text) => setNewProject({ ...newProject, name: text })}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Description"
          placeholderTextColor="#999"
          multiline
          value={newProject.description}
          onChangeText={(text) =>
            setNewProject({ ...newProject, description: text })
          }
        />
      </>,
      handleNewProjectSubmit
    );

  const renderNewTaskModal = () =>
    renderModal(
      "Add New Task",
      showNewTaskModal,
      () => setShowNewTaskModal(false),
      <>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#999"
          value={newTask.title}
          onChangeText={(text) => setNewTask({ ...newTask, title: text })}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          multiline
          placeholder="Description"
          placeholderTextColor="#999"
          value={newTask.description}
          onChangeText={(text) =>
            setNewTask({ ...newTask, description: text })
          }
        />
        <TouchableOpacity
          onPress={() => showDatepickerFor("newTask")}
          style={styles.input}
        >
          <Text style={{ color: newTask.dueDate ? "#fff" : "#999" }}>
            {newTask.dueDate ? new Date(newTask.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "Select Due Date"}
          </Text>
        </TouchableOpacity>
        <Picker
          selectedValue={newTask.assignedTo}
          style={styles.picker}
          onValueChange={(itemValue) =>
            setNewTask({ ...newTask, assignedTo: itemValue })
          }
          dropdownIconColor="#fff"
        >
          <Picker.Item label="Assign to an employee" value="" />
          {employees.map((employee) => (
            <Picker.Item
              key={employee.id}
              label={`${employee.firstName} ${employee.lastName}`}
              value={employee.id.toString()}
            />
          ))}
        </Picker>
      </>,
      handleNewTaskSubmit
    );

  const renderEditTaskModal = () =>
    editingTask &&
    renderModal(
      "Edit Task",
      isModalOpen,
      () => setIsModalOpen(false),
      <>
        <TextInput
          style={styles.input}
          placeholder="Title"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          multiline
          placeholder="Description"
          value={formData.description}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
        />
        <TouchableOpacity
          onPress={() => showDatepickerFor("editTask")}
          style={styles.input}
        >
          <Text style={{ color: formData.dueDate ? "#fff" : "#999" }}>
            {formData.dueDate || "Select Due Date"}
          </Text>
        </TouchableOpacity>
        <Picker
          selectedValue={formData.assignedTo}
          style={styles.picker}
          onValueChange={(itemValue) =>
            setFormData({ ...formData, assignedTo: itemValue })
          }
          dropdownIconColor="#fff"
        >
          <Picker.Item label="Assign to an employee" value="" />
          {employees.map((employee) => (
            <Picker.Item
              key={employee.id}
              label={`${employee.firstName} ${employee.lastName}`}
              value={employee.id.toString()}
            />
          ))}
        </Picker>
      </>,
      handleSubmit
    );

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color="#00ff00"
        style={{ flex: 1, justifyContent: "center" }}
      />
    );
  if (error)
    return (
      <Text style={{ color: "red", textAlign: "center", marginTop: 20 }}>
        {error}
      </Text>
    );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <View style={styles.content}>
        {view === "companies" && renderCompanies()}
        {view === "projects" && renderProjects()}
        {view === "tasks" && renderTasks()}
      </View>

      {view === "companies" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewCompanyModal(true)}
        >
          <Entypo name="add-to-list" size={30} color="#fff" />
        </TouchableOpacity>
      )}
      {view === "projects" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewProjectModal(true)}
        >
          <Entypo name="add-to-list" size={30} color="#fff" />
        </TouchableOpacity>
      )}
      {view === "tasks" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewTaskModal(true)}
        >
          <Entypo name="add-to-list" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={
            datePickerFor === "newTask"
              ? newTask.dueDate
                ? new Date(newTask.dueDate)
                : new Date()
              : formData.dueDate
              ? new Date(formData.dueDate)
              : new Date()
          }
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onDateChange}
        />
      )}

      {renderNewCompanyModal()}
      {renderNewProjectModal()}
      {renderNewTaskModal()}
      {renderEditTaskModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A2238", // deep blue
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    backgroundColor: "#283655", // blue-purple
    borderBottomWidth: 1,
    borderBottomColor: "#6C63FF", // accent
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    color: "#F5F7FA",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  backButton: {
    padding: 7,
    borderRadius: 20,
    backgroundColor: "#6C63FF",
  },
  content: {
    flex: 1,
    padding: 14,
  },
  listItem: {
    backgroundColor: "#30475E",
    padding: 22,
    marginVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    borderLeftWidth: 5,
    borderLeftColor: "#6C63FF",
  },
  listItemText: {
    color: "#F5F7FA",
    fontSize: 17,
    fontWeight: "500",
  },
  taskCard: {
    backgroundColor: "#232B43",
    padding: 18,
    marginVertical: 12,
    borderRadius: 14,
    elevation: 3,
    shadowColor: "#00ADB5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: "#00ADB5", // teal accent
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  taskTitle: {
    color: "#F5F7FA",
    fontSize: 19,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  taskActions: {
    flexDirection: "row",
    gap: 10,
  },
  taskDescription: {
    color: "#B2B1B9",
    marginBottom: 10,
    fontSize: 15,
  },
  taskMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  taskStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6C63FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 8,
  },
  taskMetaText: {
    color: "#F5F7FA",
    marginLeft: 6,
    fontSize: 13,
  },
  fab: {
    position: "absolute",
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    right: 24,
    bottom: 28,
    backgroundColor: "#00ADB5",
    borderRadius: 31,
    elevation: 10,
    shadowColor: "#00ADB5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(26,34,56,0.92)",
  },
  modalContent: {
    width: "92%",
    backgroundColor: "#30475E",
    borderRadius: 16,
    padding: 26,
    alignItems: "stretch",
    elevation: 8,
  },
  modalTitle: {
    marginBottom: 22,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    color: "#F5F7FA",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#232B43",
    color: "#F5F7FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 18,
    minHeight: 44,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#6C63FF",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
  },
  button: {
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    marginLeft: 12,
    minWidth: 90,
  },
  buttonClose: {
    backgroundColor: "#B2B1B9",
  },
  buttonSubmit: {
    backgroundColor: "#6C63FF",
  },
  textStyle: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 15,
  },
  picker: {
    backgroundColor: "#232B43",
    color: "#F5F7FA",
    marginBottom: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00ADB5",
  },
});

export default Admintask;