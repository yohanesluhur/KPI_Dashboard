// Combined Google Apps Script Backend
// Copy and paste this entire content into your Google Apps Script project

// Code.gs - Main Google Apps Script File

/**
 * KPI Dashboard Google Apps Script Backend
 * This file handles all API requests from the frontend application
 */

// Configuration
const CONFIG = {
  SPREADSHEET_ID: '1VTERW3H4DaMTDSgrQOBQTRZlx601EnDMzF4-S3TxloA', // Google Sheet ID
  SHEETS: {
    EMPLOYEES: 'Employees',
    TASKS: 'Tasks',
    PROGRESS: 'Progress'
  },
  CORS_ORIGIN: '*', // Configure for production
  AUTH_REQUIRED: false // Disable for testing
};

/**
 * Main entry point for HTTP requests
 */
function doPost(e) {
  try {
    // Force success mode for testing/troubleshooting
    const forceSuccess = true; // Set to true to bypass request validation
    
    // Enable debug mode with debug=true parameter
    const isDebugMode = e && e.parameter && e.parameter.debug === 'true';
    
    // Always handle any request that has an action
    const actionFromParameter = e && e.parameter ? e.parameter.action : null;
    const hasPostData = Boolean(e && e.postData && e.postData.contents);
    
    // Handle preflight OPTIONS request for CORS
    if (e && e.parameter && e.parameter.method === 'OPTIONS') {
      return ContentService
        .createTextOutput('')
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Special debug endpoint to see what's in the event object
    if ((isDebugMode && actionFromParameter === 'debug') || actionFromParameter === 'debug') {
      // Create safe copy of event object with circular references removed
      const debugInfo = {
        hasEventObject: Boolean(e),
        hasPostData: Boolean(e && e.postData),
        hasContents: Boolean(e && e.postData && e.postData.contents),
        parameters: e && e.parameter ? Object.keys(e.parameter) : [],
        postDataType: e && e.postData ? e.postData.type : null,
        contentLength: e && e.postData && e.postData.contents ? e.postData.contents.length : 0,
        contentPreview: e && e.postData && e.postData.contents ? e.postData.contents.substring(0, 100) : null
      };
      
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'Debug information',
          debugInfo: debugInfo,
          timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Accept any request with a valid action parameter
    if (actionFromParameter) {
      // Special cases for simple endpoints
      if (actionFromParameter === 'test' || actionFromParameter === 'ping' || actionFromParameter === 'getEmployees' || 
          actionFromParameter === 'getTasks' || actionFromParameter === 'getKPIMetrics') {
        
        let result;
        switch(actionFromParameter) {
          case 'test':
            result = { message: 'API is working', config: { authRequired: CONFIG.AUTH_REQUIRED } };
            break;
          case 'ping':
            result = { message: 'pong', timestamp: new Date().toISOString() };
            break;
          case 'getEmployees':
            result = handleGetEmployees();
            break;
          case 'getTasks':
            result = handleGetTasks();
            break;
          case 'getKPIMetrics':
            result = handleGetKPIMetrics({});
            break;
        }
        
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Handle case where there's no event object or missing postData
    if ((!e || !e.postData) && !forceSuccess) {
      if (isDebugMode) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'No valid request data found. Try adding ?action=test or ?action=debug&debug=true to URL',
            requestInfo: {
              hasEventObject: Boolean(e),
              hasPostData: Boolean(e && e.postData),
              hasParameters: Boolean(e && e.parameter),
              parameterKeys: e && e.parameter ? Object.keys(e.parameter) : []
            },
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      throw new Error('This API requires POST requests with JSON data. For testing, use: ?action=test');
    }
    
    // Parse request body - ultra flexible approach
    let requestData;
    let action = actionFromParameter;
    let data = {};
    let user = null;
    
    try {
      // If we have URL parameters, use those first
      if (e && e.parameter) {
        // Copy all parameters except action and debug
        for (const key in e.parameter) {
          if (key !== 'action' && key !== 'debug' && key !== 'method') {
            data[key] = e.parameter[key];
          }
        }
      }
      
      // Try to parse JSON from post data if available
      if (e && e.postData && e.postData.contents) {
        try {
          // Try parsing as JSON
          const parsedData = JSON.parse(e.postData.contents);
          
          // Extract action, data, and user if available
          if (parsedData.action && !action) {
            action = parsedData.action;
          }
          
          if (parsedData.data) {
            // Merge with any data from parameters
            data = {...data, ...parsedData.data};
          } else if (typeof parsedData === 'object' && !parsedData.action) {
            // If the JSON doesn't have an action property, treat the whole object as data
            data = {...data, ...parsedData};
          }
          
          if (parsedData.user) {
            user = parsedData.user;
          }
        } catch (jsonError) {
          // Not valid JSON, try form encoded data
          if (e.postData.type && e.postData.type.includes('form')) {
            const formData = {};
            const params = e.postData.contents.split('&');
            for (let i = 0; i < params.length; i++) {
              const pair = params[i].split('=');
              if (pair.length === 2) {
                const key = decodeURIComponent(pair[0]);
                const value = decodeURIComponent(pair[1] || '');
                
                if (key === 'action' && !action) {
                  action = value;
                } else {
                  data[key] = value;
                }
              }
            }
          }
        }
      }
      
      // Final fallback for action
      if (!action && forceSuccess) {
        // Default to test if no action found but we're forcing success
        action = 'test';
      }
      
    } catch (parseError) {
      // If we're forcing success, don't throw, just log and continue with default values
      if (forceSuccess) {
        console.error('Parse error (ignored in force success mode):', parseError);
        action = action || 'test';
      } else {
        throw new Error('Invalid request format: ' + parseError.message);
      }
    }
    
    if (!action) {
      throw new Error('Action is required');
    }
    
    console.log(`API Request: ${action}`, data);
    
    // Authenticate user if required
    let authenticatedUser = null;
    if (CONFIG.AUTH_REQUIRED && user) {
      authenticatedUser = authenticateUser(user);
      if (!authenticatedUser) {
        throw new Error('Authentication failed');
      }
    }
    
    // Route the request
    let result;
    switch (action) {
      // Test endpoints
      case 'ping':
        result = { message: 'pong', timestamp: new Date().toISOString() };
        break;
      case 'test':
        result = { message: 'API is working', config: { authRequired: CONFIG.AUTH_REQUIRED } };
        break;
        
      // Authentication
      case 'authenticateUser':
        result = handleAuthenticateUser(data);
        break;
      case 'getUserRole':
        result = handleGetUserRole(data);
        break;
        
      // Employee management
      case 'getEmployees':
        result = handleGetEmployees();
        break;
      case 'addEmployee':
        result = handleAddEmployee(data);
        break;
      case 'updateEmployee':
        result = handleUpdateEmployee(data);
        break;
      case 'deleteEmployee':
        result = handleDeleteEmployee(data);
        break;
      case 'getEmployeeByEmail':
        result = handleGetEmployeeByEmail(data);
        break;
        
      // Task management
      case 'getTasks':
        result = handleGetTasks();
        break;
      case 'getTasksByEmployee':
        result = handleGetTasksByEmployee(data);
        break;
      case 'getTasksBySupervisor':
        result = handleGetTasksBySupervisor(data);
        break;
      case 'addTask':
        result = handleAddTask(data);
        break;
      case 'updateTask':
        result = handleUpdateTask(data);
        break;
      case 'updateTaskProgress':
        result = handleUpdateTaskProgress(data);
        break;
      case 'deleteTask':
        result = handleDeleteTask(data);
        break;
        
      // Progress management
      case 'getProgressByTask':
        result = handleGetProgressByTask(data);
        break;
      case 'addProgress':
        result = handleAddProgress(data);
        break;
      case 'updateProgress':
        result = handleUpdateProgress(data);
        break;
      case 'deleteProgress':
        result = handleDeleteProgress(data);
        break;
        
      // Dashboard data
      case 'getSupervisorDashboard':
        result = handleGetSupervisorDashboard(data);
        break;
      case 'getEmployeeDashboard':
        result = handleGetEmployeeDashboard(data);
        break;
      case 'getKPIMetrics':
        result = handleGetKPIMetrics(data);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    console.log(`API Response: ${action}`, result);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('API Error:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle GET requests (for testing and diagnostics)
 */
function doGet(e) {
  try {
    const action = (e && e.parameter) ? e.parameter.action : null;
    const isDebugMode = e && e.parameter && e.parameter.debug === 'true';
    
    // Debug mode
    if (isDebugMode) {
      const debugInfo = {
        hasEventObject: Boolean(e),
        hasParameter: Boolean(e && e.parameter),
        parameters: e && e.parameter ? Object.keys(e.parameter) : [],
        url: ScriptApp.getService().getUrl(),
        deploymentId: e && e.parameter && e.parameter.deploymentId ? e.parameter.deploymentId : 'unknown'
      };
      
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'Debug information for GET request',
          debugInfo: debugInfo,
          timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Test endpoints
    if (action === 'test') {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'KPI Dashboard API is running',
          timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'ping') {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: 'pong',
          timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'getUserRole') {
      // Handle getUserRole via GET request
      try {
        const email = e.parameter.email || e.parameter.userEmail;
        if (!email) {
          throw new Error('Email parameter is required');
        }
        
        const result = handleGetUserRole({ email: email });
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else if (action === 'getTasksByEmployee') {
      // Handle getTasksByEmployee via GET request
      try {
        const employeeId = e.parameter.employeeId;
        if (!employeeId) {
          throw new Error('Employee ID parameter is required');
        }
        
        const result = handleGetTasksByEmployee({ employeeId: employeeId });
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else if (action === 'getTasks') {
      // Handle getTasks via GET request
      try {
        const result = handleGetTasks();
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else if (action === 'getEmployees') {
      // Handle getEmployees via GET request
      try {
        const result = handleGetEmployees();
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else if (action === 'getTasksBySupervisor') {
      // Handle getTasksBySupervisor via GET request
      try {
        const supervisorId = e.parameter.supervisorId;
        if (!supervisorId) {
          throw new Error('Supervisor ID parameter is required');
        }
        
        const result = handleGetTasksBySupervisor({ supervisorId: supervisorId });
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else if (action === 'getProgressByTask') {
      // Handle getProgressByTask via GET request
      try {
        const taskId = e.parameter.taskId;
        if (!taskId) {
          throw new Error('Task ID parameter is required');
        }
        
        const result = handleGetProgressByTask({ taskId: taskId });
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else if (action === 'initializeEmptySheets') {
      // Handle initializeEmptySheets via GET request
      try {
        const result = initializeEmptySheets();
        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else if (action === 'info') {
      // Provide API info for diagnostics
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          apiInfo: {
            name: 'KPI Dashboard API',
            version: '1.0',
            endpoints: ['test', 'ping', 'info', 'debug'],
            supportedMethods: ['GET', 'POST'],
            config: {
              authRequired: CONFIG.AUTH_REQUIRED,
              corsEnabled: Boolean(CONFIG.CORS_ORIGIN)
            },
            troubleshooting: "Add ?debug=true to any URL to get detailed diagnostic information"
          },
          timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'GET method not fully supported for this API. Use POST for data operations.',
        availableEndpoints: ['Use ?action=test for connectivity testing', 
                           'Use ?action=ping for simple ping test', 
                           'Use ?action=info for API information',
                           'Use ?action=debug&debug=true for diagnostic information'],
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get or create spreadsheet
 */
function getSpreadsheet() {
  try {
    if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID') {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    } else {
      // Create new spreadsheet if ID not configured
      const ss = SpreadsheetApp.create('KPI Dashboard Data');
      console.log('Created new spreadsheet:', ss.getId());
      return ss;
    }
  } catch (error) {
    console.error('Error getting spreadsheet:', error);
    throw new Error('Failed to access spreadsheet');
  }
}

/**
 * Get or create sheet
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  
  return sheet;
}

/**
 * Initialize sheet with headers and sample data
 */
function initializeSheet(sheet, sheetName) {
  let headers = [];
  
  switch (sheetName) {
    case CONFIG.SHEETS.EMPLOYEES:
      headers = ['ID', 'Name', 'Email', 'Role', 'CreatedAt', 'UpdatedAt'];
      break;
    case CONFIG.SHEETS.TASKS:
      headers = ['ID', 'Description', 'EmployeeID', 'DueDate', 'Status', 'Progress', 'SupervisorId', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'LastUpdate'];
      break;
    case CONFIG.SHEETS.PROGRESS:
      headers = ['ID', 'TaskID', 'EmployeeID', 'Progress', 'Status', 'Notes', 'CreatedAt'];
      break;
  }
  
  if (headers.length > 0) {
    // Add headers only
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

/**
 * Generate unique ID
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Utility function to convert sheet data to objects
 */
function sheetToObjects(sheet, startRow = 2) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const objects = [];
  
  for (let i = startRow - 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    
    // Skip empty rows
    if (obj.ID) {
      objects.push(obj);
    }
  }
  
  return objects;
}

// ============ EMPLOYEE HANDLERS ============

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
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error in handleGetEmployees:', error);
    return {
      success: false,
      error: 'Failed to retrieve employees'
    };
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
    
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const employee = {
      ID: generateId(),
      Name: data.name,
      Email: data.email,
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
    throw new Error('Failed to add employee');
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
    
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const employees = sheetToObjects(sheet);
    
    const employee = employees.find(emp => emp.Email === data.email);
    
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
 * Handle update employee
 */
function handleUpdateEmployee(data) {
  try {
    if (!data.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const updateData = {
      ID: data.employeeId,
      UpdatedAt: new Date().toISOString()
    };
    
    // Add fields that are provided
    if (data.name !== undefined) updateData.Name = data.name;
    if (data.email !== undefined) updateData.Email = data.email;
    if (data.role !== undefined) updateData.Role = data.role;
    
    const success = updateRowInSheet(sheet, data.employeeId, updateData);
    
    if (!success) {
      throw new Error('Employee not found');
    }
    
    return {
      success: true,
      message: 'Employee updated successfully'
    };
    
  } catch (error) {
    console.error('Error in handleUpdateEmployee:', error);
    throw new Error('Failed to update employee');
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
    
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIndex = headers.indexOf('ID');
    
    if (idIndex === -1) {
      throw new Error('ID column not found');
    }
    
    // Find and delete the row
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idIndex] === data.employeeId) {
        sheet.deleteRow(i + 1);
        return {
          success: true,
          message: 'Employee deleted successfully'
        };
      }
    }
    
    throw new Error('Employee not found');
    
  } catch (error) {
    console.error('Error in handleDeleteEmployee:', error);
    throw new Error('Failed to delete employee');
  }
}

// ============ TASK HANDLERS ============

/**
 * Handle get all tasks
 */
function handleGetTasks() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(sheet);
    
    // Convert to frontend format
    const result = tasks.map(task => ({
      id: task.ID,
      description: task.Description,
      employeeId: task.EmployeeID,
      dueDate: task.DueDate,
      status: task.Status,
      progress: task.Progress,
      createdBy: task.CreatedBy,
      createdAt: task.CreatedAt,
      updatedAt: task.UpdatedAt,
      lastUpdate: task.LastUpdate
    }));
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error in handleGetTasks:', error);
    return {
      success: false,
      error: 'Failed to retrieve tasks'
    };
  }
}

/**
 * Handle get tasks by employee
 */
function handleGetTasksByEmployee(data) {
  try {
    if (!data.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(sheet);
    
    const employeeTasks = tasks.filter(task => task.EmployeeID === data.employeeId);
    
    // Convert to frontend format
    const result = employeeTasks.map(task => ({
      id: task.ID,
      description: task.Description,
      employeeId: task.EmployeeID,
      dueDate: task.DueDate,
      status: task.Status,
      progress: task.Progress,
      createdBy: task.CreatedBy,
      createdAt: task.CreatedAt,
      updatedAt: task.UpdatedAt,
      lastUpdate: task.LastUpdate
    }));
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error in handleGetTasksByEmployee:', error);
    return {
      success: false,
      error: 'Failed to retrieve employee tasks'
    };
  }
}

/**
 * Handle get tasks by supervisor
 */
function handleGetTasksBySupervisor(data) {
  try {
    if (!data.supervisorId) {
      throw new Error('Supervisor ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const tasks = sheetToObjects(sheet);
    
    // Get tasks supervised by this supervisor
    const supervisorTasks = tasks.filter(task => 
      task.SupervisorId === data.supervisorId
    );
    
    // Convert to frontend format
    const result = supervisorTasks.map(task => ({
      id: task.ID,
      description: task.Description,
      employeeId: task.EmployeeID,
      dueDate: task.DueDate,
      status: task.Status,
      progress: task.Progress,
      supervisorId: task.SupervisorId,
      createdBy: task.CreatedBy,
      createdAt: task.CreatedAt,
      updatedAt: task.UpdatedAt,
      lastUpdate: task.LastUpdate
    }));
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('Error in handleGetTasksBySupervisor:', error);
    return {
      success: false,
      error: 'Failed to retrieve supervisor tasks'
    };
  }
}

/**
 * Handle add task
 */
function handleAddTask(data) {
  try {
    // Validation
    if (!data.description || !data.employeeId) {
      throw new Error('Description and employee ID are required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const task = {
      ID: generateId(),
      Description: data.description,
      EmployeeID: data.employeeId,
      DueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 7 days from now
      Status: data.status || 'pending',
      Progress: data.progress || 0,
      SupervisorId: data.supervisorId || 'system',
      CreatedBy: data.createdBy || data.supervisorId || 'system',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      LastUpdate: new Date().toISOString()
    };
    
    addRowToSheet(sheet, task);
    
    return {
      id: task.ID,
      description: task.Description,
      employeeId: task.EmployeeID,
      dueDate: task.DueDate,
      status: task.Status,
      progress: task.Progress,
      createdBy: task.CreatedBy,
      createdAt: task.CreatedAt,
      updatedAt: task.UpdatedAt,
      lastUpdate: task.LastUpdate
    };
    
  } catch (error) {
    console.error('Error in handleAddTask:', error);
    throw new Error('Failed to add task');
  }
}

/**
 * Handle update task
 */
function handleUpdateTask(data) {
  try {
    if (!data.taskId) {
      throw new Error('Task ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const updateData = {
      ID: data.taskId,
      UpdatedAt: new Date().toISOString(),
      LastUpdate: new Date().toISOString()
    };
    
    // Add fields that are provided
    if (data.description !== undefined) updateData.Description = data.description;
    if (data.employeeId !== undefined) updateData.EmployeeID = data.employeeId;
    if (data.dueDate !== undefined) updateData.DueDate = data.dueDate;
    if (data.status !== undefined) updateData.Status = data.status;
    if (data.progress !== undefined) updateData.Progress = data.progress;
    
    const success = updateRowInSheet(sheet, data.taskId, updateData);
    
    if (!success) {
      throw new Error('Task not found');
    }
    
    return {
      success: true,
      message: 'Task updated successfully'
    };
    
  } catch (error) {
    console.error('Error in handleUpdateTask:', error);
    throw new Error('Failed to update task');
  }
}

/**
 * Handle update task progress
 */
function handleUpdateTaskProgress(data) {
  try {
    if (!data.taskId || data.progress === undefined) {
      throw new Error('Task ID and progress are required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const updateData = {
      ID: data.taskId,
      Progress: data.progress,
      UpdatedAt: new Date().toISOString(),
      LastUpdate: new Date().toISOString()
    };
    
    // Update status based on progress if not explicitly provided
    if (data.status === undefined) {
      if (data.progress === 0) {
        updateData.Status = 'pending';
      } else if (data.progress === 100) {
        updateData.Status = 'completed';
      } else if (data.progress > 0) {
        updateData.Status = 'in-progress';
      }
    } else {
      updateData.Status = data.status;
    }
    
    const success = updateRowInSheet(sheet, data.taskId, updateData);
    
    if (!success) {
      throw new Error('Task not found');
    }
    
    return {
      success: true,
      message: 'Task progress updated successfully',
      progress: data.progress,
      status: updateData.Status
    };
    
  } catch (error) {
    console.error('Error in handleUpdateTaskProgress:', error);
    throw new Error('Failed to update task progress');
  }
}

/**
 * Handle delete task
 */
function handleDeleteTask(data) {
  try {
    if (!data.taskId) {
      throw new Error('Task ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIndex = headers.indexOf('ID');
    
    if (idIndex === -1) {
      throw new Error('ID column not found');
    }
    
    // Find and delete the row
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idIndex] === data.taskId) {
        sheet.deleteRow(i + 1);
        return {
          success: true,
          message: 'Task deleted successfully'
        };
      }
    }
    
    throw new Error('Task not found');
    
  } catch (error) {
    console.error('Error in handleDeleteTask:', error);
    throw new Error('Failed to delete task');
  }
}

// ============ PROGRESS HANDLERS ============

/**
 * Handle get progress by task
 */
function handleGetProgressByTask(data) {
  try {
    if (!data.taskId) {
      throw new Error('Task ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const progressEntries = sheetToObjects(sheet);
    
    const taskProgress = progressEntries.filter(progress => progress.TaskID === data.taskId);
    
    // Convert to frontend format
    const result = taskProgress.map(progress => ({
      id: progress.ID,
      taskId: progress.TaskID,
      employeeId: progress.EmployeeID,
      progress: progress.Progress,
      status: progress.Status,
      notes: progress.Notes,
      createdAt: progress.CreatedAt
    }));
    
    return result;
    
  } catch (error) {
    console.error('Error in handleGetProgressByTask:', error);
    throw new Error('Failed to retrieve progress entries');
  }
}

/**
 * Handle add progress
 */
function handleAddProgress(data) {
  try {
    // Validation
    if (!data.taskId || !data.employeeId || data.progress === undefined) {
      throw new Error('Task ID, employee ID, and progress are required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const progressEntry = {
      ID: generateId(),
      TaskID: data.taskId,
      EmployeeID: data.employeeId,
      Progress: data.progress,
      Status: data.status || (data.progress === 100 ? 'completed' : (data.progress > 0 ? 'in-progress' : 'pending')),
      Notes: data.notes || '',
      CreatedAt: new Date().toISOString()
    };
    
    addRowToSheet(sheet, progressEntry);
    
    return {
      id: progressEntry.ID,
      taskId: progressEntry.TaskID,
      employeeId: progressEntry.EmployeeID,
      progress: progressEntry.Progress,
      status: progressEntry.Status,
      notes: progressEntry.Notes,
      createdAt: progressEntry.CreatedAt
    };
    
  } catch (error) {
    console.error('Error in handleAddProgress:', error);
    throw new Error('Failed to add progress entry');
  }
}

/**
 * Handle update progress
 */
function handleUpdateProgress(data) {
  try {
    if (!data.progressId) {
      throw new Error('Progress ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const updateData = {
      ID: data.progressId
    };
    
    // Add fields that are provided
    if (data.progress !== undefined) updateData.Progress = data.progress;
    if (data.status !== undefined) updateData.Status = data.status;
    if (data.notes !== undefined) updateData.Notes = data.notes;
    
    const success = updateRowInSheet(sheet, data.progressId, updateData);
    
    if (!success) {
      throw new Error('Progress entry not found');
    }
    
    return {
      success: true,
      message: 'Progress entry updated successfully'
    };
    
  } catch (error) {
    console.error('Error in handleUpdateProgress:', error);
    throw new Error('Failed to update progress entry');
  }
}

/**
 * Handle delete progress
 */
function handleDeleteProgress(data) {
  try {
    if (!data.progressId) {
      throw new Error('Progress ID is required');
    }
    
    const sheet = getSheet(CONFIG.SHEETS.PROGRESS);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIndex = headers.indexOf('ID');
    
    if (idIndex === -1) {
      throw new Error('ID column not found');
    }
    
    // Find and delete the row
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idIndex] === data.progressId) {
        sheet.deleteRow(i + 1);
        return {
          success: true,
          message: 'Progress entry deleted successfully'
        };
      }
    }
    
    throw new Error('Progress entry not found');
    
  } catch (error) {
    console.error('Error in handleDeleteProgress:', error);
    throw new Error('Failed to delete progress entry');
  }
}

// ============ DASHBOARD HANDLERS ============

/**
 * Handle get supervisor dashboard data
 */
function handleGetSupervisorDashboard(data) {
  try {
    if (!data.supervisorId) {
      throw new Error('Supervisor ID is required');
    }
    
    // Get tasks created by this supervisor
    const taskStats = getTaskStatistics({ supervisorId: data.supervisorId });
    
    // Get employee statistics
    const employeeStats = getEmployeeStatistics();
    
    // Get recent activity
    const recentActivity = getRecentActivity(data.supervisorId);
    
    return {
      taskStatistics: taskStats,
      employeeStatistics: employeeStats,
      recentActivity: recentActivity,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in handleGetSupervisorDashboard:', error);
    throw new Error('Failed to retrieve supervisor dashboard data');
  }
}

/**
 * Handle get employee dashboard data
 */
function handleGetEmployeeDashboard(data) {
  try {
    if (!data.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    // Get tasks assigned to this employee
    const taskStats = getTaskStatistics({ employeeId: data.employeeId });
    
    // Get employee's own progress
    const employeeTasks = handleGetTasksByEmployee({ employeeId: data.employeeId });
    
    // Get recent activity for this employee
    const recentActivity = getEmployeeRecentActivity(data.employeeId);
    
    return {
      taskStatistics: taskStats,
      tasks: employeeTasks,
      recentActivity: recentActivity,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in handleGetEmployeeDashboard:', error);
    throw new Error('Failed to retrieve employee dashboard data');
  }
}

/**
 * Handle get KPI metrics
 */
function handleGetKPIMetrics(data) {
  try {
    const filters = data || {};
    
    // Overall statistics
    const taskStats = getTaskStatistics(filters);
    const employeeStats = getEmployeeStatistics();
    
    // Performance metrics
    const performanceMetrics = getPerformanceMetrics(filters);
    
    // Trend data
    const trendData = getTrendData(filters);
    
    return {
      taskStatistics: taskStats,
      employeeStatistics: employeeStats,
      performanceMetrics: performanceMetrics,
      trendData: trendData,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in handleGetKPIMetrics:', error);
    throw new Error('Failed to retrieve KPI metrics');
  }
}

/**
 * Get task statistics
 */
function getTaskStatistics(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    let tasks = sheetToObjects(sheet);
    
    // Apply filters
    if (filters.supervisorId) {
      tasks = tasks.filter(task => task.SupervisorId === filters.supervisorId);
    }
    if (filters.employeeId) {
      tasks = tasks.filter(task => task.EmployeeID === filters.employeeId);
    }
    
    const total = tasks.length;
    const completed = tasks.filter(task => task.Status === 'completed').length;
    const inProgress = tasks.filter(task => task.Status === 'in-progress').length;
    const pending = tasks.filter(task => task.Status === 'pending').length;
    const overdue = tasks.filter(task => {
      const dueDate = new Date(task.DueDate);
      return dueDate < new Date() && task.Status !== 'completed';
    }).length;
    
    return {
      total,
      completed,
      inProgress,
      pending,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
    
  } catch (error) {
    console.error('Error in getTaskStatistics:', error);
    return { total: 0, completed: 0, inProgress: 0, pending: 0, overdue: 0, completionRate: 0 };
  }
}

/**
 * Get employee statistics
 */
function getEmployeeStatistics() {
  try {
    const sheet = getSheet(CONFIG.SHEETS.EMPLOYEES);
    const employees = sheetToObjects(sheet);
    
    const total = employees.length;
    const supervisors = employees.filter(emp => emp.Role === 'supervisor').length;
    const regularEmployees = employees.filter(emp => emp.Role === 'employee').length;
    
    return {
      total,
      supervisors,
      employees: regularEmployees
    };
    
  } catch (error) {
    console.error('Error in getEmployeeStatistics:', error);
    return { total: 0, supervisors: 0, employees: 0 };
  }
}

/**
 * Get performance metrics
 */
function getPerformanceMetrics(filters = {}) {
  try {
    const taskStats = getTaskStatistics(filters);
    const avgProgress = getAverageProgress(filters);
    
    return {
      completionRate: taskStats.completionRate,
      averageProgress: avgProgress,
      onTimeDelivery: calculateOnTimeDelivery(filters),
      productivity: calculateProductivity(filters)
    };
    
  } catch (error) {
    console.error('Error in getPerformanceMetrics:', error);
    return { completionRate: 0, averageProgress: 0, onTimeDelivery: 0, productivity: 0 };
  }
}

/**
 * Get trend data (simplified)
 */
function getTrendData(filters = {}) {
  // For now, return sample trend data
  return {
    weeklyProgress: [65, 70, 75, 80, 85],
    monthlyCompletion: [12, 15, 18, 22, 25]
  };
}

/**
 * Get average progress
 */
function getAverageProgress(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    let tasks = sheetToObjects(sheet);
    
    // Apply filters
    if (filters.supervisorId) {
      tasks = tasks.filter(task => task.SupervisorId === filters.supervisorId);
    }
    
    if (tasks.length === 0) return 0;
    
    const totalProgress = tasks.reduce((sum, task) => sum + (parseInt(task.Progress) || 0), 0);
    return Math.round(totalProgress / tasks.length);
    
  } catch (error) {
    console.error('Error in getAverageProgress:', error);
    return 0;
  }
}

/**
 * Calculate on-time delivery rate
 */
function calculateOnTimeDelivery(filters = {}) {
  try {
    const sheet = getSheet(CONFIG.SHEETS.TASKS);
    let tasks = sheetToObjects(sheet);
    
    // Apply filters
    if (filters.supervisorId) {
      tasks = tasks.filter(task => task.SupervisorId === filters.supervisorId);
    }
    
    const completedTasks = tasks.filter(task => task.Status === 'completed');
    if (completedTasks.length === 0) return 0;
    
    const onTimeTasks = completedTasks.filter(task => {
      const dueDate = new Date(task.DueDate);
      const completedDate = new Date(task.UpdatedAt);
      return completedDate <= dueDate;
    });
    
    return Math.round((onTimeTasks.length / completedTasks.length) * 100);
    
  } catch (error) {
    console.error('Error in calculateOnTimeDelivery:', error);
    return 0;
  }
}

/**
 * Calculate productivity score
 */
function calculateProductivity(filters = {}) {
  // Simplified productivity calculation
  const completionRate = getTaskStatistics(filters).completionRate;
  const avgProgress = getAverageProgress(filters);
  return Math.round((completionRate + avgProgress) / 2);
}

/**
 * Get recent activity
 */
function getRecentActivity(supervisorId, limit = 10) {
  try {
    const taskSheet = getSheet(CONFIG.SHEETS.TASKS);
    const progressSheet = getSheet(CONFIG.SHEETS.PROGRESS);
    
    const tasks = sheetToObjects(taskSheet);
    const progressUpdates = sheetToObjects(progressSheet);
    
    const recentTasks = tasks
      .filter(task => task.SupervisorId === supervisorId)
      .sort((a, b) => new Date(b.UpdatedAt) - new Date(a.UpdatedAt))
      .slice(0, limit);
    
    return recentTasks.map(task => ({
      type: 'task_update',
      message: `Task "${task.Description}" updated to ${task.Status}`,
      timestamp: task.UpdatedAt,
      taskId: task.ID
    }));
    
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    return [];
  }
}

/**
 * Get recent activity for an employee
 */
function getEmployeeRecentActivity(employeeId, limit = 10) {
  try {
    const taskSheet = getSheet(CONFIG.SHEETS.TASKS);
    const progressSheet = getSheet(CONFIG.SHEETS.PROGRESS);
    
    const tasks = sheetToObjects(taskSheet);
    const progressUpdates = sheetToObjects(progressSheet);
    
    // Get recent tasks assigned to this employee
    const recentTasks = tasks
      .filter(task => task.EmployeeID === employeeId)
      .sort((a, b) => new Date(b.UpdatedAt) - new Date(a.UpdatedAt))
      .slice(0, limit);
    
    return recentTasks.map(task => ({
      type: 'task_assigned',
      message: `Task "${task.Description}" - ${task.Status} (${task.Progress}%)`,
      timestamp: task.UpdatedAt,
      taskId: task.ID
    }));
    
  } catch (error) {
    console.error('Error in getEmployeeRecentActivity:', error);
    return [];
  }
}

// ============ AUTH HANDLERS ============

/**
 * Handle get user role
 */
function handleGetUserRole(data) {
  try {
    if (!data.email) {
      throw new Error('Email is required');
    }
    
    // Get user from employees sheet
    let employee = handleGetEmployeeByEmail({ email: data.email });
    
    if (!employee) {
      // Auto-create user if they don't exist
      console.log('User not found, creating new employee record for:', data.email);
      
      // Extract name from email or use provided name
      const name = data.name || data.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Create new employee with default role
      const newEmployee = {
        name: name,
        email: data.email,
        role: 'employee' // Default to employee role
      };
      
      const createResult = handleAddEmployee(newEmployee);
      if (createResult.success) {
        // Get the newly created employee
        employee = handleGetEmployeeByEmail({ email: data.email });
      } else {
        return {
          success: false,
          error: 'Failed to create user account'
        };
      }
    }
    
    return {
      success: true,
      data: {
        role: employee.role,
        userId: employee.id,
        name: employee.name,
        email: employee.email
      }
    };
    
  } catch (error) {
    console.error('Error in handleGetUserRole:', error);
    return {
      success: false,
      error: 'Failed to get user role: ' + error.message
    };
  }
}

/**
 * Handle authenticate user
 */
function handleAuthenticateUser(data) {
  try {
    if (!data.email) {
      throw new Error('Email is required');
    }
    
    // Check if user exists in employees sheet
    const employee = handleGetEmployeeByEmail({ email: data.email });
    
    if (employee) {
      return {
        success: true,
        user: employee
      };
    } else {
      // Create new employee if doesn't exist
      const newEmployee = handleAddEmployee({
        name: data.name || data.email,
        email: data.email,
        role: 'employee'
      });
      
      return {
        success: true,
        user: newEmployee
      };
    }
    
  } catch (error) {
    console.error('Error in handleAuthenticateUser:', error);
    throw new Error('Authentication failed');
  }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Utility function to add row to sheet
 */
function addRowToSheet(sheet, data) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => data[header] || '');
  sheet.appendRow(row);
}

/**
 * Utility function to update row in sheet
 */
function updateRowInSheet(sheet, id, data) {
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIndex = headers.indexOf('ID');
  
  if (idIndex === -1) {
    throw new Error('ID column not found');
  }
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][idIndex] === id) {
      const row = headers.map(header => 
        data.hasOwnProperty(header) ? data[header] : allData[i][headers.indexOf(header)]
      );
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return true;
    }
  }
  
  return false;
}

/**
 * Test function to initialize empty sheets with headers only
 */
function initializeEmptySheets() {
  try {
    // Force recreation of sheets with headers only
    const ss = getSpreadsheet();
    
    // Delete existing sheets if they exist
    ['Employees', 'Tasks', 'Progress'].forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        ss.deleteSheet(sheet);
      }
    });
    
    // Create new sheets with headers only
    getSheet(CONFIG.SHEETS.EMPLOYEES);
    getSheet(CONFIG.SHEETS.TASKS);
    getSheet(CONFIG.SHEETS.PROGRESS);
    
    return { success: true, message: 'Empty sheets initialized successfully' };
    
  } catch (error) {
    console.error('Error initializing empty sheets:', error);
    throw new Error('Failed to initialize empty sheets');
  }
}