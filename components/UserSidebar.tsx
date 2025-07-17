import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from './AuthContext';

const UserSidebar = ({ onClose }: { onClose?: () => void }) => {
  const { logout, employeeId, employeeName } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleNavigate = (route: string) => {
    router.replace(route);
    if (onClose) {
      onClose();
    }
  };

  const menuItems = [
    { title: 'Dashboard', route: '/(user)/user-dashboard', icon: 'grid' },
    { title: 'Attendance', route: '/(user)/AttendanceOverview', icon: 'calendar' },
    { title: 'Tasks', route: '/(user)/EmployeeTask', icon: 'check-square' },
    { title: 'Events', route: '/(user)/OfficeEventPage', icon: 'calendar' },
    { title: 'HR Requests', route: '/(user)/HRRequestPage', icon: 'file' },
    { title: 'Profile', route: '/(user)/EmployeeProfile', icon: 'user' },
    { title: 'Documents', route: '/(user)/DocumentCenter', icon: 'file' },
    // Add more user-specific items here
  ];

  return (
    <SafeAreaView style={styles.sidebar}>
      <View>
        <View style={styles.header}>
          <Text style={styles.headerText}>User Panel</Text>
          {/* Only show if employeeName is defined and not empty/undefined/null */}
          {employeeName && employeeName !== 'undefined' && (
            <Text style={styles.subHeaderText} numberOfLines={1} ellipsizeMode="tail">
              {employeeName}
            </Text>
          )}
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
    width: '85%', // More responsive for mobile
    maxWidth: 320,
    backgroundColor: '#0a7ea4',
    padding: 20,
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    marginBottom: 28,
    alignItems: 'flex-start',
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subHeaderText: {
    color: '#a0aec0',
    fontSize: 15,
    marginTop: 6,
    fontWeight: '600',
    maxWidth: '100%',
  },
  menu: {
    flexGrow: 1,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  menuText: {
    color: '#e2e8f0',
    fontSize: 17,
    marginLeft: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e53e3e',
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
});

export default UserSidebar;