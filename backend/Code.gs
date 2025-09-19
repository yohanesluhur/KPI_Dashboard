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
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': CONFIG.CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    // Handle preflight OPTIONS request
    if (e.parameter.method === 'OPTIONS') {
      return ContentService
        .createTextOutput('')
        .setHeaders(headers)
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseError) {
      throw new Error('Invalid JSON in request body');
    }
    
    const { action, data, user } = requestData;
    
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
      // Authentication
      case 'authenticateUser':
        result = handleAuthenticateUser(data);
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
      .setHeaders(headers)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('API Error:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }))
      .setHeaders({
        'Access-Control-Allow-Origin': CONFIG.CORS_ORIGIN,
        'Content-Type': 'application/json'
      })
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'test') {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'KPI Dashboard API is running',
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: 'GET method not supported for this API'
    }))
    .setMimeType(ContentService.MimeType.JSON);
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
 * Initialize sheet with headers
 */
function initializeSheet(sheet, sheetName) {
  let headers = [];
  
  switch (sheetName) {
    case CONFIG.SHEETS.EMPLOYEES:
      headers = ['ID', 'Name', 'Email', 'Role', 'CreatedAt', 'UpdatedAt'];
      break;
    case CONFIG.SHEETS.TASKS:
      headers = ['ID', 'Description', 'EmployeeID', 'DueDate', 'Status', 'Progress', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'LastUpdate'];
      break;
    case CONFIG.SHEETS.PROGRESS:
      headers = ['ID', 'TaskID', 'EmployeeID', 'Progress', 'Status', 'Notes', 'CreatedAt'];
      break;
  }
  
  if (headers.length > 0) {
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
 * Utility function to delete row from sheet
 */
function deleteRowFromSheet(sheet, id) {
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIndex = headers.indexOf('ID');
  
  if (idIndex === -1) {
    throw new Error('ID column not found');
  }
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  
  return false;
}