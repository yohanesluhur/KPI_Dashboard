// Code.gs - Simplified KPI Dashboard Backend

// Configuration - Replace with your actual Spreadsheet ID
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID', // Replace this with your Google Sheet ID
  CORS_ORIGIN: '*'
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
    
    // Route the request
    let result;
    switch (action) {
      case 'getUserRole':
        result = { role: 'admin' }; // Default admin for testing
        break;
      case 'getTasksByEmployee':
        result = [
          {
            id: '1',
            title: 'Sample Task 1',
            description: 'This is a sample task',
            status: 'In Progress',
            dueDate: '2025-09-25',
            progress: 75
          },
          {
            id: '2', 
            title: 'Sample Task 2',
            description: 'Another sample task',
            status: 'Pending',
            dueDate: '2025-09-30',
            progress: 25
          }
        ];
        break;
      case 'ping':
      case 'test':
        result = { message: 'Backend is working!', timestamp: new Date().toISOString() };
        break;
      default:
        result = { message: `Action ${action} received but not implemented yet` };
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
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: 'KPI Dashboard API is running',
      action: action || 'none',
      timestamp: new Date().toISOString()
    }))
    .setHeaders({
      'Access-Control-Allow-Origin': CONFIG.CORS_ORIGIN,
      'Content-Type': 'application/json'
    })
    .setMimeType(ContentService.MimeType.JSON);
}