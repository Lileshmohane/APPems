import { useAuth } from '@/components/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const AdminSidebar = ({ onClose }: { onClose?: () => void }) => {
  const { logout, employeeId } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleNavigate = (route: string) => {
    router.replace(route as any);
    if (onClose) {
      onClose();
    }
  };

  const menuItems = [
    { title: 'Dashboard', route: '/(admin)/admin-dashboard', icon: 'grid' },
    { title: 'Employees', route: '/(admin)/employees', icon: 'users' },
    { title: 'Attendance', route: '/(admin)/attendance', icon: 'calendar' },
    { title: 'Tasks', route: '/(admin)/Admintask', icon: 'check-square' },
    { title: 'Events', route: '/(admin)/add-office-event', icon: 'calendar' },
    { title: 'Documents', route: '/(admin)/documents', icon: 'file' },
    { title: 'HR Management', route: '/(admin)/hr-management', icon: 'briefcase' },
  ];

  return (
    <SafeAreaView style={styles.sidebar}>
      <View>
        <View style={styles.header}>
          <Text style={styles.headerText}>Admin Panel</Text>
        </View>
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={() => handleNavigate(item.route)}>
              <Feather name={item.icon as any} size={20} color="#a0aec0" />
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Feather name="log-out" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 250,
    backgroundColor: '#0a7ea4', // Match user sidebar color
    padding: 16,
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  header: {
    marginBottom: 24,
  },
  headerText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subHeaderText: {
    color: '#a0aec0',
    fontSize: 14,
    marginTop: 4,
  },
  menu: {
    flexGrow: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  menuText: {
    color: '#e2e8f0',
    fontSize: 16,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e53e3e',
    padding: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AdminSidebar;