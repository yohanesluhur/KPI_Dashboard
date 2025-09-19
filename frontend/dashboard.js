// dashboard.js - Supervisor Dashboard Module

/**
 * Supervisor Dashboard Management
 */
class SupervisorDashboard {
    constructor() {
        this.tasks = [];
        this.employees = [];
        this.kpiData = {};
        this.currentFilter = '';
        this.refreshInterval = null;
        
        this.initializeEventListeners();
    }
    
    /**
     * Initialize event listeners for dashboard
     */
    initializeEventListeners() {
        // Employee filter
        const employeeFilter = document.getElementById('employeeFilter');
        if (employeeFilter) {
            employeeFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterTasks();
            });
        }
        
        // Refresh button (if added to HTML)
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }
    }
    
    /**
     * Load supervisor dashboard data
     */
    async loadDashboardData() {
        try {
            const currentUser = getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            showLoading(true);
            console.log('Loading dashboard data for user:', currentUser);
            
            // Show data source indicator
            this.showDataSourceIndicator('loading');
            
            // Initialize with empty arrays to prevent filter errors
            this.tasks = [];
            this.employees = [];
            this.kpiData = {};
            
            // Test backend connectivity first
            const connectivityTest = await this.testBackendConnectivity();
            
            if (connectivityTest.success) {
                console.log('Backend is responsive, loading real data...');
                await this.loadRealData(currentUser);
            } else {
                console.error('Backend connectivity test failed:', connectivityTest.error);
                throw new Error('Backend not accessible: ' + connectivityTest.error);
            }
            
            // Update UI
            this.renderTasks();
            this.renderEmployeeFilter();
            this.renderKPICards();
            this.filterTasks();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showError('Failed to load dashboard data: ' + error.message);
            throw error; // Don't fallback to mock data
            
        } finally {
            showLoading(false);
        }
    }
    
    /**
     * Render tasks table
     */
    renderTasks() {
        this.updateTasksTable();
    }
    
    /**
     * Render employee filter dropdown
     */
    renderEmployeeFilter() {
        this.updateEmployeeFilter();
    }
    
    /**
     * Render KPI cards
     */
    renderKPICards() {
        this.updateKPISummary();
    }
    
    /**
     * Test backend connectivity
     */
    async testBackendConnectivity() {
        try {
            console.log('Testing backend connectivity...');
            const response = await Promise.race([
                api.call('test'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            if (response && response.success) {
                return { success: true };
            } else {
                return { success: false, error: response.error || 'Invalid response' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load real data from backend
     */
    async loadRealData(currentUser) {
        // For supervisor dashboard, we need to get the user's employee ID first
        let supervisorId = currentUser.employeeId;
        
        // If we don't have employeeId, try to get it from the backend
        if (!supervisorId) {
            try {
                const userRoleResult = await api.call('getUserRole', { email: currentUser.email });
                if (userRoleResult && userRoleResult.success && userRoleResult.data) {
                    supervisorId = userRoleResult.data.userId;
                    currentUser.employeeId = supervisorId; // Cache it
                }
            } catch (error) {
                console.warn('Could not get user employee ID:', error);
                supervisorId = 'supervisor1'; // Fallback for testing
            }
        }
        
        console.log('Loading data for supervisor ID:', supervisorId);
        
        // Load data in parallel
        const [tasksResult, employeesResult] = await Promise.all([
            api.Task.getBySupervisor(supervisorId).catch(e => {
                console.error('Failed to load tasks by supervisor:', e);
                return { success: false, error: e.message };
            }),
            api.Employee.getAll().catch(e => {
                console.error('Failed to load employees:', e);
                return { success: false, error: e.message };
            })
        ]);
        
        let dataLoadSuccess = false;
        
        // Handle tasks result with validation - handle both wrapped and raw array formats
        if (tasksResult && tasksResult.success && Array.isArray(tasksResult.data)) {
            // Standard API format: {success: true, data: [...]}
            this.tasks = tasksResult.data;
            console.log('Loaded real tasks (standard format):', this.tasks.length);
            if (this.tasks.length === 0) {
                console.info('No tasks found for supervisor. You may need to add some tasks through the admin panel or manually in the Google Sheet.');
            }
            dataLoadSuccess = true;
        } else if (Array.isArray(tasksResult)) {
            // Raw array format: [...]
            this.tasks = tasksResult;
            console.log('Loaded real tasks (raw array format):', this.tasks.length);
            if (this.tasks.length === 0) {
                console.info('No tasks found for supervisor. You may need to add some tasks through the admin panel or manually in the Google Sheet.');
            }
            dataLoadSuccess = true;
        } else {
            console.warn('Tasks API call failed:', tasksResult);
            // Try to load all tasks if supervisor-specific fails
            try {
                const allTasksResult = await api.Task.getAll();
                if (allTasksResult && allTasksResult.success && Array.isArray(allTasksResult.data)) {
                    this.tasks = allTasksResult.data;
                    console.log('Loaded all tasks as fallback:', this.tasks.length);
                    dataLoadSuccess = true;
                } else if (Array.isArray(allTasksResult)) {
                    this.tasks = allTasksResult;
                    console.log('Loaded all tasks as fallback (raw format):', this.tasks.length);
                    dataLoadSuccess = true;
                } else {
                    this.tasks = [];
                }
            } catch (error) {
                console.error('Failed to load all tasks:', error);
                this.tasks = [];
            }
        }
        
        // Handle employees result with validation - handle both wrapped and raw array formats
        if (employeesResult && employeesResult.success && Array.isArray(employeesResult.data)) {
            // Standard API format: {success: true, data: [...]}
            this.employees = employeesResult.data;
            console.log('Loaded real employees (standard format):', this.employees.length);
            dataLoadSuccess = true;
        } else if (Array.isArray(employeesResult)) {
            // Raw array format: [...]
            this.employees = employeesResult;
            console.log('Loaded real employees (raw array format):', this.employees.length);
            dataLoadSuccess = true;
        } else {
            console.warn('Employees API call failed:', employeesResult);
            this.employees = [];
        }
        
        // Generate KPI data from loaded tasks
        this.kpiData = this.calculateKPIData();
        
        // Show appropriate data source indicator
        if (dataLoadSuccess) {
            this.showDataSourceIndicator('real');
        } else {
            this.showDataSourceIndicator('error');
            throw new Error('Failed to load any real data from backend');
        }
    }
    
    /**
     * Calculate KPI data from loaded tasks and employees
     */
    calculateKPIData() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const inProgress = this.tasks.filter(t => t.status === 'in_progress' || t.status === 'in-progress').length;
        const pending = this.tasks.filter(t => t.status === 'pending' || t.status === 'not_started' || t.status === 'not-started').length;
        const overdue = this.tasks.filter(t => this.isTaskOverdue(t)).length;
        
        return {
            taskStatistics: {
                total: total,
                completed: completed,
                inProgress: inProgress,
                pending: pending,
                overdue: overdue,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
            },
            employeeStatistics: {
                total: this.employees.length,
                active: this.employees.length
            },
            performanceMetrics: {
                averageProgress: this.calculateAverageProgress(),
                onTimeDelivery: this.calculateOnTimeDelivery(),
                productivity: this.calculateProductivity()
            }
        };
    }
    
    /**
     * Calculate average progress across all tasks
     */
    calculateAverageProgress() {
        if (this.tasks.length === 0) return 0;
        const totalProgress = this.tasks.reduce((sum, task) => sum + (task.progress || 0), 0);
        return Math.round(totalProgress / this.tasks.length);
    }
    
    /**
     * Calculate on-time delivery percentage
     */
    calculateOnTimeDelivery() {
        const completedTasks = this.tasks.filter(t => t.status === 'completed');
        if (completedTasks.length === 0) return 0;
        
        const onTimeTasks = completedTasks.filter(task => {
            if (!task.dueDate || !task.updatedAt) return true; // Assume on-time if no dates
            return new Date(task.updatedAt) <= new Date(task.dueDate);
        });
        
        return Math.round((onTimeTasks.length / completedTasks.length) * 100);
    }
    
    /**
     * Calculate productivity score
     */
    calculateProductivity() {
        if (this.tasks.length === 0) return 0;
        
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const inProgress = this.tasks.filter(t => t.status === 'in_progress' || t.status === 'in-progress').length;
        const overdue = this.tasks.filter(t => this.isTaskOverdue(t)).length;
        
        // Simple productivity calculation: (completed * 100 + inProgress * 50 - overdue * 25) / total
        const score = (completed * 100 + inProgress * 50 - overdue * 25) / this.tasks.length;
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    /**
     * Load mock data for testing
     */
    loadMockData() {
        console.log('Loading mock data for testing...');
        this.tasks = this.getMockTasks();
        this.employees = this.getMockEmployees();
        this.kpiData = this.getMockKPIData();
    }
    
    /**
     * Show data source indicator
     */
    showDataSourceIndicator(type) {
        // Remove existing indicator
        const existingIndicator = document.querySelector('.data-source-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = `data-source-indicator data-source-${type}`;
        
        let content = '';
        switch (type) {
            case 'loading':
                content = '<i class="icon-loading"></i> Loading data...';
                break;
            case 'real':
                content = '<i class="icon-check" style="color: green;"></i> Connected to backend database';
                break;
            case 'mock':
                content = '<i class="icon-warning" style="color: orange;"></i> Using mock data - backend not available';
                break;
            case 'error':
                content = '<i class="icon-error" style="color: red;"></i> Error loading data - using fallback';
                break;
        }
        
        indicator.innerHTML = content;
        
        // Add to top of dashboard
        const dashboard = document.querySelector('.dashboard-container') || document.querySelector('main');
        if (dashboard) {
            dashboard.insertBefore(indicator, dashboard.firstChild);
        }
    }
    
    /**
     * Get mock KPI data
     */
    getMockKPIData() {
        return {
            taskStatistics: {
                total: this.tasks.length,
                completed: this.tasks.filter(t => t.status === 'completed').length,
                inProgress: this.tasks.filter(t => t.status === 'in-progress').length,
                pending: this.tasks.filter(t => t.status === 'pending').length,
                overdue: this.tasks.filter(t => t.status === 'overdue').length,
                completionRate: 75
            },
            employeeStatistics: {
                total: this.employees.length,
                active: this.employees.length
            },
            performanceMetrics: {
                averageProgress: 68,
                onTimeDelivery: 85,
                productivity: 78
            }
        };
    }
    
    /**
     * Update KPI summary cards
     */
    updateKPISummary() {
        const stats = this.kpiData.taskStatistics || {};
        
        // Update DOM elements
        this.updateElement('totalTasks', stats.total || 0);
        this.updateElement('completedTasks', stats.completed || 0);
        this.updateElement('inProgressTasks', stats.inProgress || 0);
        this.updateElement('overdueTasks', stats.overdue || 0);
        
        // Update completion rate if element exists
        const completionRateElement = document.getElementById('completionRate');
        if (completionRateElement) {
            completionRateElement.textContent = `${stats.completionRate || 0}%`;
        }
        
        // Update performance metrics if elements exist
        const performanceMetrics = this.kpiData.performanceMetrics || {};
        this.updateElement('averageProgress', `${performanceMetrics.averageProgress || 0}%`);
        this.updateElement('onTimeDelivery', `${performanceMetrics.onTimeDelivery || 0}%`);
        this.updateElement('productivity', `${performanceMetrics.productivity || 0}%`);
    }
    
    /**
     * Update employee filter dropdown
     */
    updateEmployeeFilter() {
        const select = document.getElementById('employeeFilter');
        if (!select) return;
        
        // Clear existing options (except "All Employees")
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // Add employee options
        this.employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name;
            select.appendChild(option);
        });
    }
    
    /**
     * Update tasks table
     */
    updateTasksTable() {
        const tableBody = document.getElementById('supervisorTasksTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            if (this.tasks.length === 0) {
                cell.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <h3>No Tasks Found</h3>
                        <p>You don't have any tasks assigned yet.</p>
                        <p><strong>To get started:</strong></p>
                        <ul style="text-align: left; display: inline-block; margin: 1rem 0;">
                            <li>Go to the Admin Panel to create tasks</li>
                            <li>Or manually add tasks to your Google Sheet</li>
                            <li>Make sure the 'CreatedBy' field matches your user ID</li>
                        </ul>
                        <p><small>Your user ID: <code>${getCurrentUser()?.employeeId || 'unknown'}</code></small></p>
                    </div>
                `;
            } else {
                cell.textContent = 'No tasks match the current filter';
                cell.style.textAlign = 'center';
                cell.style.padding = '2rem';
                cell.style.color = '#666';
            }
            return;
        }
        
        filteredTasks.forEach(task => {
            const row = this.createTaskRow(task);
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Create a table row for a task
     */
    createTaskRow(task) {
        const row = document.createElement('tr');
        
        const employee = this.employees.find(emp => emp.id === task.employeeId);
        const employeeName = employee ? employee.name : 'Unknown';
        
        row.innerHTML = `
            <td>${employeeName}</td>
            <td>
                <div class="task-description">${this.truncateText(task.description, 50)}</div>
            </td>
            <td>${this.formatDate(task.dueDate)}</td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${task.progress || 0}%"></div>
                    </div>
                    <span class="progress-text">${task.progress || 0}%</span>
                </div>
            </td>
            <td>
                <span class="status-badge status-${task.status}">
                    ${this.formatStatus(task.status)}
                </span>
            </td>
            <td>
                <div class="task-actions">
                    <button class="btn btn-sm btn-secondary" onclick="supervisorDashboard.viewTaskDetails('${task.id}')">
                        View
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="supervisorDashboard.editTask('${task.id}')">
                        Edit
                    </button>
                </div>
            </td>
        `;
        
        // Add class for overdue tasks
        if (this.isTaskOverdue(task)) {
            row.classList.add('task-overdue');
        }
        
        return row;
    }
    
    /**
     * Filter tasks based on current filter
     */
    filterTasks() {
        this.updateTasksTable();
    }
    
    /**
     * Get filtered tasks based on current filter
     */
    getFilteredTasks() {
        if (!this.currentFilter) {
            return this.tasks;
        }
        
        return this.tasks.filter(task => task.employeeId === this.currentFilter);
    }
    
    /**
     * View task details
     */
    async viewTaskDetails(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            showError('Task not found');
            return;
        }
        
        try {
            // Get progress history
            const progressResult = await api.Progress.getByTask(taskId);
            const progressHistory = progressResult.success ? progressResult.data : [];
            
            // Show task details modal
            this.showTaskDetailsModal(task, progressHistory);
            
        } catch (error) {
            console.error('Error loading task details:', error);
            showError('Failed to load task details');
        }
    }
    
    /**
     * Show task details modal
     */
    showTaskDetailsModal(task, progressHistory) {
        const employee = this.employees.find(emp => emp.id === task.employeeId);
        
        const modalHTML = `
            <div class="task-detail-modal">
                <div class="task-detail-header">
                    <h3>Task Details</h3>
                    <p><strong>Employee:</strong> ${employee ? employee.name : 'Unknown'}</p>
                    <p><strong>Due Date:</strong> ${this.formatDate(task.dueDate)}</p>
                    <p><strong>Status:</strong> 
                        <span class="status-badge status-${task.status}">
                            ${this.formatStatus(task.status)}
                        </span>
                    </p>
                </div>
                
                <div class="task-detail-body">
                    <div class="task-description">
                        <h4>Description</h4>
                        <p>${task.description}</p>
                    </div>
                    
                    <div class="task-progress">
                        <h4>Progress: ${task.progress || 0}%</h4>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${task.progress || 0}%"></div>
                        </div>
                    </div>
                    
                    <div class="progress-history">
                        <h4>Progress History</h4>
                        ${this.renderProgressHistory(progressHistory)}
                    </div>
                </div>
            </div>
        `;
        
        showModal('Task Details', modalHTML);
    }
    
    /**
     * Render progress history
     */
    renderProgressHistory(progressHistory) {
        if (!progressHistory || progressHistory.length === 0) {
            return '<p>No progress updates yet.</p>';
        }
        
        return progressHistory.map(entry => `
            <div class="progress-entry">
                <div class="progress-entry-header">
                    <strong>${entry.progress}%</strong>
                    <span class="progress-date">${this.formatDateTime(entry.updatedAt)}</span>
                </div>
                ${entry.notes ? `<p class="progress-notes">${entry.notes}</p>` : ''}
            </div>
        `).join('');
    }
    
    /**
     * Edit task
     */
    editTask(taskId) {
        // Navigate to admin panel with task pre-selected
        showScreen('adminPanel');
        
        // Wait for admin panel to load, then select the task
        setTimeout(() => {
            if (window.adminPanel) {
                window.adminPanel.editTask(taskId);
            }
        }, 500);
    }
    
    /**
     * Utility Functions
     */
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    formatDateTime(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    formatStatus(status) {
        const statusMap = {
            'not_started': 'Not Started',
            'in_progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }
    
    isTaskOverdue(task) {
        if (!task.dueDate || task.status === 'completed') return false;
        return new Date(task.dueDate) < new Date();
    }
    
    /**
     * Start auto-refresh
     */
    startAutoRefresh(intervalMinutes = 5) {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, intervalMinutes * 60 * 1000);
    }
    
    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    /**
     * Export data to CSV
     */
    exportToCSV() {
        const csvData = this.tasks.map(task => {
            const employee = this.employees.find(emp => emp.id === task.employeeId);
            return {
                Employee: employee ? employee.name : 'Unknown',
                Task: task.description,
                'Due Date': this.formatDate(task.dueDate),
                Progress: `${task.progress || 0}%`,
                Status: this.formatStatus(task.status)
            };
        });
        
        this.downloadCSV(csvData, 'supervisor_dashboard_tasks.csv');
    }
    
    downloadCSV(data, filename) {
        if (data.length === 0) {
            showError('No data to export');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => 
                `"${String(row[header]).replace(/"/g, '""')}"`
            ).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    /**
     * Get mock tasks data for testing when backend is not available
     */
    getMockTasks() {
        return [
            {
                id: '1',
                title: 'Complete Project Proposal',
                description: 'Draft and submit the quarterly project proposal',
                employeeId: 'emp1',
                employeeName: 'John Doe',
                status: 'in_progress',
                priority: 'high',
                dueDate: '2025-09-25',
                progress: 75,
                createdAt: '2025-09-15'
            },
            {
                id: '2',
                title: 'Review Team Performance',
                description: 'Conduct monthly performance reviews for team members',
                employeeId: 'emp2',
                employeeName: 'Jane Smith',
                status: 'completed',
                priority: 'medium',
                dueDate: '2025-09-20',
                progress: 100,
                createdAt: '2025-09-10'
            },
            {
                id: '3',
                title: 'Update Documentation',
                description: 'Update technical documentation for new features',
                employeeId: 'emp3',
                employeeName: 'Mike Johnson',
                status: 'pending',
                priority: 'low',
                dueDate: '2025-10-01',
                progress: 0,
                createdAt: '2025-09-18'
            },
            {
                id: '4',
                title: 'Client Meeting Preparation',
                description: 'Prepare presentation for upcoming client meeting',
                employeeId: 'emp1',
                employeeName: 'John Doe',
                status: 'overdue',
                priority: 'high',
                dueDate: '2025-09-17',
                progress: 45,
                createdAt: '2025-09-12'
            }
        ];
    }
    
    /**
     * Get mock employees data for testing when backend is not available
     */
    getMockEmployees() {
        return [
            {
                id: 'emp1',
                name: 'John Doe',
                email: 'john.doe@company.com',
                role: 'employee',
                department: 'Development'
            },
            {
                id: 'emp2',
                name: 'Jane Smith',
                email: 'jane.smith@company.com',
                role: 'employee',
                department: 'Design'
            },
            {
                id: 'emp3',
                name: 'Mike Johnson',
                email: 'mike.johnson@company.com',
                role: 'employee',
                department: 'QA'
            }
        ];
    }
}

// Initialize supervisor dashboard
let supervisorDashboard = null;

/**
 * Initialize supervisor dashboard when screen is shown
 */
function initSupervisorDashboard() {
    if (!supervisorDashboard) {
        supervisorDashboard = new SupervisorDashboard();
    }
    supervisorDashboard.loadDashboardData();
    supervisorDashboard.startAutoRefresh();
}

/**
 * Cleanup supervisor dashboard
 */
function cleanupSupervisorDashboard() {
    if (supervisorDashboard) {
        supervisorDashboard.stopAutoRefresh();
    }
}

// Export for global access
window.supervisorDashboard = supervisorDashboard;
window.initSupervisorDashboard = initSupervisorDashboard;
window.cleanupSupervisorDashboard = cleanupSupervisorDashboard;