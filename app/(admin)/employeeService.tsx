const API_BASE_URL = 'http://192.168.1.42:8080/api';

// Example: import a local image for default avatar
// import defaultAvatar from '../../assets/images/default-avatar.png';

export interface Employee {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  jobTitle: string;
  salary?: number;
  hireDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  documents?: any[];
  address?: any;
  employeeNumber?: string;
  username?: string;
  avatar?: string; // or require('../../assets/images/default-avatar.png')
}

class EmployeeService {
  // Get all employees
  async getAllEmployees() {
    try {
      const response = await fetch(`${API_BASE_URL}/employee`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      return await response.json();
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  // Get employee by ID
  async getEmployeeById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/employee/${id}`);
      if (!response.ok) throw new Error('Failed to fetch employee');
      return await response.json();
    } catch (error) {
      console.error('Error fetching employee:', error);
      throw error;
    }
  }

  // Save new employee with address
  async saveEmployee(employeeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/employee/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save employee: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving employee:', error);
      throw error;
    }
  }

  // Update employee
  async updateEmployee(id, employeeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/employee/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update employee: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  // Delete employee
  async deleteEmployee(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/employee/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete employee: ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Register user authentication
  async registerUserAuth(authData) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to register user: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  // Complete employee creation with authentication
  async createEmployeeWithAuth(employeeData, authData) {
    try {
      // First, save the employee
      const savedEmployee = await this.saveEmployee(employeeData);
      
      // Then, register the authentication
      try {
        await this.registerUserAuth(authData);
        return { employee: savedEmployee, authRegistered: true };
      } catch (authError) {
        // If auth registration fails, we might want to handle this differently
        // For now, we'll return the employee but indicate auth failed
        console.error('Auth registration failed:', authError);
        return { 
          employee: savedEmployee, 
          authRegistered: false, 
          authError: authError.message 
        };
      }
    } catch (error) {
      console.error('Error creating employee with auth:', error);
      throw error;
    }
  }

  // Generate employee number
  generateEmployeeNumber(existingEmployees) {
    if (!existingEmployees || existingEmployees.length === 0) {
      return 'EMP001';
    }

    const lastEmployee = existingEmployees.reduce((max, emp) => {
      const currentNum = parseInt(emp.employeeNumber?.replace('EMP', '') || '0');
      const maxNum = parseInt(max.employeeNumber?.replace('EMP', '') || '0');
      return currentNum > maxNum ? emp : max;
    }, existingEmployees[0]);

    const lastNumber = parseInt(lastEmployee.employeeNumber?.replace('EMP', '') || '0');
    return `EMP${String(lastNumber + 1).padStart(3, '0')}`;
  }

  // Generate username from name
  generateUsername(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, '.');
  }

  // Transform API response to frontend format
  transformEmployeeData(apiEmployee: any): Employee {
    return {
      ...apiEmployee,
      name: `${apiEmployee.firstName} ${apiEmployee.lastName}`.trim(),
      position: apiEmployee.jobTitle,
      employeeNumber: apiEmployee.employeeNumber || '',
      username: apiEmployee.username || this.generateUsername(`${apiEmployee.firstName} ${apiEmployee.lastName}`),
      // For React Native, use a remote URL or require() for local images
      avatar: apiEmployee.avatar || 'https://example.com/default-avatar.png'
      // or: avatar: apiEmployee.avatar || defaultAvatar
    };
  }

  // Transform frontend data to API format
  transformToApiFormat(frontendEmployee, employeeNumber) {
    const [firstName, ...lastParts] = frontendEmployee.name.trim().split(' ');
    const lastName = lastParts.join(' ') || '';
    const now = new Date().toISOString();

    return {
      firstName,
      lastName,
      email: frontendEmployee.email,
      phone: frontendEmployee.phone || '',
      department: frontendEmployee.department,
      jobTitle: frontendEmployee.position,
      salary: frontendEmployee.salary || 500.0,
      hireDate: frontendEmployee.joinDate ? `${frontendEmployee.joinDate}T09:00:00` : now,
      status: frontendEmployee.status || 'Active',
      createdAt: frontendEmployee.createdAt || now,
      updatedAt: now,
      documents: frontendEmployee.documents || [],
      address: frontendEmployee.address || null,
      employeeNumber: employeeNumber
    };
  }
}

// Export singleton instance
const employeeService = new EmployeeService();  
export default employeeService;