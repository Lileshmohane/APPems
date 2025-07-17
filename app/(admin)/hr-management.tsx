import { Ionicons } from "@expo/vector-icons";
// import AsyncStorage from "@react-native-async-storage/async-storage"; // No longer needed
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as FileSystem from 'expo-file-system';
import { useRouter } from "expo-router";
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import AdminHoliday from "./AdminHoliday"; // Assuming AdminHoliday.tsx is the correct file and it's a RN component

// Interfaces for type safety
interface Employee {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
}

interface RequestDetails {
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  leaveDoc?: (string | {
    base64Doc?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    [key: string]: any;
  })[] | (string | {
    base64Doc?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    [key: string]: any;
  });
  issueType?: string;
  description?: string;
  hrdoc?: string | {
    base64Doc?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    [key: string]: any;
  };
}

interface HRRequest {
  id: number | string;
  type: string;
  employee: Employee;
  submitted_date: string;
  status: "Pending" | "Approved" | "Rejected" | "In Progress" | "Completed" | "Draft";
  details: RequestDetails;
  last_updated?: string;
  hr_remarks?: string;
  downloadLink?: string;
}

const requestTypes: { [key: string]: { icon: string; description: string } } = {
  "Leave Request": { icon: "🗓️", description: "Request time off" },
  "Salary Slip Request": { icon: "💰", description: "Request salary statements" },
  "Experience/Relieving Letter": { icon: "📄", description: "Request employment documentation" },
  "Asset Request": { icon: "💻", description: "Request company equipment" },
  "ID Card Reissue": { icon: "🪪", description: "Request replacement ID card" },
  "HR Complaint/Feedback": { icon: "📝", description: "Submit complaint or feedback" },
  "Work From Home Request": { icon: "🏠", description: "Request to work remotely" },
  "Shift Change Request": { icon: "🕒", description: "Request to change working hours" },
};

const statusColors = {
  Pending: "#f0ad4e",
  Approved: "#5cb85c",
  Rejected: "#d9534f",
  Draft: "#5bc0de",
  Completed: "#34c759",
  "In Progress": "#5ac8fa",
};

