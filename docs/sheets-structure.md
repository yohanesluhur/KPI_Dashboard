# Google Sheets Structure for KPI Dashboard

This document describes the Google Sheets structure required for the KPI Dashboard application.

## Overview

The application uses three main sheets to store data:
1. **Employees** - Employee information and roles
2. **Tasks** - Task assignments and details
3. **Progress** - Task progress tracking

## Sheet 1: Employees

### Purpose
Stores employee information, roles, and authentication data.

### Columns
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| ID | Text | Unique identifier (UUID) | `550e8400-e29b-41d4-a716-446655440000` |
| Name | Text | Employee full name | `John Doe` |
| Email | Text | Employee email address | `john.doe@company.com` |
| Role | Text | Employee role | `employee`, `supervisor`, or `admin` |
| CreatedAt | DateTime | When the record was created | `2025-01-15T10:30:00.000Z` |
| UpdatedAt | DateTime | When the record was last updated | `2025-01-15T10:30:00.000Z` |

### Sample Data
```
ID,Name,Email,Role,CreatedAt,UpdatedAt
550e8400-e29b-41d4-a716-446655440001,John Doe,saestu.saestu@gmail.com,employee,2025-01-15T10:30:00.000Z,2025-01-15T10:30:00.000Z
550e8400-e29b-41d4-a716-446655440002,Jane Smith,jane.smith@company.com,supervisor,2025-01-15T10:30:00.000Z,2025-01-15T10:30:00.000Z
550e8400-e29b-41d4-a716-446655440003,Bob Manager,bob.manager@company.com,admin,2025-01-15T10:30:00.000Z,2025-01-15T10:30:00.000Z
```

### Notes
- The first row contains column headers
- All employee emails must be unique
- Valid roles are: `employee`, `supervisor`, `admin`
- DateTime values should be in ISO 8601 format

## Sheet 2: Tasks

### Purpose
Stores task assignments, details, status, and progress information.

### Columns
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| ID | Text | Unique identifier (UUID) | `550e8400-e29b-41d4-a716-446655440010` |
| Description | Text | Task description | `Complete quarterly report` |
| EmployeeID | Text | ID of assigned employee | `550e8400-e29b-41d4-a716-446655440001` |
| DueDate | Date | Task due date | `2025-02-15` |
| Status | Text | Current status | `not_started`, `in_progress`, or `completed` |
| Progress | Number | Completion percentage (0-100) | `75` |
| SupervisorId | Text | ID of supervising employee | `550e8400-e29b-41d4-a716-446655440002` |
| CreatedBy | Text | ID of who created the task | `550e8400-e29b-41d4-a716-446655440002` |
| CreatedAt | DateTime | When the task was created | `2025-01-15T10:30:00.000Z` |
| UpdatedAt | DateTime | When the task was last updated | `2025-01-15T11:45:00.000Z` |
| LastUpdate | DateTime | When progress was last updated | `2025-01-15T11:45:00.000Z` |

### Sample Data
```
ID,Description,EmployeeID,DueDate,Status,Progress,SupervisorId,CreatedBy,CreatedAt,UpdatedAt,LastUpdate
550e8400-e29b-41d4-a716-446655440010,Complete quarterly report,550e8400-e29b-41d4-a716-446655440001,2025-02-15,in_progress,75,550e8400-e29b-41d4-a716-446655440002,550e8400-e29b-41d4-a716-446655440002,2025-01-15T10:30:00.000Z,2025-01-15T11:45:00.000Z,2025-01-15T11:45:00.000Z
550e8400-e29b-41d4-a716-446655440011,Update employee handbook,550e8400-e29b-41d4-a716-446655440001,2025-02-20,not_started,0,550e8400-e29b-41d4-a716-446655440002,550e8400-e29b-41d4-a716-446655440001,2025-01-15T10:30:00.000Z,2025-01-15T10:30:00.000Z,2025-01-15T10:30:00.000Z
```

