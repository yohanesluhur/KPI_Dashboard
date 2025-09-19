# KPI Dashboard - Deployment Guide

## Complete Setup and Deployment Instructions

This guide will walk you through deploying the KPI Dashboard application using Google Apps Script, Google Sheets, and Google OAuth.

## Prerequisites

Before starting, ensure you have:
- A Google account with access to Google Drive, Sheets, and Apps Script
- Basic understanding of JavaScript and web development
- A web server or hosting solution for the frontend files

## Part 1: Google Cloud Project Setup

### 1.1 Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" and then "New Project"
3. Enter a project name (e.g., "KPI Dashboard")
4. Click "Create"

### 1.2 Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Enable the following APIs:
   - Google Apps Script API
   - Google Sheets API
   - Google Drive API

### 1.3 Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "KPI Dashboard"
   - User support email: Your email
   - Developer contact information: Your email
4. Add authorized domains where your app will be hosted
5. Add scopes:
   - `openid`
   - `email`
   - `profile`
6. Save and continue through all steps

### 1.4 Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add your domain to "Authorized JavaScript origins"
5. Copy the Client ID for later use

## Part 2: Google Sheets Setup

### 2.1 Create the Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Rename it to "KPI Dashboard Data"
4. Copy the Spreadsheet ID from the URL

### 2.2 Create Required Sheets

Create three sheets with the following names and headers:

#### Sheet 1: "Employees"
| Column A | Column B | Column C | Column D | Column E | Column F | Column G |
|----------|----------|----------|----------|----------|----------|----------|
| id       | email    | name     | role     | department | createdAt | lastLogin |

#### Sheet 2: "Tasks"
| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I | Column J |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| id       | title    | description | assignedTo | status | priority | dueDate | createdBy | createdAt | updatedAt |

#### Sheet 3: "Progress"
| Column A | Column B | Column C | Column D | Column E | Column F |
|----------|----------|----------|----------|----------|----------|
| id       | taskId   | employeeId | progress | comment | updatedAt |

### 2.3 Set Permissions

