// Code.gs - Fixed KPI Dashboard Backend for POST requests

// Configuration
const CONFIG = {
  SPREADSHEET_ID: '1VTERW3H4DaMTDSgrQOBQTRZlx601EnDMzF4-S3TxloA', // Replace this with your Google Sheet ID
  CORS_ORIGIN: '*'
};

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setHeaders({
      'Access-Control-Allow-Origin': CONFIG.CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600'
    });
}

/**
 * Main entry point for POST requests
 */
function doPost(e) {
  try {
    console.log('POST request received:', e.postData);
    
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': CONFIG.CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    // Parse request body
    let requestData;
    try {
      if (e.postData && e.postData.contents) {
        requestData = JSON.parse(e.postData.contents);
      } else {
        throw new Error('No POST data received');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid JSON in request body: ' + parseError.message);
    }
    
    const { action, data, user } = requestData;
    
    if (!action) {
      throw new Error('Action is required');
    }
    
    console.log(`Processing action: ${action}`, data);
    
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
            description: 'This is a sample task from the backend',
            status: 'In Progress',
            dueDate: '2025-09-25',
            progress: 75
          },
          {
            id: '2', 
            title: 'Sample Task 2',
            description: 'Another sample task from the backend',
            status: 'Pending',
            dueDate: '2025-09-30',
            progress: 25
          }
        ];
        break;
        
      case 'ping':
      case 'test':
        result = { 
          message: 'POST request working!', 
          timestamp: new Date().toISOString(),
          receivedData: data
        };
        break;
        
      default:
        result = { 
          message: `Action ${action} received via POST but not implemented yet`,
          action: action,
          timestamp: new Date().toISOString()
        };
    }
    
    console.log(`Returning result for ${action}:`, result);
    
    const response = {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setHeaders(headers)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('POST Error:', error);
    
    const errorResponse = {
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
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
  try {
    const action = e.parameter.action;
    
    console.log('GET request received for action:', action);
    
    const headers = {
      'Access-Control-Allow-Origin': CONFIG.CORS_ORIGIN,
      'Content-Type': 'application/json'
    };
    
    let result;
    if (action === 'test') {
      result = {
        success: true,
        message: 'GET request working! Backend is operational.',
        action: action,
        timestamp: new Date().toISOString(),
        note: 'Frontend should use POST requests for actual API calls'
      };
    } else {
      result = {
        success: true,
        message: 'KPI Dashboard API is running',
        availableActions: ['getUserRole', 'getTasksByEmployee', 'test'],
        timestamp: new Date().toISOString(),
        note: 'Use POST requests for API calls'
      };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setHeaders(headers)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('GET Error:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }))
      .setHeaders({
        'Access-Control-Allow-Origin': CONFIG.CORS_ORIGIN,
        'Content-Type': 'application/json'
      })
      .setMimeType(ContentService.MimeType.JSON);
  }
}