const AdminHRManagementNativePage = () => {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    employee: "",
  });
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<HRRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkSelection, setBulkSelection] = useState<(string | number)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAllRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // REMOVED: Token check and headers
      const [leaveRes, complaintsRes] = await Promise.all([
        axios.get("http://192.168.1.42:8080/api/leaves/").catch(err => {
            console.error("Leave fetch error:", err.response?.data || err.message);
            return { data: [] };
        }),
        axios.get("http://192.168.1.42:8080/api/complaints").catch(err => {
            console.error("Complaint fetch error:", err.response?.data || err.message);
            return { data: [] };
        })
      ]);

      const formattedLeaves: HRRequest[] = Array.isArray(leaveRes.data) ? leaveRes.data.map((leave: any) => ({
        id: leave.id,
        type: "Leave Request",
        employee: {
          id: leave.employee?.id || leave.employeeId,
          name: `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.trim() || `Employee ID: ${leave.employeeId}`,
          email: leave.employee?.email || 'N/A',
          phone: leave.employee?.phone || 'N/A',
          department: leave.employee?.department || 'N/A',
          position: leave.employee?.jobTitle || 'N/A',
        },
        submitted_date: leave.startDate,
        status: leave.status || 'Pending',
        details: {
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: leave.reason,
          leaveDoc: leave.leaveDoc,
        },
        last_updated: leave.endDate,
      })) : [];

      const formattedComplaints: HRRequest[] = Array.isArray(complaintsRes.data) ? complaintsRes.data.map((complaint: any) => ({
        id: complaint.id,
        type: "HR Complaint/Feedback",
        employee: {
          id: complaint.employeeId,
          name: `${complaint.firstName || ''} ${complaint.lastName || ''}`.trim() || `Employee ID: ${complaint.employeeId}`,
          email: complaint.employee?.email || 'N/A',
          phone: complaint.employee?.phone || 'N/A',
          department: complaint.department || 'N/A',
          position: complaint.employee?.position || 'N/A',
        },
        submitted_date: complaint.submittedDate,
        status: complaint.status || 'Pending',
        details: {
          issueType: complaint.type,
          description: complaint.description,
          hrdoc: complaint.hrdoc,
        },
        last_updated: complaint.lastUpdated,
        hr_remarks: complaint.hrRemarks,
      })) : [];

      const allRequests = [...formattedLeaves, ...formattedComplaints].sort((a, b) => new Date(b.submitted_date).getTime() - new Date(a.submitted_date).getTime());
      
      setRequests(allRequests);
      if (allRequests.length === 0) {
        setError("No requests found.");
      }

    } catch (err: any) {
      console.error("Error fetching all requests:", err);
      setError("Failed to fetch requests. " + (err.message || "Please check your connection."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  const processRequest = async (action: "approve" | "reject" | "inProgress") => {
    if (!selectedRequest) return;
    setActionInProgress(true);

    const newStatus: HRRequest['status'] = action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "In Progress";
    try {
        // Optimistic update
        const originalRequests = requests;
        const updatedRequests = requests.map(r => 
            r.id === selectedRequest.id ? { ...r, status: newStatus, hr_remarks: responseText } : r
        );
        setRequests(updatedRequests);
        closeDetailsModal();

      let url = '';
      if (selectedRequest.type === 'Leave Request') {
        url = `http://192.168.1.42:8080/api/leaves/${selectedRequest.id}`;
        // Build leaveDto object
        const leaveDto = {
          id: selectedRequest.id,
          leaveType: selectedRequest.details.leaveType,
          startDate: selectedRequest.details.startDate,
          endDate: selectedRequest.details.endDate,
          reason: selectedRequest.details.reason,
          status: newStatus,
          employeeId: selectedRequest.employee.id,
        };
        const formData = new FormData();
        formData.append('leaveDto', JSON.stringify(leaveDto));
        await axios.put(url, formData);
      } else if (selectedRequest.type === 'HR Complaint/Feedback') {
        url = `http://192.168.1.42:8080/api/complaints/${selectedRequest.id}`;
        const details = selectedRequest.details;
        const employeeId = selectedRequest.employee.id;
        const payload = {
          description: details.description,
          employee_id: employeeId,
          hrdoc: details.hrdoc || null,
          status: newStatus,
          submitted_date: selectedRequest.submitted_date,
          type: details.issueType || details.type || "Complaint"
        };
        await axios.put(url, payload);
      } else {
        url = `http://192.168.1.42:8080/api/requests/${selectedRequest.id}`;
        const payload = { status: newStatus };
        await axios.put(url, payload);
      }
        // If API call is successful, we keep the optimistic update.
    } catch (error: any) {
      console.error("Error processing request:", error, error.response?.data);
        // Revert on failure
        //setRequests(originalRequests); 
        Alert.alert("Error", "Failed to process request: " + (error.response?.data?.message || error.message));
    } finally {
        setActionInProgress(false);
    }
  };
  
  const handleDeleteRequest = async (request: HRRequest) => {
    Alert.alert(
      "Delete Request",
      `Are you sure you want to delete this request from ${request.employee.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Optimistic deletion
            const originalRequests = requests;
            setRequests(requests.filter(r => r.id !== request.id));
            try {
              // REMOVED: Token and headers
              const url = request.type === "Leave Request" ? `http://192.168.1.9:8080/api/leaves/${request.id}` : `http://192.168.1.4:8080/api/complaints/${request.id}`;
              await axios.delete(url);
            } catch (error: any) {
              // Revert if deletion fails
              setRequests(originalRequests);
              Alert.alert("Error", "Failed to delete request: " + (error.response?.data?.message || error.message));
            }
          },
        },
      ]
    );
  };


  const filteredRequests = requests.filter(req => {
    const statusFilter = filters.status === 'all' || req.status === filters.status;
    const typeFilter = filters.type === 'all' || req.type === filters.type;
    const searchFilter = !searchQuery || JSON.stringify(req).toLowerCase().includes(searchQuery.toLowerCase());
    return statusFilter && typeFilter && searchFilter;
  });

  const viewRequestDetails = (request: HRRequest) => {
    // Debug: log leaveDoc value
    if (request.details && request.details.leaveDoc) {
      console.log('DEBUG leaveDoc:', request.details.leaveDoc);
      Alert.alert('Debug', 'leaveDoc: ' + JSON.stringify(request.details.leaveDoc).slice(0, 200) + (JSON.stringify(request.details.leaveDoc).length > 200 ? '...' : ''));
    }
    setSelectedRequest(request);
    setResponseText(request.hr_remarks || "");
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
    setResponseText("");
  };

  const renderRequestItem = ({ item }: { item: HRRequest }) => (
    <TouchableOpacity onPress={() => viewRequestDetails(item)} style={styles.requestItem}>
      <View style={styles.requestItemLeft}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColors[item.status] }]} />
        <View>
          <Text style={styles.itemEmployeeName}>{item.employee.name}</Text>
          <Text style={styles.itemRequestType}>{requestTypes[item.type]?.icon} {item.type}</Text>
          <Text style={styles.itemDate}>{new Date(item.submitted_date).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.requestItemRight}>
        <Text style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>{item.status}</Text>
        <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HR Requests</Text>
        <TouchableOpacity onPress={fetchAllRequests}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, type, status..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterOpen(!isFilterOpen)}>
          <Ionicons name="filter" size={20} color="#007AFF" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {isFilterOpen && (
        <View style={styles.filterPanel}>
            <Picker
                selectedValue={filters.status}
                onValueChange={(itemValue) => setFilters(f => ({ ...f, status: itemValue }))}
            >
                <Picker.Item label="All Statuses" value="all" />
                {Object.keys(statusColors).map(status => (
                    <Picker.Item key={status} label={status} value={status} />
                ))}
            </Picker>
             <Picker
                selectedValue={filters.type}
                onValueChange={(itemValue) => setFilters(f => ({ ...f, type: itemValue }))}
            >
                <Picker.Item label="All Types" value="all" />
                {Object.keys(requestTypes).map(type => (
                    <Picker.Item key={type} label={type} value={type} />
                ))}
            </Picker>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : error ? (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAllRequests}>
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
      ) : (
        <View>
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>No requests found.</Text>
            </View>
          ) : (
            filteredRequests.map((item) => (
              <React.Fragment key={`${item.type}-${item.id}`}>
                {renderRequestItem({ item })}
              </React.Fragment>
            ))
          )}
        </View>
      )}

      <AdminHoliday />

      {selectedRequest && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showDetailsModal}
          onRequestClose={closeDetailsModal}
        >
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRequest.type} Details</Text>
              <TouchableOpacity onPress={closeDetailsModal}>
                  <Ionicons name="close" size={30} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Employee Information</Text>
                <Text>{selectedRequest.employee.name} ({selectedRequest.employee.position})</Text>
                <Text>{selectedRequest.employee.department}</Text>
                <Text>{selectedRequest.employee.email}</Text>
            </View>

            <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Request Details</Text>
                {Object.entries(selectedRequest.details).map(([key, value]) => value && (
                  <View key={key} style={styles.detailItem}>
                    <Text style={styles.detailKey}>{key.replace(/_/g, ' ')}</Text>
                    <Text style={styles.detailValue}>{String(value)}</Text>
                  </View>
                ))}
                {/* Document viewing logic for leaveDoc */}
                {selectedRequest.details.leaveDoc && (
                  Array.isArray(selectedRequest.details.leaveDoc)
                    ? selectedRequest.details.leaveDoc.map((doc, idx) => {
                        // Handle JSON object, string (base64), or URL
                        let fileData: string | null = null;
                        let fileName = `document_${idx}.pdf`;
                        let mimeType = 'application/pdf';
                        if (doc && typeof doc === 'object') {
                          if (doc.base64Doc) {
                            fileData = doc.base64Doc;
                            fileName = doc.fileName || fileName;
                            mimeType = doc.mimeType || mimeType;
                          } else if (doc.url) {
                            fileData = doc.url;
                            fileName = doc.fileName || fileName;
                            mimeType = doc.mimeType || mimeType;
                          }
                        } else if (
                          typeof doc === 'string' &&
                          !!doc &&
                          doc.length > 0 &&
                          doc !== 'string' && // skip placeholder
                          doc !== '[object Object]'
                        ) {
                          fileData = doc;
                        }
                        if (!fileData || fileData === 'string' || fileData === '[object Object]') {
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[styles.actionButton, { backgroundColor: '#8E8E93', marginVertical: 4 }]}
                              onPress={() => Alert.alert('No document', 'No valid document is attached to this request.')}
                            >
                              <Text style={styles.actionButtonText}>No Document {idx + 1}</Text>
                            </TouchableOpacity>
                          );
                        }
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.actionButton, { backgroundColor: '#007AFF', marginVertical: 4 }]}
                            onPress={async () => {
                              try {
                                let fileUri = '';
                                if (typeof fileData === 'string' && fileData.startsWith('http')) {
                                  fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                                  const downloadRes = await FileSystem.downloadAsync(fileData, fileUri);
                                  fileUri = downloadRes.uri;
                                } else if (typeof fileData === 'string' && fileData.length > 100) {
                                  fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                                  await FileSystem.writeAsStringAsync(fileUri, fileData, { encoding: FileSystem.EncodingType.Base64 });
                                } else {
                                  Alert.alert('Error', 'Document data is invalid or too short.');
                                  return;
                                }
                                await Sharing.shareAsync(fileUri, { mimeType });
                              } catch (e: any) {
                                Alert.alert('Error', 'Could not open document. ' + (e.message || ''));
                              }
                            }}
                          >
                            <Text style={styles.actionButtonText}>View Document {idx + 1}</Text>
                          </TouchableOpacity>
                        );
                      })
                    : (() => {
                        const doc = selectedRequest.details.leaveDoc;
                        let fileData: string | null = null;
                        let fileName = 'document.pdf';
                        let mimeType = 'application/pdf';
                        if (doc && typeof doc === 'object') {
                          if (doc.base64Doc) {
                            fileData = doc.base64Doc;
                            fileName = doc.fileName || fileName;
                            mimeType = doc.mimeType || mimeType;
                          } else if (doc.url) {
                            fileData = doc.url;
                            fileName = doc.fileName || fileName;
                            mimeType = doc.mimeType || mimeType;
                          }
                        } else if (
                          typeof doc === 'string' &&
                          !!doc &&
                          doc.length > 0 &&
                          doc !== 'string' &&
                          doc !== '[object Object]'
                        ) {
                          fileData = doc;
                        }
                        if (!fileData || fileData === 'string' || fileData === '[object Object]') {
                          return (
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: '#8E8E93', marginVertical: 4 }]}
                              onPress={() => Alert.alert('No document', 'No valid document is attached to this request.')}
                            >
                              <Text style={styles.actionButtonText}>No Document</Text>
                            </TouchableOpacity>
                          );
                        }
                        return (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#007AFF', marginVertical: 4 }]}
                            onPress={async () => {
                              try {
                                let fileUri = '';
                                if (typeof fileData === 'string' && fileData.startsWith('http')) {
                                  fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                                  const downloadRes = await FileSystem.downloadAsync(fileData, fileUri);
                                  fileUri = downloadRes.uri;
                                } else if (typeof fileData === 'string' && fileData.length > 100) {
                                  fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                                  await FileSystem.writeAsStringAsync(fileUri, fileData, { encoding: FileSystem.EncodingType.Base64 });
                                } else {
                                  Alert.alert('Error', 'Document data is invalid or too short.');
                                  return;
                                }
                                await Sharing.shareAsync(fileUri, { mimeType });
                              } catch (e: any) {
                                Alert.alert('Error', 'Could not open document. ' + (e.message || ''));
                              }
                            }}
                          >
                            <Text style={styles.actionButtonText}>View Document</Text>
                          </TouchableOpacity>
                        );
                      })()
                )}
                {/* Document viewing logic for hrdoc */}
                {selectedRequest.details.hrdoc && (() => {
                  const doc = selectedRequest.details.hrdoc;
                  let fileData: string | null = null;
                  let fileName = 'hrdoc.pdf';
                  let mimeType = 'application/pdf';
                  if (doc && typeof doc === 'object') {
                    if (doc.base64Doc) {
                      fileData = doc.base64Doc;
                      fileName = doc.fileName || fileName;
                      mimeType = doc.mimeType || mimeType;
                    } else if (doc.url) {
                      fileData = doc.url;
                      fileName = doc.fileName || fileName;
                      mimeType = doc.mimeType || mimeType;
                    }
                  } else if (
                    typeof doc === 'string' &&
                    !!doc &&
                    doc.length > 0 &&
                    doc !== 'string' &&
                    doc !== '[object Object]'
                  ) {
                    fileData = doc;
                  }
                  if (!fileData || fileData === 'string' || fileData === '[object Object]') {
                    return (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#8E8E93', marginVertical: 4 }]}
                        onPress={() => Alert.alert('No document', 'No valid document is attached to this request.')}
                      >
                        <Text style={styles.actionButtonText}>No HR Document</Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#007AFF', marginVertical: 4 }]}
                      onPress={async () => {
                        try {
                          let fileUri = '';
                          if (typeof fileData === 'string' && fileData.startsWith('http')) {
                            fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                            const downloadRes = await FileSystem.downloadAsync(fileData, fileUri);
                            fileUri = downloadRes.uri;
                          } else if (typeof fileData === 'string' && fileData.length > 100) {
                            fileUri = FileSystem.cacheDirectory + (fileName.endsWith('.pdf') ? fileName : fileName + '.pdf');
                            await FileSystem.writeAsStringAsync(fileUri, fileData, { encoding: FileSystem.EncodingType.Base64 });
                          } else {
                            Alert.alert('Error', 'Document data is invalid or too short.');
                            return;
                          }
                          await Sharing.shareAsync(fileUri, { mimeType });
                        } catch (e: any) {
                          Alert.alert('Error', 'Could not open document. ' + (e.message || ''));
                        }
                      }}
                    >
                      <Text style={styles.actionButtonText}>View HR Document</Text>
                    </TouchableOpacity>
                  );
                })()}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>HR Response</Text>
              <TextInput
                style={styles.responseTextInput}
                placeholder="Enter response or notes..."
                value={responseText}
                onChangeText={setResponseText}
                multiline
              />
            </View>
            
            <View style={styles.modalFooter}>
                {selectedRequest.status === 'Pending' && (
                    <>
                        <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => processRequest('reject')} disabled={actionInProgress}>
                            <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => processRequest('approve')} disabled={actionInProgress}>
                            <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                    </>
                )}
                 <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteRequest(selectedRequest)}>
                    <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
            </View>
          </ScrollView>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#D1D1D6' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  controlsContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#D1D1D6' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E9E9EB', borderRadius: 10, paddingHorizontal: 10, marginBottom: 10 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: 40 },
  filterButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10 },
  filterButtonText: { color: '#007AFF', marginLeft: 5, fontSize: 16 },
  filterPanel: { paddingHorizontal: 16 },
  listContainer: { paddingBottom: 20 },
  requestItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EFEFF4' },
  requestItemLeft: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { width: 8, height: '100%', marginRight: 12, borderRadius: 4 },
  itemEmployeeName: { fontSize: 16, fontWeight: '600' },
  itemRequestType: { color: '#8E8E93', marginTop: 2 },
  itemDate: { color: '#8E8E93', marginTop: 2, fontSize: 12 },
  requestItemRight: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: '600', marginRight: 8, overflow: 'hidden' },
  emptyListContainer: { marginTop: 50, alignItems: 'center' },
  emptyListText: { fontSize: 18, color: '#8E8E93' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginBottom: 10 },
  retryButton: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16 },
  // Modal Styles
  modalContainer: { flex: 1, paddingTop: Platform.OS === 'android' ? 20 : 50, paddingHorizontal: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#D1D1D6' },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalSection: { marginTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EFEFF4' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  detailKey: { color: '#8E8E93', textTransform: 'capitalize' },
  detailValue: { fontWeight: '500' },
  responseTextInput: { borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 8, padding: 10, minHeight: 100, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, marginBottom: 50 },
  actionButton: { padding: 15, borderRadius: 10, flex: 1, marginHorizontal: 5, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold' },
  approveButton: { backgroundColor: '#34C759' },
  rejectButton: { backgroundColor: '#FF3B30' },
  deleteButton: { backgroundColor: '#8E8E93' },
});

export default AdminHRManagementNativePage;
