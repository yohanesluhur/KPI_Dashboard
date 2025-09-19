// Code.gs - Final Corrected KPI Dashboard Backend for Google Apps Script

// Configuration
const CONFIG = {
  SPREADSHEET_ID: '1VTERW3H4DaMTDSgrQOBQTRZlx601EnDMzF4-S3TxloA',
  CORS_ORIGIN: '*'
};

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main entry point for POST requests
 */
function doPost(e) {
  try {
    console.log('POST request received');
    console.log('Event object:', JSON.stringify(e, null, 2));
    
    // Parse request body with multiple fallback methods
    let requestData;
    
    try {
      // Method 1: Try e.postData.contents (standard for JSON)
      if (e && e.postData && e.postData.contents) {
        console.log('Method 1: Using e.postData.contents');
        console.log('POST data contents:', e.postData.contents);
        requestData = JSON.parse(e.postData.contents);
      }
      // Method 2: Try e.parameter (for form data or query params)
      else if (e && e.parameter && Object.keys(e.parameter).length > 0) {
        console.log('Method 2: Using e.parameter');
        console.log('Parameters:', JSON.stringify(e.parameter, null, 2));
        requestData = e.parameter;
        
        // If action is JSON string, parse it
        if (typeof requestData.action === 'string' && requestData.action.startsWith('{')) {
          requestData = JSON.parse(requestData.action);
        }
      }
      // Method 3: Try e.postData.getDataAsString() 
      else if (e && e.postData && typeof e.postData.getDataAsString === 'function') {
        console.log('Method 3: Using e.postData.getDataAsString()');
        const dataString = e.postData.getDataAsString();
        console.log('Data string:', dataString);
        requestData = JSON.parse(dataString);
      }
      // Method 4: Create test data if no data received
      else {
        console.log('Method 4: No data received, creating test response');
        requestData = {
          action: 'test',
          data: {},
          user: null,
          note: 'No POST data received, using test mode'
        };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // If JSON parsing fails, try to extract action from URL parameters
      if (e && e.parameter && e.parameter.action) {
        requestData = {
          action: e.parameter.action,
          data: e.parameter.data ? JSON.parse(e.parameter.data) : {},
          user: e.parameter.user ? JSON.parse(e.parameter.user) : null
        };
      } else {
        throw new Error('Invalid JSON in request body: ' + parseError.message);
      }
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
          receivedData: data,
          receivedUser: user,
          requestMethod: 'POST',
          debugInfo: {
            hasPostData: !!(e && e.postData),
            hasParameters: !!(e && e.parameter),
            postDataType: e && e.postData ? e.postData.type : 'none',
            parametersCount: e && e.parameter ? Object.keys(e.parameter).length : 0
          }
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
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  try {
    const action = e.parameter ? e.parameter.action : null;
    
    console.log('GET request received for action:', action);
    
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
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('GET Error:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}