import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = "http://192.168.1.42:8080/api/events";

interface IEvent {
  id: any;
  name: string;
  date: string;
  location: string;
  description: string;
  eventImage: string | null;
  recent?: boolean;
  time?: string;
  meridiem?: 'AM' | 'PM';
}
const AddOfficeEventPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
  const [events, setEvents] = useState<IEvent[]>([]);
  const [eventForm, setEventForm] = useState({
    name: "",
    date: new Date(),
    location: "",
    eventImage: null as { uri: string; type: string; name: string } | null,
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get<IEvent[]>(API_URL);
      const enriched = res.data.map((ev) => ({
        ...ev,
        recent: false,
      }));
      setEvents(enriched);
    } catch (err) {
      console.error("Error fetching events:", err);
      Alert.alert("Error", "Failed to fetch events.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Sorry, we need camera roll permissions to make this work!");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.uri.split('/').pop() || 'image.jpg';
        const fileType = asset.mimeType || 'image/jpeg';
        
        setEventForm((prev) => ({
          ...prev,
          eventImage: { uri: asset.uri, name: fileName, type: fileType },
        }));
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || eventForm.date;
    setShowDatePicker(Platform.OS === 'ios');
    setEventForm(prev => ({ ...prev, date: currentDate }));
  };

  const handleSubmit = async () => {
    if (!eventForm.name.trim() || !eventForm.description.trim() || !eventForm.location.trim()) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', eventForm.name.trim());
      formData.append('description', eventForm.description.trim());
      formData.append('date', eventForm.date.toISOString().split('T')[0]);
      formData.append('location', eventForm.location.trim());

      if (eventForm.eventImage) {
        const imageFile = {
          uri: eventForm.eventImage.uri,
          type: eventForm.eventImage.type,
          name: eventForm.eventImage.name,
        } as any;
        formData.append('eventImage', imageFile);
      }
      
      let savedEvent: IEvent;
      if (isEditing) {
        const res = await axios.put(`${API_URL}/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        savedEvent = res.data;
      } else {
        const res = await axios.post(`${API_URL}/save`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        savedEvent = res.data;
      }

      const newFormatted: IEvent = {
        ...savedEvent,
        recent: true,
      };

      const updatedEvents = isEditing
        ? events.map((ev) => (ev.id === editingId ? newFormatted : { ...ev, recent: false }))
        : [newFormatted, ...events.map((ev) => ({ ...ev, recent: false }))];

      setEvents(updatedEvents);
      setShowPopup(true);
      resetForm();
      setTimeout(() => setShowPopup(false), 3000);
    } catch (err) {
      console.error("Error saving event:", err);
      Alert.alert("Error", "Error saving event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: any) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/${id}`);
            setEvents((prev) => prev.filter((ev) => ev.id !== id));
            setSelectedEvent(null);
          } catch (err) {
            console.error("Error deleting event:", err);
            Alert.alert("Error", "Failed to delete event.");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const handleEdit = (ev: IEvent) => {
    setEventForm({
      name: ev.name,
      date: new Date(ev.date),
      location: ev.location,
      eventImage: ev.eventImage ? { uri: `data:image/jpeg;base64,${ev.eventImage}`, type: 'image/jpeg', name: 'event-image.jpg' } : null,
      description: ev.description,
    });
    setEditingId(ev.id);
    setIsEditing(true);
    setShowForm(true);
    setSelectedEvent(null);
  };

  const resetForm = () => {
    setEventForm({
      name: "",
      date: new Date(),
      location: "",
      eventImage: null,
      description: "",
    });
    setShowForm(false);
    setIsEditing(false);
    setEditingId(null);
    setSelectedEvent(null);
  };

  const filteredEvents = events.filter((ev) =>
    ev.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDetailsView = () => selectedEvent && (
    <ScrollView style={styles.detailsCard}>
      <TouchableOpacity style={styles.backButton} onPress={() => setSelectedEvent(null)}>
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
        <Text style={styles.backButtonText}>Back to Events</Text>
      </TouchableOpacity>
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle}>{selectedEvent.name}</Text>
        <Image 
          source={selectedEvent.eventImage ? { uri: `data:image/jpeg;base64,${selectedEvent.eventImage}` } : require('../../assets/images/icon.png')}
          style={styles.detailsImage}
          resizeMode="cover"
        />
        <View style={styles.eventInfo}>
          <Text style={styles.infoItem}>📅 Date: {new Date(selectedEvent.date).toLocaleDateString()}</Text>
          <Text style={styles.infoItem}>📍 Location: {selectedEvent.location}</Text>
          <Text style={styles.infoLabel}>Description:</Text>
          <Text style={styles.eventDescription}>{selectedEvent.description}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(selectedEvent)}>
          <Text style={styles.buttonText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(selectedEvent.id)}>
          <Text style={styles.buttonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.main}>
        {showForm ? (
          <View style={styles.form}>
            <TouchableOpacity style={styles.backButton} onPress={resetForm}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.formTitle}>{isEditing ? "Edit Event" : "Create a New Event"}</Text>
            
            <TextInput 
              style={styles.input} 
              placeholder="Event Title" 
              value={eventForm.name} 
              onChangeText={(text) => setEventForm(p => ({...p, name: text}))} 
            />
            <TextInput 
              style={styles.input} 
              multiline 
              placeholder="Description" 
              value={eventForm.description} 
              onChangeText={(text) => setEventForm(p => ({...p, description: text}))} 
            />
            <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>Date: {eventForm.date.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker 
                value={eventForm.date} 
                mode="date" 
                display="default" 
                onChange={onDateChange} 
              />
            )}
            <TextInput 
              style={styles.input} 
              placeholder="Location" 
              value={eventForm.location} 
              onChangeText={(text) => setEventForm(p => ({...p, location: text}))} 
            />

            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              <Text style={styles.imagePickerText}>Select Event Image</Text>
            </TouchableOpacity>
            {eventForm.eventImage && (
              <Image 
                source={{ uri: eventForm.eventImage.uri }} 
                style={styles.imagePreview} 
                resizeMode="cover"
              />
            )}
            
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
              onPress={handleSubmit} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? "Update Event" : "Create Event"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : selectedEvent ? (
          renderDetailsView()
        ) : (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Events History</Text>
            <View style={styles.header}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search events by name..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              <TouchableOpacity style={styles.createButton} onPress={() => setShowForm(true)}>
                <Text style={styles.createButtonText}>Create Event</Text>
              </TouchableOpacity>
            </View>
            {loading && events.length === 0 ? (
              <ActivityIndicator size="large" style={styles.loader} />
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map((ev) => (
                <TouchableOpacity key={ev.id} style={styles.banner} onPress={() => setSelectedEvent(ev)}>
                  <Image
                    style={styles.coverImage}
                    source={ev.eventImage ? { uri: `data:image/jpeg;base64,${ev.eventImage}` } : require('../../assets/images/icon.png')}
                    resizeMode="cover"
                  />
                  <View style={styles.textBox}>
                    <Text style={styles.eventName}>{ev.name}</Text>
                    <Text style={styles.eventDate}>📅 {new Date(ev.date).toLocaleDateString()}</Text>
                    <Text style={styles.eventLocation}>📍 {ev.location}</Text>
                    {ev.recent && <Text style={styles.recentText}>🆕 Recently added</Text>}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noResults}>No events match your search.</Text>
            )}
          </View>
        )}
        {showPopup && (
          <View style={styles.popup}>
            <Text style={styles.popupText}>
              ✅ Event {isEditing ? "updated" : "created"} successfully!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f0f4f7' 
  },
  main: { 
    padding: 16,
    paddingBottom: 100 
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  backButtonText: { 
    color: '#007AFF', 
    marginLeft: 8, 
    fontSize: 16 
  },
  formTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 16, 
    textAlign: 'center' 
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    minHeight: 48,
  },
  dateInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  imagePicker: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePickerText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  imagePreview: { 
    width: '100%', 
    height: 200, 
    borderRadius: 8, 
    marginBottom: 12 
  },
  submitButton: { 
    backgroundColor: '#28a745', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  previewSection: { 
    flex: 1 
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 16, 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 16, 
    alignItems: 'center' 
  },
  searchInput: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 12, 
    borderRadius: 8, 
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  createButton: { 
    backgroundColor: '#007AFF', 
    padding: 12, 
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  createButtonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  banner: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  coverImage: { 
    width: '100%', 
    height: 180 
  },
  textBox: { 
    padding: 16 
  },
  eventName: { 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  recentText: { 
    color: '#28a745', 
    fontStyle: 'italic', 
    marginTop: 8 
  },
  noResults: { 
    textAlign: 'center', 
    marginTop: 20, 
    color: '#666' 
  },
  loader: {
    marginTop: 50,
  },
  popup: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    borderRadius: 8,
    maxWidth: '90%',
  },
  popupText: { 
    color: '#fff',
    textAlign: 'center',
  },
  detailsCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 8 
  },
  detailsImage: { 
    width: '100%', 
    height: 200, 
    borderRadius: 8, 
    marginVertical: 16 
  },
  eventDetails: {},
  eventTitle: { 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  eventInfo: { 
    marginVertical: 16 
  },
  infoItem: { 
    fontSize: 16, 
    marginBottom: 8 
  },
  infoLabel: { 
    fontWeight: 'bold',
    marginTop: 8,
  },
  eventDescription: { 
    fontSize: 16, 
    lineHeight: 24,
    marginTop: 4,
  },
  actions: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginTop: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#eee', 
    paddingTop: 20
  },
  editButton: { 
    backgroundColor: '#ffc107', 
    padding: 12, 
    borderRadius: 8, 
    width: '45%', 
    alignItems: 'center' 
  },
  deleteButton: { 
    backgroundColor: '#dc3545', 
    padding: 12, 
    borderRadius: 8, 
    width: '45%', 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
});

export default AddOfficeEventPage;
