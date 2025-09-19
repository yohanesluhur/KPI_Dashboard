// Employees.gs - Employee Management Handlers

/**
 * Handle get all employees
 */
function handleGetEmployees() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const employees = sheetToObjects(sheet);
    
    // Convert to frontend format
    const result = employees.map(emp => ({
      id: emp.ID,
      name: emp.Name,
      email: emp.Email,
      role: emp.Role,
      createdAt: emp.CreatedAt,
      updatedAt: emp.UpdatedAt
    }));
    
    return result;
    
  } catch (error) {
    console.error('Error in handleGetEmployees:', error);
    throw new Error('Failed to retrieve employees');
  }
}

/**
 * Handle add employee
 */
function handleAddEmployee(data) {
  try {
    // Validation
    if (!data.name || !data.email) {
      throw new Error('Name and email are required');
    }
    
    if (!isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }
    
    // Check if email already exists
    const existingEmployee = getEmployeeByEmail(data.email);
    if (existingEmployee) {
      throw new Error('Employee with this email already exists');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const employee = {
      ID: generateId(),
      Name: data.name.trim(),
      Email: data.email.toLowerCase().trim(),
      Role: data.role || 'employee',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
    
    addRowToSheet(sheet, employee);
    
    return {
      id: employee.ID,
      name: employee.Name,
      email: employee.Email,
      role: employee.Role,
      createdAt: employee.CreatedAt,
      updatedAt: employee.UpdatedAt
    };
    
  } catch (error) {
    console.error('Error in handleAddEmployee:', error);
    throw new Error(error.message || 'Failed to add employee');
  }
}

/**
 * Handle update employee
 */
function handleUpdateEmployee(data) {
  try {
    if (!data.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    // Validation
    if (data.email && !isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }
    
    // Check if new email already exists (if changing email)
    if (data.email) {
      const existingEmployee = getEmployeeByEmail(data.email);
      if (existingEmployee && existingEmployee.ID !== data.employeeId) {
        throw new Error('Email already exists for another employee');
      }
    }
    
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const updateData = {
      UpdatedAt: new Date().toISOString()
    };
    
    // Add fields to update
    if (data.name) updateData.Name = data.name.trim();
    if (data.email) updateData.Email = data.email.toLowerCase().trim();
    if (data.role) updateData.Role = data.role;
    
    const success = updateRowInSheet(sheet, data.employeeId, updateData);
    
    if (!success) {
      throw new Error('Employee not found');
    }
    
    // Return updated employee data
    const employees = sheetToObjects(sheet);
    const updatedEmployee = employees.find(emp => emp.ID === data.employeeId);
    
    return {
      id: updatedEmployee.ID,
      name: updatedEmployee.Name,
      email: updatedEmployee.Email,
      role: updatedEmployee.Role,
      createdAt: updatedEmployee.CreatedAt,
      updatedAt: updatedEmployee.UpdatedAt
    };
    
  } catch (error) {
    console.error('Error in handleUpdateEmployee:', error);
    throw new Error(error.message || 'Failed to update employee');
  }
}

/**
 * Handle delete employee
 */
function handleDeleteEmployee(data) {
  try {
    if (!data.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    // Check if employee has assigned tasks
    const tasksSheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(tasksSheet);
    const assignedTasks = tasks.filter(task => task.EmployeeID === data.employeeId);
    
    if (assignedTasks.length > 0) {
      throw new Error('Cannot delete employee with assigned tasks. Please reassign or complete tasks first.');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const success = deleteRowFromSheet(sheet, data.employeeId);
    
    if (!success) {
      throw new Error('Employee not found');
    }
    
    return { success: true, message: 'Employee deleted successfully' };
    
  } catch (error) {
    console.error('Error in handleDeleteEmployee:', error);
    throw new Error(error.message || 'Failed to delete employee');
  }
}

/**
 * Handle get employee by email
 */
function handleGetEmployeeByEmail(data) {
  try {
    if (!data.email) {
      throw new Error('Email is required');
    }
    
    const employee = getEmployeeByEmail(data.email);
    
    if (!employee) {
      return null;
    }
    
    return {
      id: employee.ID,
      name: employee.Name,
      email: employee.Email,
      role: employee.Role,
      createdAt: employee.CreatedAt,
      updatedAt: employee.UpdatedAt
    };
    
  } catch (error) {
    console.error('Error in handleGetEmployeeByEmail:', error);
    throw new Error('Failed to retrieve employee');
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get employee statistics
 */
function getEmployeeStatistics() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const employees = sheetToObjects(sheet);
    
    const stats = {
      total: employees.length,
      byRole: {},
      recent: 0
    };
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    employees.forEach(emp => {
      // Count by role
      stats.byRole[emp.Role] = (stats.byRole[emp.Role] || 0) + 1;
      
      // Count recent additions
      if (new Date(emp.CreatedAt) > oneWeekAgo) {
        stats.recent++;
      }
    });
    
    return stats;
    
  } catch (error) {
    console.error('Error getting employee statistics:', error);
    return {
      total: 0,
      byRole: {},
      recent: 0
    };
  }
}