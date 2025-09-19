# Google Apps Script Backend Deployment Guide

## Current Issue
The KPI Dashboard backend is returning HTML redirects instead of JSON responses, indicating the Google Apps Script needs to be redeployed.

## Quick Fix Steps

### 1. Open Google Apps Script
- Go to [script.google.com](https://script.google.com)
- Sign in with your Google account

### 2. Create or Update Project
- If you have an existing "KPI Dashboard" project, open it
- If not, click "New project"

### 3. Replace the Code
Follow these detailed steps to replace the code:

#### A. Clear Existing Code
- In the Google Apps Script editor, you'll see a default `Code.gs` file
- Select ALL existing code (Ctrl+A) and delete it (Delete key)
- The editor should be completely empty

#### B. Copy the New Backend Code
- Open the file `backend/combined-backend.gs` in your project folder
- Select ALL content (Ctrl+A) and copy it (Ctrl+C)
- **Important**: Make sure you copy the ENTIRE file - it's about 800+ lines

#### C. Paste into Google Apps Script
- Go back to the Google Apps Script editor
- Paste the copied code (Ctrl+V)
- **Verification**: The first line should be exactly:
  ```javascript
  // Combined Google Apps Script Backend
  ```
- **Verification**: The file should end with the `initializeSampleData()` function

#### D. Double-Check the Paste
Make sure your pasted code includes:
- ✅ The opening comment: `// Combined Google Apps Script Backend`
- ✅ Configuration section with `const CONFIG = {...}`
- ✅ `doPost()` and `doGet()` functions
- ✅ All handler functions (`handleGetEmployees`, `handleGetTasks`, etc.)
- ✅ Utility functions at the bottom
- ✅ The `initializeSampleData()` function at the very end

If any part is missing, copy and paste the entire file again.

#### E. Visual Verification Guide
Your Google Apps Script editor should look like this:

**Top of file (first 10 lines):**
```javascript
// Combined Google Apps Script Backend
// Copy and paste this entire content into your Google Apps Script project

// Code.gs - Main Google Apps Script File

/**
 * KPI Dashboard Google Apps Script Backend
 * This file handles all API requests from the frontend application
 */

// Configuration
```

**Configuration section should include:**
```javascript
const CONFIG = {
  SPREADSHEET_ID: '1VTERW3H4DaMTDSgrQOBQTRZlx601EnDMzF4-S3TxloA',
  SHEETS: {
    EMPLOYEES: 'Employees',
    TASKS: 'Tasks',
    PROGRESS: 'Progress'
  },
  CORS_ORIGIN: '*',
  AUTH_REQUIRED: false
};
```

**Bottom of file (last function):**
```javascript
function initializeSampleData() {
  try {
    // Force recreation of sheets with sample data
    const ss = getSpreadsheet();
    
    // Delete existing sheets if they exist
    ['Employees', 'Tasks', 'Progress'].forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        ss.deleteSheet(sheet);
      }
    });
    
    // Create new sheets with sample data
    getSheet(CONFIG.SHEETS.EMPLOYEES);
    getSheet(CONFIG.SHEETS.TASKS);
    getSheet(CONFIG.SHEETS.PROGRESS);
    
    return { success: true, message: 'Sample data initialized successfully' };
    
  } catch (error) {
    console.error('Error initializing sample data:', error);
    throw new Error('Failed to initialize sample data');
  }
}
```

**File size check**: The complete file should be approximately 800-900 lines long.

### 4. Save and Deploy
- Click "Save" (Ctrl+S)
- Click "Deploy" → "New deployment"
- Choose "Web app" as the type
- Configuration:
  - **Execute as**: Me
  - **Who has access**: Anyone
  - **Description**: KPI Dashboard Backend v2
- Click "Deploy"

### 5. Copy the New URL
- Copy the "Web app URL" from the deployment result
- It should look like: `https://script.google.com/macros/s/[SCRIPT_ID]/exec`

### 6. Update Frontend Configuration
- Open `frontend/config.js`
- Replace the SCRIPT_URL with your new URL:
```javascript
SCRIPT_URL: 'YOUR_NEW_SCRIPT_URL_HERE'
```

### 7. Initialize Sample Data (Optional)
After deployment, you can run the `initializeSampleData()` function to populate the Google Sheets with test data:
- In Google Apps Script editor, select `initializeSampleData` from the function dropdown
- Click "Run"
- Authorize the script when prompted

## What's Included in the New Backend

### Sample Data
The backend will automatically create sample data including:
- **Employees**: John Doe, Jane Smith, Yohanes Luhur (supervisor)
- **Tasks**: Quarterly reports, documentation updates, performance reviews
- **Progress**: Various completion states and notes

### API Endpoints
All required endpoints are implemented:
- `getEmployees` - Get all employees
- `getTasksBySupervisor` - Get tasks by supervisor ID
- `getKPIMetrics` - Get dashboard metrics
- `authenticateUser` - User authentication
- And many more...

### Configuration
- **Spreadsheet ID**: Automatically configured
- **Authentication**: Disabled for testing
- **CORS**: Enabled for local development
- **Sample Data**: Included for immediate testing

## Testing After Deployment

### 1. Test Basic Connectivity
- Open `test-backend.html` in your browser
- Click "Test Basic Connection"
- Should return success response

### 2. Test API Endpoints
- Test "Get Employees" - should return sample employees
- Test "Get Tasks by Supervisor" - should return sample tasks
- Test "Get KPI Metrics" - should return dashboard metrics

### 3. Test Dashboard
- Open the main dashboard
- Login with: yohanes.luhur@example.com
- Should see real data instead of mock data

## Troubleshooting

### Code Replacement Issues

#### Problem: "File doesn't start with the right comment"
**Solution**: 
1. Make sure you opened `backend/combined-backend.gs` (not any other .gs file)
2. Copy from the very first character (don't miss the `//` at the beginning)
3. In Google Apps Script, make sure the editor is completely empty before pasting

#### Problem: "Code seems incomplete or functions are missing"
**Solution**:
1. The file is large (800+ lines) - make sure you copied everything
2. Scroll to the bottom of `combined-backend.gs` and verify you copied until the very last `}`
3. In Google Apps Script, scroll down to verify the file ends with `initializeSampleData()` function

#### Problem: "Can't find the combined-backend.gs file"
**Solution**:
- The file is located at: `c:\DeveloperTools\KPI_Dashboard\backend\combined-backend.gs`
- Open it with any text editor (VS Code, Notepad++, even Notepad)
- If it doesn't exist, you may need to create it first

### Deployment Issues

### If you get "Authorization required" errors:
1. Run any function in Google Apps Script editor first
2. Authorize the script with necessary permissions
3. Redeploy the web app

### If you get CORS errors:
1. Make sure the deployment is set to "Anyone" access
2. Check that the script URL in config.js is correct
3. Try redeploying with a new version

### If no data appears:
1. Run `initializeSampleData()` function in Google Apps Script
2. Check Google Sheets for data in Employees, Tasks, and Progress tabs
3. Verify the Spreadsheet ID in the backend configuration

## Current Configuration

**Spreadsheet ID**: `1VTERW3H4DaMTDSgrQOBQTRZlx601EnDMzF4-S3TxloA`
**Current Script URL**: `https://script.google.com/macros/s/AKfycbxtNAdK6OfAlKk4ATAz7V-OwJIodOBLe3J1GSpryi_tzSwj6L7F9_ybTYTHWMpnxWNQbw/exec`

## Next Steps After Deployment
1. Update the SCRIPT_URL in frontend/config.js
2. Test all API endpoints
3. Remove mock data fallbacks from dashboard.js
4. Verify full dashboard functionality