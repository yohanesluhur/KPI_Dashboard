// Auth.gs - Authentication Handlers

/**
 * Authenticate user with Google token
 */
function authenticateUser(userData) {
  try {
    if (!userData || !userData.token) {
      return null;
    }
    
    // Verify Google ID token
    const userInfo = verifyGoogleToken(userData.token);
    
    if (!userInfo) {
      return null;
    }
    
    // Check if user exists in employees sheet
    const employee = getEmployeeByEmail(userInfo.email);
    
    return {
      email: userInfo.email,
      name: userInfo.name,
      verified: true,
      employee: employee
    };
    
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Handle authenticate user API call
 */
function handleAuthenticateUser(data) {
  try {
    const userInfo = verifyGoogleToken(data.token);
    
    if (!userInfo) {
      throw new Error('Invalid token');
    }
    
    // Get or create employee record
    let employee = getEmployeeByEmail(userInfo.email);
    
    if (!employee) {
      // Create new employee record for first-time login
      employee = {
        id: generateId(),
        name: data.name || userInfo.name,
        email: userInfo.email,
        role: 'employee', // Default role
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
      addRowToSheet(sheet, {
        ID: employee.id,
        Name: employee.name,
        Email: employee.email,
        Role: employee.role,
        CreatedAt: employee.createdAt,
        UpdatedAt: employee.updatedAt
      });
    }
    
    return {
      success: true,
      role: employee.Role,
      employeeId: employee.ID,
      permissions: getPermissionsForRole(employee.Role)
    };
    
  } catch (error) {
    console.error('Error in handleAuthenticateUser:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Verify Google ID token
 */
function verifyGoogleToken(token) {
  try {
    // In a real implementation, you would verify the token with Google
    // For now, we'll decode the JWT payload (not secure for production)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(Utilities.base64Decode(parts[1], Utilities.Charset.UTF_8));
    
    // Basic validation
    if (!payload.email || !payload.name) {
      return null;
    }
    
    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Get employee by email
 */
function getEmployeeByEmail(email) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const employees = sheetToObjects(sheet);
    
    return employees.find(emp => emp.Email.toLowerCase() === email.toLowerCase());
    
  } catch (error) {
    console.error('Error getting employee by email:', error);
    return null;
  }
}

/**
 * Get permissions for role
 */
function getPermissionsForRole(role) {
  const permissions = {
    'employee': [
      'view_own_tasks',
      'update_own_progress'
    ],
    'supervisor': [
      'view_own_tasks',
      'update_own_progress',
      'view_team_tasks',
      'create_tasks',
      'edit_tasks',
      'view_dashboard',
      'manage_employees'
    ],
    'admin': [
      'view_own_tasks',
      'update_own_progress',
      'view_team_tasks',
      'create_tasks',
      'edit_tasks',
      'delete_tasks',
      'view_dashboard',
      'manage_employees',
      'delete_employees',
      'system_admin'
    ]
  };
  
  return permissions[role] || permissions['employee'];
}

/**
 * Check if user has permission
 */
function hasPermission(userRole, permission) {
  const userPermissions = getPermissionsForRole(userRole);
  return userPermissions.includes(permission);
}

/**
 * Verify user permissions for action
 */
function verifyPermissions(userData, requiredPermission) {
  if (!userData || !userData.employee) {
    return false;
  }
  
  return hasPermission(userData.employee.Role, requiredPermission);
}