1. Click "Share" in the top right
2. Add your Google Apps Script service account (you'll get this later)
3. Give it "Editor" permissions

## Part 3: Google Apps Script Deployment

### 3.1 Create Apps Script Project

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Rename the project to "KPI Dashboard Backend"

### 3.2 Add the Backend Code

1. Delete the default `Code.gs` content
2. Copy and paste each backend file from the `backend/` folder:
   - `Code.gs` (main file)
   - `Auth.gs`
   - `Employees.gs`
   - `Tasks.gs`
   - `Progress.gs`
   - `Dashboard.gs`

### 3.3 Configure Script Properties

1. Go to "Project Settings" (gear icon)
2. Click "Script Properties"
3. Add the following properties:

| Property | Value |
|----------|-------|
| SPREADSHEET_ID | Your Google Sheets ID |
| CLIENT_ID | Your OAuth Client ID |
| ADMIN_EMAILS | Comma-separated list of admin emails |

### 3.4 Deploy as Web App

1. Click "Deploy" > "New deployment"
2. Choose "Web app" as the type
3. Set the following options:
   - Execute as: "Me"
   - Who has access: "Anyone"
4. Click "Deploy"
5. Copy the web app URL

### 3.5 Test the Backend

1. Open the web app URL in a browser
2. You should see a JSON response indicating the API is running
3. Test endpoints by appending `?action=getEmployees` to the URL

## Part 4: Frontend Configuration

### 4.1 Update Configuration

1. Open `frontend/config.js`
2. Update the following values:
   ```javascript
   GOOGLE_CLIENT_ID: 'your-client-id.googleusercontent.com',
   SCRIPT_URL: 'https://script.google.com/macros/s/your-script-id/exec',
   SPREADSHEET_ID: 'your-spreadsheet-id'
   ```

### 4.2 Update HTML References

1. Open `frontend/index.html`
2. Ensure the Google API script tag uses your Client ID:
   ```html
   <script src="https://apis.google.com/js/platform.js?onload=init"></script>
   ```

## Part 5: Web Hosting Setup

### 5.1 Choose a Hosting Option

**Option A: GitHub Pages (Free)**
1. Create a GitHub repository
2. Upload all frontend files
3. Enable GitHub Pages in repository settings

**Option B: Netlify (Free)**
1. Create a Netlify account
2. Drag and drop the frontend folder
3. Deploy the site

**Option C: Google Cloud Storage (Paid)**
1. Create a storage bucket
2. Upload files and configure for web hosting
3. Set up a custom domain

**Option D: Traditional Web Hosting**
1. Upload files via FTP/SFTP
2. Ensure HTTPS is enabled

### 5.2 Configure CORS (If Needed)

If you encounter CORS issues, add the following to your Apps Script:

```javascript
function doOptions() {
  return HtmlService.createHtmlOutput()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

## Part 6: Initial Setup and Testing

### 6.1 Create Admin User

1. Open your deployed application
2. Sign in with Google
3. Manually add your email to the Employees sheet with role "admin"

### 6.2 Test Core Functionality

1. **Authentication**: Sign in and out
2. **Admin Panel**: Create employees and tasks
3. **Employee View**: Update task progress
4. **Dashboard**: View KPIs and metrics

### 6.3 Add Sample Data

Use the admin panel to create:
- 3-5 test employees
- 10-15 sample tasks
- Some progress updates

## Part 7: Security Configuration

### 7.1 Apps Script Security

1. In Apps Script, go to "Project Settings"
2. Ensure "Enable Chrome V8 runtime" is checked
3. Set execution timeout to maximum
4. Enable "Show "appsscript.json" manifest file"

### 7.2 OAuth Security

1. In Google Cloud Console, regularly review OAuth consent screen
2. Monitor API usage in the console
3. Set up alerts for unusual activity

### 7.3 Sheet Protection

1. In Google Sheets, protect ranges that shouldn't be edited
2. Set up revision history monitoring
3. Create backup copies regularly

## Part 8: Monitoring and Maintenance

### 8.1 Set Up Logging

1. In Apps Script, use `console.log()` for debugging
2. View logs in "Executions" tab
3. Set up error notifications

### 8.2 Performance Monitoring

1. Monitor API response times
2. Check Google Sheets quota usage
3. Optimize batch operations if needed

### 8.3 Regular Maintenance

- **Weekly**: Review error logs
- **Monthly**: Update dependencies and check quotas
- **Quarterly**: Review security settings and access

## Part 9: Troubleshooting

### Common Issues and Solutions

#### Authentication Issues
- **Problem**: "Invalid client" error
- **Solution**: Verify OAuth client ID in config.js

#### API Errors
- **Problem**: 403 Forbidden errors
- **Solution**: Check Apps Script permissions and deployment settings

#### CORS Issues
- **Problem**: Cross-origin request blocked
- **Solution**: Ensure proper CORS headers in Apps Script

#### Sheet Access Issues
- **Problem**: "Cannot read property" errors
- **Solution**: Verify spreadsheet ID and sheet names

### Debug Mode

Enable debug mode by setting `DEBUG: true` in config.js to:
- See detailed console logs
- Get error stack traces
- Monitor API calls

## Part 10: Advanced Configuration

### 10.1 Custom Domains

For custom domains, update OAuth settings:
1. Add domain to authorized origins
2. Update consent screen authorized domains
3. Configure DNS settings

### 10.2 Backup Strategy

Implement automated backups:
1. Create Apps Script trigger for daily exports
2. Store backups in Google Drive
3. Set up restoration procedures

### 10.3 Scaling Considerations

For larger deployments:
- Use multiple sheets for data partitioning
- Implement caching strategies
- Consider Google Cloud SQL for large datasets

## Support and Resources

### Documentation Links
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Google Sign-In for Websites](https://developers.google.com/identity/sign-in/web)

### Getting Help
- Check the browser console for error messages
- Review Apps Script execution logs
- Verify all configuration values are correct

### Contact Information
For technical support, please check:
1. Error logs in Apps Script
2. Browser developer console
3. Google Cloud Console API logs

---

## Quick Start Checklist

- [ ] Create Google Cloud Project
- [ ] Enable required APIs
- [ ] Configure OAuth consent screen
- [ ] Create OAuth credentials
- [ ] Create Google Sheets with proper structure
- [ ] Deploy Google Apps Script
- [ ] Configure script properties
- [ ] Update frontend configuration
- [ ] Deploy frontend to web hosting
- [ ] Test authentication flow
- [ ] Create admin user
- [ ] Add sample data
- [ ] Verify all functionality

**Estimated Setup Time**: 2-3 hours for first-time deployment

**Production Ready**: Follow all security and monitoring steps above