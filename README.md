# KPI Dashboard

A comprehensive, browser-based KPI dashboard application built with vanilla JavaScript, HTML, CSS, and Google Apps Script. Features role-based access control, real-time task management, and interactive dashboards for supervisors and employees.

## 🚀 Features

- **Multi-Role Access**: Supervisor dashboards, admin panels, and employee task management
- **Real-Time Updates**: Live KPI tracking and task progress monitoring
- **Google Integration**: OAuth authentication, Google Sheets storage, Apps Script backend
- **Responsive Design**: Mobile-friendly interface with modern UI components
- **No Dependencies**: Pure vanilla JavaScript with no external frameworks
- **Secure**: Role-based permissions with Google OAuth authentication

## 📋 Overview

### For Supervisors
- Real-time KPI dashboard with task completion metrics
- Team performance tracking and progress monitoring
- Exportable reports and data visualization
- Task assignment and deadline management

### For Administrators
- Employee management (add, edit, remove)
- Task creation and assignment
- System configuration and user role management
- Comprehensive admin controls

### For Employees
- Personal task dashboard with progress tracking
- Task status updates and progress reporting
- Deadline monitoring and priority management
- Intuitive task completion workflow

## 🏗️ Architecture

### Frontend Stack
- **HTML5**: Semantic structure with accessibility features
- **CSS3**: Modern responsive design with animations
- **Vanilla JavaScript**: Modular ES6+ code with no dependencies
- **Google APIs**: OAuth authentication and platform integration

### Backend Stack
- **Google Apps Script**: Serverless backend with REST API
- **Google Sheets**: Database storage with three-sheet structure
- **Google OAuth**: Secure authentication and authorization
- **JWT Tokens**: Session management and API security

### File Structure
```
KPI_Dashboard/
├── frontend/
│   ├── index.html          # Main application interface
│   ├── styles.css          # Complete responsive styling
│   ├── config.js           # Configuration management
│   ├── auth.js             # Google OAuth authentication
│   ├── api.js              # Backend communication layer
│   ├── dashboard.js        # Supervisor dashboard functionality
│   ├── admin.js            # Admin panel management
│   ├── employee.js         # Employee task interface
│   └── app.js              # Main application controller
├── backend/
│   ├── Code.gs             # Main Apps Script entry point
│   ├── Auth.gs             # Authentication handlers
│   ├── Employees.gs        # Employee CRUD operations
│   ├── Tasks.gs            # Task management endpoints
│   ├── Progress.gs         # Progress tracking handlers
│   └── Dashboard.gs        # KPI and dashboard data
├── docs/
│   ├── sheets-structure.md # Database schema documentation
│   └── api-reference.md    # API endpoint documentation
├── DEPLOYMENT.md           # Complete setup instructions
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Google account with access to Drive, Sheets, and Apps Script
- Web hosting solution (GitHub Pages, Netlify, etc.)
- Basic knowledge of JavaScript and web development

### 1. Clone or Download
```bash
git clone <repository-url>
cd KPI_Dashboard
```

### 2. Follow Deployment Guide
See [DEPLOYMENT.md](DEPLOYMENT.md) for complete step-by-step setup instructions.

### 3. Key Configuration Steps
1. Create Google Cloud Project and enable APIs
2. Set up OAuth consent screen and credentials
3. Create Google Sheets with proper structure
4. Deploy Google Apps Script backend
5. Configure frontend with your credentials
6. Deploy to web hosting platform

## 📊 Database Schema

### Employees Sheet
| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique employee identifier |
| email | String | Google account email |
| name | String | Employee display name |
| role | String | admin, supervisor, employee |
| department | String | Department assignment |
| createdAt | Date | Account creation timestamp |
| lastLogin | Date | Last authentication time |

### Tasks Sheet
| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique task identifier |
| title | String | Task title/summary |
| description | String | Detailed task description |
| assignedTo | String | Employee email |
| status | String | pending, in-progress, completed |
| priority | String | low, medium, high |
| dueDate | Date | Task deadline |
| createdBy | String | Creator email |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last modification time |

### Progress Sheet
| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique progress entry ID |
| taskId | String | Reference to task |
| employeeId | String | Employee email |
| progress | Number | Completion percentage (0-100) |
| comment | String | Progress notes |
| updatedAt | Date | Update timestamp |

## 🔧 API Reference

### Authentication Endpoints
- `POST /auth/login` - Google OAuth login
- `POST /auth/verify` - Token verification
- `POST /auth/logout` - Session termination

### Employee Management
- `GET /employees` - List all employees
- `POST /employees` - Create new employee
- `PUT /employees/{id}` - Update employee
- `DELETE /employees/{id}` - Remove employee

### Task Management
- `GET /tasks` - List tasks (filtered by role)
- `POST /tasks` - Create new task
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Remove task

### Progress Tracking
- `GET /progress/{taskId}` - Get task progress
- `POST /progress` - Update task progress
- `GET /progress/employee/{email}` - Employee progress

### Dashboard Data
- `GET /dashboard/supervisor` - Supervisor KPIs
- `GET /dashboard/employee` - Employee metrics
- `GET /dashboard/kpis` - Overall KPI data

## 🎨 UI Components

### Dashboard Components
- **KPI Cards**: Real-time metric displays
- **Progress Charts**: Visual progress tracking
- **Task Tables**: Sortable, filterable task lists
- **Modal Systems**: Forms and detailed views

### Interactive Features
- **Auto-refresh**: Configurable update intervals
- **Notifications**: Success/error message system
- **Export Functions**: Data download capabilities
- **Responsive Design**: Mobile and desktop optimized

## 🔒 Security Features

### Authentication
- Google OAuth 2.0 integration
- JWT token-based sessions
- Role-based access control
- Automatic session expiry

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection measures
- CSRF token validation

### Privacy
- Minimal data collection
- Google security compliance
- Audit trail logging
- Secure token storage

## 🌐 Browser Support

- **Chrome**: 60+ (recommended)
- **Firefox**: 55+
- **Safari**: 11+
- **Edge**: 79+
- **Mobile**: iOS Safari 11+, Chrome Mobile 60+

## 📱 Mobile Features

- Responsive grid layouts
- Touch-friendly interactions
- Mobile-optimized forms
- Swipe gestures support
- Offline capability planning

## 🔧 Development

### Local Development
1. Clone the repository
2. Set up a local web server
3. Configure development environment
4. Update config.js with development settings

### Testing
- Manual testing checklist included
- Browser compatibility testing
- Mobile device testing
- API endpoint validation

### Code Style
- ES6+ JavaScript standards
- Semantic HTML structure
- BEM CSS methodology
- Comprehensive commenting

## 📈 Performance

### Optimization Features
- Lazy loading for large datasets
- Efficient API batching
- Client-side caching
- Debounced user inputs

### Monitoring
- API response time tracking
- Error rate monitoring
- User engagement metrics
- Performance bottleneck identification

## 🤝 Contributing

1. Follow the existing code style
2. Test all changes thoroughly
3. Update documentation as needed
4. Ensure mobile compatibility

## 📄 License

This project is provided as-is for educational and business use. Please review and comply with Google's terms of service for Apps Script and API usage.

## 📞 Support

### Troubleshooting
1. Check browser console for errors
2. Verify Google Apps Script logs
3. Review configuration settings
4. Consult deployment guide

### Resources
- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Technology Stack**: Vanilla JavaScript, HTML5, CSS3, Google Apps Script  
**Deployment**: Google Cloud Platform, Google Workspace

## Getting Started

See the documentation in the `docs/` folder for detailed setup instructions.