### Notes
- EmployeeID must reference a valid employee from the Employees sheet
- SupervisorId must reference a valid employee with supervisor role
- CreatedBy must reference a valid employee (who actually created the task)
- Valid status values are: `not_started`, `in_progress`, `completed`
- Progress must be between 0 and 100
- Due dates should be in YYYY-MM-DD format

## Sheet 3: Progress

### Purpose
Tracks detailed progress updates and notes for tasks.

### Columns
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| ID | Text | Unique identifier (UUID) | `550e8400-e29b-41d4-a716-446655440020` |
| TaskID | Text | ID of the related task | `550e8400-e29b-41d4-a716-446655440010` |
| EmployeeID | Text | ID of employee making update | `550e8400-e29b-41d4-a716-446655440001` |
| Progress | Number | Progress percentage at time of update | `75` |
| Status | Text | Status at time of update | `in_progress` |
| Notes | Text | Progress notes/comments | `Completed research phase, starting analysis` |
| CreatedAt | DateTime | When the progress entry was created | `2025-01-15T11:45:00.000Z` |

### Sample Data
```
ID,TaskID,EmployeeID,Progress,Status,Notes,CreatedAt
550e8400-e29b-41d4-a716-446655440020,550e8400-e29b-41d4-a716-446655440010,550e8400-e29b-41d4-a716-446655440001,25,in_progress,Started research phase - gathering Q3 data and previous reports,2025-01-15T09:30:00.000Z
550e8400-e29b-41d4-a716-446655440021,550e8400-e29b-41d4-a716-446655440010,550e8400-e29b-41d4-a716-446655440001,50,in_progress,Research phase completed. Found trends in revenue and cost analysis. Starting data analysis section.,2025-01-15T10:30:00.000Z
550e8400-e29b-41d4-a716-446655440022,550e8400-e29b-41d4-a716-446655440010,550e8400-e29b-41d4-a716-446655440001,75,in_progress,Analysis completed. Charts and graphs ready. Writing executive summary and recommendations section.,2025-01-15T11:45:00.000Z
```

## Real Example: How Tasks and Progress Work Together

### In Your Current Google Sheets:

**Tasks Sheet** shows:
```
| Task ID | Description | Employee | Status | Progress |
|---------|-------------|----------|---------|----------|
| 04637394... | Complete quarterly report | John Doe | in-progress | 75% |
```

**Progress Sheet** shows the history:
```
| Progress ID | Task ID | Employee | Progress | Notes | Date |
|-------------|---------|----------|----------|-------|------|
| d9552482... | 04637394... | John Doe | 25% | Started research phase - gathering Q3 data | Day 1 |
| [next-id]... | 04637394... | John Doe | 50% | Research completed. Starting data analysis | Day 3 |
| [latest-id]... | 04637394... | John Doe | 75% | Analysis done. Writing executive summary | Day 5 |
```

### Key Differences:

1. **Tasks = Current State**: Shows where the work stands RIGHT NOW
2. **Progress = Timeline**: Shows HOW the work evolved over time

3. **Tasks = One Row per Assignment**: Each task gets exactly one row
4. **Progress = Multiple Rows per Task**: Each update creates a new row

5. **Tasks = Manager View**: "What needs to be done and by whom?"
6. **Progress = Worker View**: "What did I accomplish today?"

### Notes
- TaskID must reference a valid task from the Tasks sheet
- EmployeeID must reference a valid employee from the Employees sheet
- Progress entries create a historical timeline of task progress
- Notes field is optional but recommended for meaningful updates

## Setting Up Your Google Sheet

### Step 1: Create a New Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Create new spreadsheet"
3. Rename it to "KPI Dashboard Data"

### Step 2: Create the Sheets
1. Rename the default sheet to "Employees"
2. Add the employee column headers in row 1
3. Create a new sheet called "Tasks"
4. Add the task column headers in row 1
5. Create a new sheet called "Progress"
6. Add the progress column headers in row 1

### Step 3: Add Initial Test Data

To test the application functionality, you'll need to manually add some data to your sheets. Here's the minimum data needed:

#### Add Yourself to Employees Sheet
1. Go to the "Employees" sheet
2. In row 2, add your information:
   ```
   sup-001 | Your Name | yohanes.luhur@gmail.com | supervisor | 2025-09-19T07:00:00.000Z | 2025-09-19T07:00:00.000Z
   ```

#### Add Some Test Employees (Optional)
3. Add a few test employees in rows 3-4:
   ```
   emp-001 | John Doe | saestu.saestu@gmail.com | employee | 2025-09-19T07:00:00.000Z | 2025-09-19T07:00:00.000Z
   emp-002 | Jane Smith | jane.smith@example.com | employee | 2025-09-19T07:00:00.000Z | 2025-09-19T07:00:00.000Z
   ```

#### Add Some Test Tasks
4. Go to the "Tasks" sheet
5. Add a few tasks supervised by you (use your employee ID in the SupervisorId column):
   ```
   task-001 | Complete quarterly report | emp-001 | 2025-09-25 | in-progress | 75 | sup-001 | sup-001 | 2025-09-19T07:00:00.000Z | 2025-09-19T07:15:00.000Z | 2025-09-19T07:15:00.000Z
   task-002 | Update project documentation | emp-002 | 2025-09-30 | pending | 0 | sup-001 | emp-002 | 2025-09-19T07:00:00.000Z | 2025-09-19T07:00:00.000Z | 2025-09-19T07:00:00.000Z
   task-003 | Review team performance | emp-001 | 2025-10-01 | completed | 100 | sup-001 | sup-001 | 2025-09-19T07:00:00.000Z | 2025-09-19T07:20:00.000Z | 2025-09-19T07:20:00.000Z
   ```
   **Format:** ID | Description | EmployeeID | DueDate | Status | Progress | SupervisorId | CreatedBy | CreatedAt | UpdatedAt | LastUpdate

**Important Notes:**
- Replace "Your Name" with your actual name
- Make sure your email matches the one you sign in with (`yohanes.luhur@gmail.com`)
- Use `sup-001` as your user ID (this will be your supervisor ID)
- The `SupervisorId` field in tasks should be `sup-001` so they show up in supervisor dashboard
- The `CreatedBy` field can be different from `SupervisorId` (e.g., employee creates task but supervisor supervises it)
- Use proper date formats (ISO 8601 for timestamps, YYYY-MM-DD for due dates)

### Step 4: Get the Spreadsheet ID
1. Open your Google Sheet
2. Copy the ID from the URL (between `/d/` and `/edit`)
3. Example: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
4. The ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### Step 5: Set Permissions
1. Click "Share" in the top right
2. Set sharing to "Anyone with the link can edit" (for development)
3. For production, add specific Google Apps Script service account

## Data Validation Rules

### Email Validation
- Must be valid email format
- Must be unique across all employees

### Date Validation
- Due dates must be in YYYY-MM-DD format
- Created/Updated dates must be in ISO 8601 format

### Status Validation
- Task status: `not_started`, `in_progress`, `completed`
- Progress status: same as task status

### Progress Validation
- Must be number between 0 and 100
- Should generally increase over time for a task

### Foreign Key Validation
- EmployeeID in tasks must exist in Employees sheet
- SupervisorId in tasks must exist in Employees sheet
- CreatedBy in tasks must exist in Employees sheet
- TaskID in progress must exist in Tasks sheet

## Performance Considerations

### Indexing
- Google Sheets doesn't have traditional indexes
- Keep ID columns as the first column for faster lookups
- Limit the number of rows per sheet (recommended < 10,000)

### Query Optimization
- Use batch operations when possible
- Cache frequently accessed data
- Avoid repeated full-sheet scans

### Data Archiving
- Consider archiving completed tasks older than 1 year
- Create separate sheets for historical data
- Implement data retention policies

## Backup and Recovery

### Regular Backups
- Google Sheets has automatic version history
- Export data regularly as CSV/Excel
- Consider automated backup scripts

### Data Recovery
- Use Google Sheets version history for recent changes
- Implement application-level data validation
- Log important operations for audit trail